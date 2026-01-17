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
    },
    {
        name: "get_attendance",
        description: "List attendance logs for all users or search by date.",
        input_schema: {
            type: "object",
            properties: {
                query: { type: "string", description: "Date or username search" }
            }
        }
    },
    {
        name: "debug_db_schema",
        description: "Fetch a list of tables and columns to debug database issues.",
        input_schema: { type: "object", properties: {} }
    },
    {
        name: "get_team",
        description: "List all team members (users), their roles, and company affiliations.",
        input_schema: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "get_subtasks",
        description: "List subtasks for a specific job.",
        input_schema: {
            type: "object",
            properties: {
                job_id: { type: "string", description: "The ID of the parent job" }
            },
            required: ["job_id"]
        }
    },
    {
        name: "get_quotes",
        description: "Fetch all quotes or search by customer name.",
        input_schema: {
            type: "object",
            properties: {
                query: { type: "string", description: "Search by quote title or customer name" }
            }
        }
    },
    {
        name: "get_contacts",
        description: "List contacts for a specific customer.",
        input_schema: {
            type: "object",
            properties: {
                customer_id: { type: "string", description: "The ID of the customer" }
            },
            required: ["customer_id"]
        }
    },
    {
        name: "bulk_create_tasks",
        description: "Create multiple sub-tasks at once across one or more jobs.",
        input_schema: {
            type: "object",
            properties: {
                tasks: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            job_id: { type: "string" },
                            title: { type: "string" },
                            priority: { type: "string", enum: ["Low", "Normal", "High", "Urgent"] },
                            due_date: { type: "string", description: "YYYY-MM-DD" },
                            assigned_user_ids: { type: "array", items: { type: "string" } }
                        },
                        required: ["job_id", "title"]
                    }
                }
            },
            required: ["tasks"]
        }
    },
    {
        name: "create_customer",
        description: "Add a new customer to the database.",
        input_schema: {
            type: "object",
            properties: {
                name: { type: "string" },
                email: { type: "string" },
                phone: { type: "string" },
                address: { type: "string" }
            },
            required: ["name"]
        }
    },
    {
        name: "create_job",
        description: "Create a new project/job for a customer.",
        input_schema: {
            type: "object",
            properties: {
                title: { type: "string" },
                customer_id: { type: "string", description: "The ID of the customer record" },
                description: { type: "string" },
                priority: { type: "string", enum: ["Low", "Normal", "High", "Critical"] },
                scheduled_date: { type: "string", description: "YYYY-MM-DD" }
            },
            required: ["title", "customer_id"]
        }
    },
    {
        name: "create_inventory_item",
        description: "Add a new material/part to the inventory.",
        input_schema: {
            type: "object",
            properties: {
                description: { type: "string" },
                mfg: { type: "string", description: "Manufacturer" },
                pn: { type: "string", description: "Part Number" },
                qty: { type: "number" },
                location: { type: "string" }
            },
            required: ["description", "qty"]
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
            case "get_attendance": {
                let query = supabase.from('attendance').select('*, user:users(username)');
                if (input.user_id) {
                    query = query.eq('user_id', input.user_id);
                }
                const { data, error } = await query.order('check_in', { ascending: false }).limit(input.limit || 50);
                if (error) throw error;
                return data;
            }
            case "get_team": {
                const { data, error } = await supabase.from('users').select('id, username, role, company, email, phone');
                if (error) throw error;
                return data;
            }
            case "get_subtasks": {
                const { data, error } = await supabase
                    .from('sub_tasks')
                    .select('*')
                    .eq('job_id', input.job_id);
                if (error) throw error;
                return data;
            }
            case "get_quotes": {
                let query = supabase.from('quotes').select('*, customers(name)');
                if (input.query) {
                    query = query.or(`title.ilike.%${input.query}%,customers.name.ilike.%${input.query}%`);
                }
                const { data, error } = await query.limit(20);
                if (error) throw error;
                return data;
            }
            case "get_contacts": {
                const { data, error } = await supabase
                    .from('customer_contacts')
                    .select('*')
                    .eq('customer_id', input.customer_id);
                if (error) throw error;
                return data;
            }
            case "bulk_create_tasks": {
                // Reuse the new bulk action logic
                const { bulkCreateSubTasks } = await import('./subtasks');
                return await bulkCreateSubTasks(input.tasks);
            }
            case "create_customer": {
                const { data, error } = await supabase
                    .from('customers')
                    .insert(input)
                    .select()
                    .single();
                if (error) throw error;
                return { success: true, customer: data };
            }
            case "create_job": {
                const { data, error } = await supabase
                    .from('jobs')
                    .insert({
                        ...input,
                        status: 'Scheduled',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .select()
                    .single();
                if (error) throw error;
                return { success: true, job: data };
            }
            case "create_inventory_item": {
                const { data, error } = await supabase
                    .from('material_inventory')
                    .insert({
                        ...input,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .select()
                    .single();
                if (error) throw error;
                return { success: true, item: data };
            }
            case "debug_db_schema": {
                // Return some known info about tables for debugging
                return {
                    chat_conversations: ["id", "user_id", "title", "created_at", "updated_at"],
                    chat_messages: ["id", "conversation_id", "role", "content", "created_at"],
                    users: ["id", "username", "role", "company"]
                };
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

        const safeUserId = userId ? (isNaN(userId) ? userId : Number(userId)) : null;

        await supabase.from('ai_usage').insert({
            user_id: safeUserId,
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

        let internalConvId = conversationId;

        // If no conversation ID, auto-create one for the user so it's not lost
        if (!internalConvId && userId && currentMessages[currentMessages.length - 1].role === 'user') {
            const safeUserId = userId ? (isNaN(userId) ? userId : Number(userId)) : null;
            const { data: newConv } = await supabase.from('chat_conversations')
                .insert({ user_id: safeUserId, title: currentMessages[currentMessages.length - 1].content.substring(0, 30) + '...' })
                .select().single();
            if (newConv) internalConvId = newConv.id;
        }

        // If conversationId is provided or auto-created, save the last user message
        if (internalConvId && currentMessages[currentMessages.length - 1].role === 'user') {
            await supabase.from('chat_messages').insert({
                conversation_id: internalConvId,
                role: 'user',
                content: currentMessages[currentMessages.length - 1].content
            }).catch(() => { });
        }

        const systemPrompt = `You are the ENETK Project Management AI Agent. You have FULL ACCESS to the company database including: inventory, jobs, sub-tasks, customers, contacts, quotes, attendance logs, and team members. 
You can analyze data, update statuses, and provide business insights. 
ALWAYS use tools to check real data before answering questions about records.
When the user asks to CREATE a new customer, job, or inventory item:
1. Check if you have all required fields (e.g., name for customers, title/customer_id for jobs, description/qty for inventory).
2. If any required information is missing, ASK the user to provide it before calling the creation tool.
Current User ID: ${userId}`;

        // MODEL UPDATE: 2026 Recommended Version (Sonnet 4.5)
        let response = await anthropic.messages.create({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 1024,
            system: systemPrompt,
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
                model: "claude-sonnet-4-5-20250929",
                max_tokens: 1024,
                system: systemPrompt.split('Current User ID:')[0], // Reuse prompt without User ID suffix
                tools: tools,
                messages: [
                    ...currentMessages,
                    { role: "assistant", content: response.content },
                    { role: "user", content: toolResults }
                ]
            });

            await logAiUsage(userId, finalResponse);

            const assistantOutput = finalResponse.content[0].text;
            if (internalConvId) {
                await supabase.from('chat_messages').insert({
                    conversation_id: internalConvId,
                    role: 'assistant',
                    content: assistantOutput
                }).catch(() => { });
            }

            return {
                role: 'assistant',
                content: assistantOutput,
                cost: usageCost.toFixed(5),
                conversationId: internalConvId
            };
        }

        const assistantOutput = response.content[0].text;
        if (internalConvId) {
            await supabase.from('chat_messages').insert({
                conversation_id: internalConvId,
                role: 'assistant',
                content: assistantOutput
            }).catch(() => { });
        }

        return {
            role: 'assistant',
            content: assistantOutput,
            cost: usageCost.toFixed(5),
            conversationId: internalConvId
        };
    } catch (error) {
        console.error('Claude API Error:', error);
        return { error: 'Failed to get response from Claude: ' + error.message };
    }
}

export async function createConversation(title) {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    console.log('Creating conversation for user:', userId, 'title:', title);

    const safeUserId = userId ? (isNaN(userId) ? userId : Number(userId)) : null;
    const { data, error } = await supabase.from('chat_conversations')
        .insert({ user_id: safeUserId, title: title || 'New Chat' })
        .select()
        .single();

    if (error) {
        console.error('createConversation error:', error);
        return { error: error.message };
    }
    console.log('Conversation created:', data?.id);
    return data;
}

export async function getConversations() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    if (!userId) return [];

    const safeUserId = userId ? (isNaN(userId) ? userId : Number(userId)) : null;
    const { data, error } = await supabase.from('chat_conversations')
        .select('*')
        .eq('user_id', safeUserId)
        .order('created_at', { ascending: false });
    if (error) {
        console.error('getConversations error:', error);
        return [];
    }
    return data || [];
}

export async function getAllConversations() {
    try {
        // Try with join first
        const { data, error } = await supabase.from('chat_conversations')
            .select(`
            *,
            user:users(username)
        `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('getAllConversations join error, trying fallback:', error);
            // Fallback: fetch without join
            const { data: fallbackData, error: fallbackError } = await supabase.from('chat_conversations')
                .select('*')
                .order('created_at', { ascending: false });

            if (fallbackError) throw fallbackError;

            // Optional: try to decorate with usernames if table exists
            return fallbackData || [];
        }

        return data || [];
    } catch (error) {
        console.error('Critical getAllConversations error:', error);
        return [];
    }
}

export async function getChatHistory(conversationId) {
    const { data, error } = await supabase.from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
    if (error) return [];
    return data || [];
}
