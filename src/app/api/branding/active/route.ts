import { NextResponse } from "next/server";
import { getActiveId, setActiveId } from "@/lib/serverStore";

/** GET /api/branding/active — return the active profile ID */
export async function GET() {
  return NextResponse.json({ activeId: getActiveId() });
}

/** PUT /api/branding/active — set the active profile ID */
export async function PUT(req: Request) {
  const { id } = await req.json();
  setActiveId(id);
  return NextResponse.json({ ok: true, activeId: id });
}
