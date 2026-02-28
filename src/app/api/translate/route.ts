import { NextRequest, NextResponse } from "next/server";
import { fetchWithRetry } from "@/lib/fetchWithRetry";

const TRANSLATE_API =
  "https://yw4sjjn8di.execute-api.us-west-2.amazonaws.com/dev/translate";
const API_KEY = "4rcj8yUbt21u1DmkzznpTa7F2yynAYRt1wAvlYM9";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, filename, toLanguage } = body;

    if (!identifier || !filename || !toLanguage) {
      return NextResponse.json(
        { error: "identifier, filename, and toLanguage are required" },
        { status: 400 }
      );
    }

    const resp = await fetchWithRetry(
      TRANSLATE_API,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify({
          identifier: Number(identifier),
          filename,
          toLanguage,
        }),
      },
      { maxRetries: 3, baseDelayMs: 2000, timeoutMs: 30000 }
    );

    // The API returns raw HTML text, not JSON
    const translatedHtml = await resp.text();
    return NextResponse.json({ content: translatedHtml });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Translation API call failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
