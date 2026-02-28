import { NextRequest, NextResponse } from "next/server";
import { fetchWithRetry } from "@/lib/fetchWithRetry";

const VALIDATION_API =
  "https://yw4sjjn8di.execute-api.us-west-2.amazonaws.com/dev/getRobotsTxtContent";
const API_KEY = "4rcj8yUbt21u1DmkzznpTa7F2yynAYRt1wAvlYM9";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json(
      { success: false, error: "url parameter is required" },
      { status: 400 }
    );
  }

  try {
    const apiUrl = new URL(VALIDATION_API);
    apiUrl.searchParams.set("url", url);

    const resp = await fetchWithRetry(
      apiUrl.toString(),
      {
        method: "GET",
        headers: {
          "x-api-key": API_KEY,
        },
      },
      { maxRetries: 3, baseDelayMs: 2000, timeoutMs: 15000 }
    );

    const data = await resp.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Validation API call failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 502 }
    );
  }
}
