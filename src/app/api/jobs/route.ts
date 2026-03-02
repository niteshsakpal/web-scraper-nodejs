import { NextResponse } from "next/server";
import { getAllJobs, addJob, getNextJobId } from "@/lib/serverStore";

/** GET /api/jobs — return all jobs sorted by createdAt desc */
export async function GET() {
  return NextResponse.json({ jobs: getAllJobs() });
}

/** POST /api/jobs — create a new job shell (stages populated client-side) */
export async function POST(req: Request) {
  const body = await req.json();
  // If the client sends a full job object, store it directly
  if (body.id && body.stages) {
    addJob(body);
    return NextResponse.json({ ok: true, job: body });
  }
  // Otherwise just reserve an ID
  const id = getNextJobId();
  return NextResponse.json({ ok: true, id: String(id) });
}
