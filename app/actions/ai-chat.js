'use server'

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function chatWithAI(messages) {
    if (!process.env.ANTHROPIC_API_KEY) {
        return { error: 'Anthropic API key not configured.' };
    }

    try {
        const response = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1024,
            system: "You are the ENETK Project Management AI Agent. You help the user manage their contractor business, specifically focusing on job scheduling, inventory management, and customer relations. The software uses a Maroon and Gray theme to match the ENETK logo. Be professional, helpful, and concise.",
            messages: messages.map(m => ({
                role: m.role,
                content: m.content
            }))
        });

        return {
            role: 'assistant',
            content: response.content[0].text
        };
    } catch (error) {
        console.error('Claude API Error:', error);
        return { error: 'Failed to get response from Claude: ' + error.message };
    }
}
