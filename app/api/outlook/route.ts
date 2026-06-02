import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { projectName, bidDueDate, assignedEmail } = await request.json();

    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;

    if (!tenantId || !clientId || !clientSecret) {
      return NextResponse.json({
        message: "Azure AD credentials missing. Configure AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET.",
        mockSuccess: true
      });
    }

    // 1. Authenticate with Microsoft Graph using Client Credentials Flow
    /*
    const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        scope: "https://graph.microsoft.com/.default",
        client_secret: clientSecret,
        grant_type: "client_credentials"
      })
    });
    const { access_token } = await tokenResponse.json();
    */

    // 2. Create Calendar Event using MS Graph API
    /*
    const event = {
      subject: `BID DUE: ${projectName}`,
      start: { dateTime: `${bidDueDate}T08:00:00`, timeZone: "Pacific Standard Time" },
      end: { dateTime: `${bidDueDate}T17:00:00`, timeZone: "Pacific Standard Time" },
      body: { contentType: "HTML", content: `Please finalize all MTO and pricing for ${projectName}.` }
    };

    await fetch(`https://graph.microsoft.com/v1.0/users/${assignedEmail}/events`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(event)
    });
    */

    return NextResponse.json({
      status: "success",
      message: `Calendar event boilerplate triggered for ${projectName} on ${bidDueDate}`
    });
  } catch (error) {
    console.error("Outlook Graph API Error:", error);
    return NextResponse.json({ error: "Failed to create Outlook event" }, { status: 500 });
  }
}
