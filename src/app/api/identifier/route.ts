import { NextResponse } from "next/server";
import { getNextJobId, setLastIdentifier } from "@/lib/serverStore";

/**
 * GET /api/identifier — fetch a unique identifier for a new job.
 *
 * When the IDENTIFIER_API_URL env var is set, calls the external API.
 * Otherwise falls back to the in-memory counter.
 */

// Set this env var in Vercel to point to your real identifier API
const IDENTIFIER_API_URL = process.env.IDENTIFIER_API_URL || "";

export async function GET() {
  let identifier: string;

  // If an external identifier API URL is configured, call it
  if (IDENTIFIER_API_URL) {
    try {
      const resp = await fetch(IDENTIFIER_API_URL, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (resp.ok) {
        const data = await resp.json();
        // Expected response: { "identifier": "100042" }
        if (data.identifier) {
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
