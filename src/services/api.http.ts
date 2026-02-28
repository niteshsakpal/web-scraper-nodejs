import type { ApiClient, CreateJobInput, DashboardStats } from "./api.types";
import type { Job } from "@/types/job";
import { API_BASE_URL } from "./config";

/**
 * Real HTTP API client — placeholder for FastAPI backend integration.
 * Replace mock endpoints with actual API calls when backend is ready.
 */
export class HttpApiClient implements ApiClient {
  private baseUrl = API_BASE_URL;

  async listJobs(): Promise<Job[]> {
    const res = await fetch(`${this.baseUrl}/api/jobs`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch jobs");
    return res.json();
  }

  async getJob(id: string): Promise<Job> {
    const res = await fetch(`${this.baseUrl}/api/jobs/${id}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch job");
    return res.json();
  }

  async createJob(input: CreateJobInput): Promise<Job> {
    const res = await fetch(`${this.baseUrl}/api/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error("Failed to create job");
    return res.json();
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const res = await fetch(`${this.baseUrl}/api/dashboard/stats`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch stats");
    return res.json();
  }
}
