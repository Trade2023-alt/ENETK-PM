import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Check for API key
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        message: "GEMINI_API_KEY is not configured.",
        mockTakeoff: [
          { itemCode: "C-1234", description: "3/4\" EMT Conduit", qty: 120 },
          { itemCode: "W-8899", description: "#12 THHN Copper Wire", qty: 450 }
        ]
      });
    }

    // Convert file to array buffer for Gemini API
    const buffer = await file.arrayBuffer();
    const mimeType = file.type;
    
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const base64Data = Buffer.from(buffer).toString("base64");
    
    const aiResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType
          }
        },
        "Analyze this electrical drawing and count the electrical parts or symbols. " +
        "Return a JSON array of takeoff lines. Each takeoff line must be a JSON object with: " +
        "itemCode (e.g. C-101, W-202, etc.), description (name of parts/wires), and qty (number count). " +
        "Return ONLY the raw JSON list of these objects."
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = aiResponse.text || "[]";
    const parsedTakeoff = JSON.parse(text.trim());
    
    return NextResponse.json({
      status: "success",
      mockTakeoff: parsedTakeoff
    });
  } catch (error) {
    console.error("Gemini OCR Error:", error);
    return NextResponse.json(
      { error: "Failed to process blueprint" },
      { status: 500 }
    );
  }
}
