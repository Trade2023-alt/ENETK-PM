'use server'

import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabase';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

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
            default:
                return { error: "Unknown tool" };
        }
    } catch (error) {
        console.error(`Tool Error (${toolName}):`, error);
        return { error: error.message };
    }
}

export async function chatWithAI(messages) {
    if (!process.env.ANTHROPIC_API_KEY) {
        return { error: 'Anthropic API key not configured.' };
    }

    try {
        let currentMessages = messages.map(m => ({
            role: m.role,
            content: m.content
        }));

        let response = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 1024,
            system: "You are the ENETK Project Management AI Agent. You help the user manage their contractor business. You HAVE TOOLS to search inventory, jobs, and customers, and can also update jobs and customers. Always use these tools to provide accurate, real-time data when asked. If you update something, confirm it with the user.",
            tools: tools,
            messages: currentMessages
        });

        // Loop to handle potential multiple tool calls or iterative reasoning
        // For simplicity in a server action, we handle one round of tool use if present
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

            // Send back the results to Claude
            const finalResponse = await anthropic.messages.create({
                model: "claude-3-5-sonnet-20241022",
                max_tokens: 1024,
                system: "You are the ENETK Project Management AI Agent. You help the user manage their contractor business. You HAVE TOOLS to search inventory, jobs, and customers, and can also update jobs and customers. Always use these tools to provide accurate, real-time data when asked. If you update something, confirm it with the user.",
                tools: tools,
                messages: [
                    ...currentMessages,
                    { role: "assistant", content: response.content },
                    { role: "user", content: toolResults }
                ]
            });

            return {
                role: 'assistant',
                content: finalResponse.content[0].text
            };
        }

        return {
            role: 'assistant',
            content: response.content[0].text
        };
    } catch (error) {
        console.error('Claude API Error:', error);
        return { error: 'Failed to get response from Claude: ' + error.message };
    }
}
