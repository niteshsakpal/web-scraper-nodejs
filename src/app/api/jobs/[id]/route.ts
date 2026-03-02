import { NextResponse } from "next/server";
import { getJobById, replaceJob } from "@/lib/serverStore";

/** GET /api/jobs/:id — return a single job */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = getJobById(id);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ job });
}

/** PUT /api/jobs/:id — replace the full job object (used by client after stage updates) */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  body.id = id;
  replaceJob(body);
  return NextResponse.json({ ok: true });
}
