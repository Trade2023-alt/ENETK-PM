'use server'

import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

// Claude 3.5 Sonnet Pricing
const PRICE_INPUT = 3 / 1000000;
const PRICE_OUTPUT = 15 / 1000000;

const tools = [
    {
        name: "get_inventory",
        description: "Search or list materials in the inventory. Returns matches for description, mfg, or part number.",
        input_schema: {
            type: "object",
            properties: {
                query: { type: "string", description: "Search term for description, mfg, or pn (e.g. 'Hoffman')" }
            }
        }
    },
    {
        name: "get_jobs",
        description: "List all jobs or search for specific jobs by title.",
        input_schema: {
            type: "object",
            properties: {
                query: { type: "string", description: "Search term for job title" }
            }
        }
    },
    {
        name: "update_job",
        description: "Update an existing job's status, priority, or description.",
        input_schema: {
            type: "object",
            properties: {
                job_id: { type: "string", description: "The ID of the job to update" },
                status: { type: "string", enum: ["Scheduled", "In Progress", "On Hold", "Completed", "Cancelled"] },
                priority: { type: "string", enum: ["Low", "Normal", "High", "Critical"] },
                description: { type: "string" }
            },
            required: ["job_id"]
        }
    },
    {
        name: "get_customers",
        description: "List all customers or search for specific ones by name.",
        input_schema: {
            type: "object",
            properties: {
                query: { type: "string", description: "Search term for customer name" }
            }
        }
    },
    {
        name: "update_customer",
        description: "Update an existing customer's contact info (email, phone, address).",
        input_schema: {
            type: "object",
            properties: {
                customer_id: { type: "string", description: "The ID of the customer to update" },
                email: { type: "string" },
                phone: { type: "string" },
                address: { type: "string" }
            },
            required: ["customer_id"]
        }
    },
    {
        name: "update_inventory_item",
        description: "Update an existing inventory item's quantity, location, or status.",
        input_schema: {
            type: "object",
            properties: {
                item_id: { type: "string", description: "The ID of the inventory item to update" },
                qty: { type: "number" },
                location: { type: "string" },
                description: { type: "string" },
                check_out_date: { type: "string", description: "YYYY-MM-DD" }
            },
            required: ["item_id"]
        }
    },
    {
        name: "get_prospects",
        description: "Search the sales pipeline for potential customers (prospects).",
        input_schema: {
            type: "object",
            properties: {
                query: { type: "string", description: "Search term for company name, industry, or state" }
            }
        }
    }
];

async function handleToolCall(toolName, input) {
    try {
        switch (toolName) {
            case "get_inventory": {
                let query = supabase.from('material_inventory').select('*');
                if (input.query) {
                    query = query.or(`description.ilike.%${input.query}%,mfg.ilike.%${input.query}%,pn.ilike.%${input.query}%`);
                }
                const { data, error } = await query.limit(20);
                if (error) throw error;
                return data;
            }
            case "get_jobs": {
                let query = supabase.from('jobs').select('*, customers(name)');
                if (input.query) {
                    query = query.ilike('title', `%${input.query}%`);
                }
                const { data, error } = await query.limit(20);
                if (error) throw error;
                return data;
            }
            case "update_job": {
                const { job_id, ...updateData } = input;
                updateData.updated_at = new Date().toISOString();
                const { data, error } = await supabase
                    .from('jobs')
                    .update(updateData)
                    .eq('id', job_id)
                    .select();
                if (error) throw error;
                return { success: true, updated_job: data[0] };
            }
            case "get_customers": {
                let query = supabase.from('customers').select('*');
                if (input.query) {
                    query = query.ilike('name', `%${input.query}%`);
                }
                const { data, error } = await query.limit(20);
                if (error) throw error;
                return data;
            }
            case "update_customer": {
                const { customer_id, ...updateData } = input;
                const { data, error } = await supabase
                    .from('customers')
                    .update(updateData)
                    .eq('id', customer_id)
                    .select();
                if (error) throw error;
                return { success: true, updated_customer: data[0] };
            }
            case "update_inventory_item": {
                const { item_id, ...updateData } = input;
                updateData.updated_at = new Date().toISOString();
                const { data, error } = await supabase
                    .from('material_inventory')
                    .update(updateData)
                    .eq('id', item_id)
                    .select();
                if (error) throw error;
                return { success: true, updated_item: data[0] };
            }
            case "get_prospects": {
                let query = supabase.from('prospects').select('*');
                if (input.query) {
                    query = query.or(`name.ilike.%${input.query}%,description.ilike.%${input.query}%,state.ilike.%${input.query}%`);
                }
                const { data, error } = await query.limit(20);
                if (error) throw error;
                return data;
            }
            default:
                return { error: "Unknown tool" };
        }
    } catch (error) {
        console.error(`Tool Error (${toolName}):`, error);
        return { error: error.message };
    }
}

