import { NextRequest, NextResponse } from "next/server";
import { fetchWithRetry } from "@/lib/fetchWithRetry";

const SCRAPE_API =
  "https://uj7g3udyerh3nduhtbj76wp7f40bcrie.lambda-url.us-west-2.on.aws/";

// Allow up to 120s for scraping large pages
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const resp = await fetchWithRetry(
      SCRAPE_API,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      { maxRetries: 3, baseDelayMs: 3000 } // no timeout — long-running API
    );

    const data = await resp.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Scraping API call failed";
    return NextResponse.json(
      { error: message },
      { status: 502 }
    );
  }
}
