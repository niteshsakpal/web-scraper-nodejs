import { NextResponse } from "next/server";
import { getAllServerPrompts, setServerPrompt, deleteServerPrompt } from "@/lib/serverStore";

/** GET /api/prompts — return all saved prompts */
export async function GET() {
  return NextResponse.json({ prompts: getAllServerPrompts() });
}

/** POST /api/prompts — save a prompt { key, value } or delete { key, delete: true } */
export async function POST(req: Request) {
  const body = await req.json();
  const { key, value } = body;
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });
  if (body.delete) {
    deleteServerPrompt(key);
    return NextResponse.json({ ok: true, action: "deleted" });
  }
  setServerPrompt(key, value ?? "");
  return NextResponse.json({ ok: true, action: "saved" });
}
