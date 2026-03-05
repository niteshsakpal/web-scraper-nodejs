import { NextResponse } from "next/server";
import { getAllJobs, addJob } from "@/lib/serverStore";

/** GET /api/jobs — return all jobs sorted by createdAt desc */
export async function GET() {
  return NextResponse.json({ jobs: getAllJobs() });
}

/** POST /api/jobs — store a job object */
export async function POST(req: Request) {
  const body = await req.json();
  if (body.id && body.stages) {
    addJob(body);
    return NextResponse.json({ ok: true, job: body });
  }
  return NextResponse.json({ error: "id and stages required" }, { status: 400 });
}
