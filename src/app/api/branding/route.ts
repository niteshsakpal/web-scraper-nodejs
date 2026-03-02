import { NextResponse } from "next/server";
import { getAllProfiles, upsertProfile } from "@/lib/serverStore";

/** GET /api/branding — return all branding profiles */
export async function GET() {
  return NextResponse.json({ profiles: getAllProfiles() });
}

/** POST /api/branding — create or update a profile */
export async function POST(req: Request) {
  const profile = await req.json();
  upsertProfile(profile);
  return NextResponse.json({ ok: true });
}
