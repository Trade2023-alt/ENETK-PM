import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const parserUrl = process.env.MPP_PARSER_URL || "http://localhost:5000/convert";

    // Reconstruct FormData to send to the python service
    const serviceFormData = new FormData();
    serviceFormData.append("file", file);

    const serviceResponse = await fetch(parserUrl, {
      method: "POST",
      body: serviceFormData,
    });

    if (!serviceResponse.ok) {
      const errorText = await serviceResponse.text();
      throw new Error(errorText || "MPP parser service failed.");
    }

    const data = await serviceResponse.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("MPP Parser Proxy Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process MPP file. Ensure the Docker container is running." },
      { status: 500 }
    );
  }
}
