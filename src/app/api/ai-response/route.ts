import { NextRequest, NextResponse } from "next/server";
import { fetchWithRetry } from "@/lib/fetchWithRetry";

const AI_RESPONSE_API =
  "https://yw4sjjn8di.execute-api.us-west-2.amazonaws.com/dev/aiResponse";
const API_KEY = "4rcj8yUbt21u1DmkzznpTa7F2yynAYRt1wAvlYM9";
const DEFAULT_LLM_ID = "anthropic.claude-3-7-sonnet-20250219-v1:0";

// Allow up to 300s for LLM calls on large documents (Vercel Pro)
// Falls back to plan maximum (60s Hobby, 300s Pro)
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filename, prompt, identifier, llm_id, test } = body;

    if (!filename || !prompt || identifier === undefined) {
      return NextResponse.json(
        { error: "filename, prompt, and identifier are required" },
        { status: 400 }
      );
    }

    const payload = {
      filename,
      prompt,
      llm_id: llm_id || DEFAULT_LLM_ID,
      test: test ?? false,
      identifier: Number(identifier),
    };
    console.log("[ai-response] Request payload:", JSON.stringify({ filename: payload.filename, identifier: payload.identifier, llm_id: payload.llm_id, test: payload.test }));

    const resp = await fetchWithRetry(
      AI_RESPONSE_API,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify(payload),
      },
      { maxRetries: 1, baseDelayMs: 3000 } // 1 retry only — avoid compounding long LLM calls
    );

    const data = await resp.json();
    console.log("[ai-response] Response status:", resp.status, "keys:", Object.keys(data));
    if (data.error) console.log("[ai-response] Error:", data.error);
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "AI Response API call failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
