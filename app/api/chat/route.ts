import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { message, projectId, mtoLines: passedMto, laborRates: passedLabor, projectInfo: passedProj } = await request.json();

    // Check for API key
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        response: "Warning: GEMINI_API_KEY is not configured. " +
                  "I am running in mock mode. " +
                  `You said: "${message}"`
      });
    }

    const cookieStore = await cookies();
    const userRole = cookieStore.get('user_role')?.value;
    const userId = cookieStore.get('user_id')?.value;

    let mtoLines = passedMto || [];
    let laborRates = passedLabor || [];
    let projectInfo = passedProj || null;
    let customerProjectsList = null;

    if (userRole === 'customer') {
      if (projectId) {
        // Enforce ownership
        const { data: checkProj } = await supabase.from("projects").select("*").eq("id", projectId).eq("customer_id", userId).maybeSingle();
        if (!checkProj) {
          return NextResponse.json({ response: "Access denied: You do not have permission to view this project." });
        }
      } else {
        // Provide a list of their projects if no specific project is selected
        const { data: projects } = await supabase.from("projects").select("id, project_name, rfp_number, status").eq("customer_id", userId);
        if (projects) {
          customerProjectsList = projects;
        }
      }
    }

    if (projectId) {
      const { data: mtoData } = await supabase.from("project_mto").select("*").eq("project_id", projectId);
      const { data: laborData } = await supabase.from("labor_rates").select("*").eq("project_id", projectId);
      const { data: projData } = await supabase.from("projects").select("*").eq("id", projectId).maybeSingle();
      
      if (mtoData) mtoLines = mtoData;
      if (laborData && userRole !== 'customer') laborRates = laborData; // Hide internal labor rates from customers
      if (projData) projectInfo = {
        projectName: projData.project_name,
        rfpNumber: projData.rfp_number,
        bidDueDate: projData.bid_due_date,
        vendorPriceList: projData.vendor_price_list,
        dateNeededBy: projData.date_needed_by
      };
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    let systemPrompt = `You are an expert Automation and Electrical Estimation Assistant. 
Analyze the project context provided below and answer the user's question. Use clear, helpful language and show calculations if requested.

Project Context:
Project Name: ${projectInfo?.projectName || 'Unnamed'}
RFP Number: ${projectInfo?.rfpNumber || 'N/A'}
Bid Due Date: ${projectInfo?.bidDueDate || 'N/A'}
Vendor Price List: ${projectInfo?.vendorPriceList || 'N/A'}
Date Needed By: ${projectInfo?.dateNeededBy || 'N/A'}

Labor Rates:
${JSON.stringify(laborRates || [], null, 2)}

Material Takeoff (MTO) Lines:
${JSON.stringify(mtoLines || [], null, 2)}

User Question:
${message}`;

    if (userRole === 'guest') {
      systemPrompt = `You are an AI assistant for ENETK. You are currently speaking with a Guest user.
You may only answer questions about the SCADA app (enetkscada.com) and general questions about ENETK.
CRITICAL INSTRUCTION: You MUST NOT answer any questions or reveal any information regarding our jobs, hours, project materials, labor rates, or financial information. If the user asks about these topics, politely decline to answer.

User Question:
${message}`;
    } else if (userRole === 'customer') {
      systemPrompt = `You are an AI assistant for ENETK. You are speaking with a Customer.
They have access to their own projects. Do not discuss any projects other than theirs.
If they are asking about their projects, refer to the list of 'Your Projects' below, or the specific 'Project Context' provided.
DO NOT reveal internal labor rates, markup percentages, or internal financial data.
If they ask about an unrecognized project, politely inform them it isn't in their account.

Project Context (if specific project is selected):
Project Name: ${projectInfo?.projectName || 'Unnamed'}
RFP Number: ${projectInfo?.rfpNumber || 'N/A'}

${customerProjectsList ? `Your Projects:
${JSON.stringify(customerProjectsList, null, 2)}` : ''}

Material Takeoff (MTO) Lines:
${JSON.stringify(mtoLines || [], null, 2)}

User Question:
${message}`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          text: systemPrompt
        }
      ]
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
