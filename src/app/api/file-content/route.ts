import { NextRequest, NextResponse } from "next/server";
import { fetchWithRetry } from "@/lib/fetchWithRetry";

const FILE_CONTENT_API =
  "https://qbrofp25nmeyjhc2dwg5a3r57e0vdadz.lambda-url.us-west-2.on.aws/";
const API_KEY = "PGsElPXPCorZP2wCSuDwYDWYgy5N8QKJ92ca5n9WTroWBqmh";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, fileType, fileName } = body;

    const params = new URLSearchParams({
      domain: String(identifier),
      fileType,
      fileName,
    });

    const resp = await fetchWithRetry(
      `${FILE_CONTENT_API}?${params.toString()}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify({ identifier, fileType, fileName }),
      },
      { maxRetries: 3, baseDelayMs: 2000, timeoutMs: 15000 }
    );

    const data = await resp.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "File content API call failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
