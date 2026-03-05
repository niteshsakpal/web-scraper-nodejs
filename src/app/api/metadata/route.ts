import { NextResponse } from "next/server";
import { getMetadata } from "@/lib/serverStore";

/** GET /api/metadata — return system metadata (last job ID, counts, etc.) */
export async function GET() {
  return NextResponse.json(getMetadata());
}