async function logAiUsage(userId, response) {
    try {
        const inputTokens = response.usage.input_tokens;
        const outputTokens = response.usage.output_tokens;
        const cost = (inputTokens * PRICE_INPUT) + (outputTokens * PRICE_OUTPUT);

        await supabase.from('ai_usage').insert({
            user_id: userId,
            model: response.model,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            cost_usd: cost
        });
        return cost;
    } catch (e) {
        console.warn('AI Usage logging failed (table might be missing):', e.message);
        return 0;
    }
}

export async function chatWithAI(messages, conversationId = null) {
    if (!process.env.ANTHROPIC_API_KEY) {
        return { error: 'Anthropic API key not configured.' };
    }

    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;

    try {
        let currentMessages = messages.map(m => ({
            role: m.role,
            content: m.content
        }));

        // If conversationId is provided, save the last user message
        if (conversationId && currentMessages[currentMessages.length - 1].role === 'user') {
            await supabase.from('chat_messages').insert({
                conversation_id: conversationId,
                role: 'user',
                content: currentMessages[currentMessages.length - 1].content
            }).catch(() => { });
        }

        let response = await anthropic.messages.create({
            model: "claude-3-5-sonnet-latest",
            max_tokens: 1024,
            system: "You are the ENETK Project Management AI Agent. You help users manage inventory, jobs, and customers. ALWAYS use tools to check real data. Keep track of costs and let users know if you are being too expensive if they ask. Current User ID: " + userId,
            tools: tools,
            messages: currentMessages
        });

        const usageCost = await logAiUsage(userId, response);

        if (response.stop_reason === "tool_use") {
            const toolResults = [];
            for (const contentBlock of response.content) {
                if (contentBlock.type === "tool_use") {
                    const result = await handleToolCall(contentBlock.name, contentBlock.input);
                    toolResults.push({
                        type: "tool_result",
                        tool_use_id: contentBlock.id,
                        content: JSON.stringify(result)
                    });
                }
            }

            const finalResponse = await anthropic.messages.create({
                model: "claude-3-5-sonnet-latest",
                max_tokens: 1024,
                system: "You are the ENETK Project Management AI Agent. You help users manage inventory, jobs, and customers. ALWAYS use tools to check real data.",
                tools: tools,
                messages: [
                    ...currentMessages,
                    { role: "assistant", content: response.content },
                    { role: "user", content: toolResults }
                ]
            });

            await logAiUsage(userId, finalResponse);

            const assistantOutput = finalResponse.content[0].text;
            if (conversationId) {
                await supabase.from('chat_messages').insert({
                    conversation_id: conversationId,
                    role: 'assistant',
                    content: assistantOutput
                }).catch(() => { });
            }

            return {
                role: 'assistant',
                content: assistantOutput,
                cost: usageCost.toFixed(5)
            };
        }

        const assistantOutput = response.content[0].text;
        if (conversationId) {
            await supabase.from('chat_messages').insert({
                conversation_id: conversationId,
                role: 'assistant',
                content: assistantOutput
            }).catch(() => { });
        }

        return {
            role: 'assistant',
            content: assistantOutput,
            cost: usageCost.toFixed(5)
        };
    } catch (error) {
        console.error('Claude API Error:', error);
        return { error: 'Failed to get response from Claude: ' + error.message };
    }
}

export async function createConversation(title) {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    const { data, error } = await supabase.from('chat_conversations')
        .insert({ user_id: userId, title: title || 'New Chat' })
        .select()
        .single();
    if (error) return { error: error.message };
    return data;
}

export async function getConversations() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    const { data, error } = await supabase.from('chat_conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
    if (error) return [];
    return data || [];
}

export async function getChatHistory(conversationId) {
    const { data, error } = await supabase.from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
    if (error) return [];
    return data || [];
}
