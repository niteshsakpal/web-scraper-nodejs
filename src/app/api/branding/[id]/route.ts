import { NextResponse } from "next/server";
import { removeProfile } from "@/lib/serverStore";

/** DELETE /api/branding/:id — delete a profile */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = removeProfile(id);
  return NextResponse.json({ ok: true, ...result });
}
