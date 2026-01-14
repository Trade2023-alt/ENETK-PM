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
