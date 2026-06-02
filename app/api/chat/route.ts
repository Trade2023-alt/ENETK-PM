import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    // Check for API key
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        response: "Warning: GEMINI_API_KEY is not configured in the environment variables. " +
                  "I am running in boilerplate mock mode. " +
                  `You said: "${message}"`
      });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // Simple prompt augmentation for the "Estimation Assistant"
    const systemPrompt = `You are a professional Estimation Assistant for an electrical contractor. 
    You help analyze Material Takeoffs (MTO), labor rates, and project schedules. 
    User Query: ${message}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: systemPrompt,
    });

    return NextResponse.json({ response: response.text });
  } catch (error) {
    console.error("Gemini Chat API Error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
