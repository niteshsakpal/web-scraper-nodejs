import { NextResponse } from "next/server";
import { getNextJobId, setLastIdentifier } from "@/lib/serverStore";

/**
 * GET /api/identifier — fetch a unique identifier for a new job.
 *
 * When the IDENTIFIER_API_URL env var is set, calls the external API.
 * Otherwise falls back to the in-memory counter.
 */

// Set these env vars in Vercel
const IDENTIFIER_API_URL = process.env.IDENTIFIER_API_URL || "";
const IDENTIFIER_API_KEY = process.env.IDENTIFIER_API_KEY || "";

export async function GET() {
  let identifier: string;

  // If an external identifier API URL is configured, call it
  if (IDENTIFIER_API_URL) {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (IDENTIFIER_API_KEY) {
        headers["x-api-key"] = IDENTIFIER_API_KEY;
      }
      const resp = await fetch(IDENTIFIER_API_URL, {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (resp.ok) {
        const data = await resp.json();
        // Expected response: { "status": "success", "identifier": 100001 }
        if (data.identifier != null) {
          identifier = String(data.identifier);
          setLastIdentifier(identifier);
          return NextResponse.json({ identifier });
        }
      }
    } catch {
      // Fall through to local counter if external API fails
    }
  }

  // Fallback: use local in-memory counter
  const id = getNextJobId();
  identifier = String(id);
  setLastIdentifier(identifier);
  return NextResponse.json({ identifier });
}
