import type { Job } from "@/types/job";

export interface CreateJobInput {
  url: string;
}

export interface DashboardStats {
  totalJobs: number;
  successRate: string;
  avgProcessingTime: string;
}

export interface ApiClient {
  listJobs(): Promise<Job[]>;
  getJob(id: string): Promise<Job>;
  createJob(input: CreateJobInput): Promise<Job>;
  getDashboardStats(): Promise<DashboardStats>;
}
