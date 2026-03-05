/**
 * In-memory server-side store for branding profiles and jobs.
 *
 * Persists across requests within the same serverless function instance.
 * On Vercel cold starts, data resets to defaults (acceptable for demo).
 * Replace with a real database for production use.
 */

import type { Job } from "@/types/job";

/* ── Branding Profile type (duplicated to avoid client import issues) ── */
export interface ServerBrandingProfile {
  id: string;
  name: string;
  logoUrl: string;
  primaryColor: string;
  headerBg: string;
  headerText: string;
  createdAt: string;
}

const DEFAULT_PROFILE: ServerBrandingProfile = {
  id: "default-synechron",
  name: "Synechron",
  logoUrl: "/branding/synechron-logo.svg",
  primaryColor: "#FAFD86",
  headerBg: "#002535",
  headerText: "#ffffff",
  createdAt: new Date("2026-02-20").toISOString(),
};

/* ── Global state (survives across requests in the same process) ── */

// Use globalThis to survive HMR in dev
const g = globalThis as unknown as {
  __rhs_branding_profiles?: ServerBrandingProfile[];
  __rhs_active_profile_id?: string;
  __rhs_jobs?: Job[];
  __rhs_next_job_id?: number;
  __rhs_prompts?: Record<string, string>;
};

if (!g.__rhs_branding_profiles) g.__rhs_branding_profiles = [DEFAULT_PROFILE];
if (!g.__rhs_active_profile_id) g.__rhs_active_profile_id = DEFAULT_PROFILE.id;
if (!g.__rhs_jobs) g.__rhs_jobs = [];
if (!g.__rhs_next_job_id) g.__rhs_next_job_id = 100000;
if (!g.__rhs_prompts) g.__rhs_prompts = {};

/* ── Branding helpers ── */

export function getAllProfiles(): ServerBrandingProfile[] {
  return [...g.__rhs_branding_profiles!];
}

export function getActiveId(): string {
  return g.__rhs_active_profile_id!;
}

export function setActiveId(id: string) {
  g.__rhs_active_profile_id = id;
}

export function upsertProfile(profile: ServerBrandingProfile) {
  const list = g.__rhs_branding_profiles!;
  const idx = list.findIndex((p) => p.id === profile.id);
  if (idx >= 0) {
    list[idx] = profile;
  } else {
    list.push(profile);
  }
}

export function removeProfile(id: string) {
  let list = g.__rhs_branding_profiles!;
  list = list.filter((p) => p.id !== id);
  if (list.length === 0) list = [DEFAULT_PROFILE];
  g.__rhs_branding_profiles = list;
  if (g.__rhs_active_profile_id === id) {
    g.__rhs_active_profile_id = list[0].id;
  }
  return { profiles: list, activeId: g.__rhs_active_profile_id };
}

/* ── Job helpers ── */

export function getAllJobs(): Job[] {
  return [...g.__rhs_jobs!].sort(
    (a, b) => (a.createdAt < b.createdAt ? 1 : -1)
  );
}

export function getJobById(id: string): Job | undefined {
  return g.__rhs_jobs!.find((j) => j.id === id);
}

export function addJob(job: Job) {
  g.__rhs_jobs!.unshift(job);
}

export function updateJob(id: string, data: Partial<Job>) {
  const job = g.__rhs_jobs!.find((j) => j.id === id);
  if (job) Object.assign(job, data);
  return job;
}

export function replaceJob(job: Job) {
  const idx = g.__rhs_jobs!.findIndex((j) => j.id === job.id);
  if (idx >= 0) {
    g.__rhs_jobs![idx] = job;
  } else {
    g.__rhs_jobs!.unshift(job);
  }
}

export function getNextJobId(): number {
  const id = g.__rhs_next_job_id!;
  g.__rhs_next_job_id = id + 1;
  return id;
}

export function peekNextJobId(): number {
  return g.__rhs_next_job_id!;
}

/* ── Prompt helpers ── */

export function getServerPrompt(key: string): string | undefined {
  return g.__rhs_prompts![key];
}

export function setServerPrompt(key: string, value: string) {
  g.__rhs_prompts![key] = value;
}

export function getAllServerPrompts(): Record<string, string> {
  return { ...g.__rhs_prompts! };
}

export function deleteServerPrompt(key: string) {
  delete g.__rhs_prompts![key];
}

/* ── Metadata helpers ── */

export function getMetadata() {
  return {
    lastJobId: g.__rhs_next_job_id! - 1,
    nextJobId: g.__rhs_next_job_id!,
    totalJobs: g.__rhs_jobs!.length,
    totalProfiles: g.__rhs_branding_profiles!.length,
  };
}
