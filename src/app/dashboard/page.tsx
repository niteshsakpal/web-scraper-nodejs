"use client";

import { useEffect, useState, useCallback } from "react";
import { getApiClient } from "@/services/api.client";
import type { Job } from "@/types/job";
import type { DashboardStats } from "@/services/api.types";
import StatsCard from "@/components/dashboard/StatsCard";
import RecentJobsTable from "@/components/dashboard/RecentJobsTable";
import Loader from "@/components/common/Loader";

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    const api = getApiClient();
    const [jobList, dashStats] = await Promise.all([api.listJobs(), api.getDashboardStats()]);
    setJobs(jobList);
    setStats(dashStats);
    setLoading(false);
  }, []);

  // Re-fetch every time the component mounts (including client-side navigation)
  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Also poll every 3s so running jobs update in real-time (no loader flash)
  useEffect(() => {
    const iv = setInterval(() => loadData(false), 3000);
    return () => clearInterval(iv);
  }, [loadData]);

  if (loading) return <Loader text="Loading dashboard..." />;

  return (
    <>
      {/* Top Header Bar */}
      <header className="border-b border-gray-200 bg-white px-8 py-5">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-0.5 text-sm text-gray-400">
          Overview of regulatory document processing
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-8 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="Total Jobs"
          value={String(stats?.totalJobs ?? 0)}
          color="blue"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          }
        />
        <StatsCard
          title="Success Rate"
          value={stats?.successRate ?? "N/A"}
          color="green"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatsCard
          title="Avg Processing Time"
          value={stats?.avgProcessingTime ?? "N/A"}
          color="amber"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Recent Jobs Table */}
      <RecentJobsTable jobs={jobs.slice(0, 10)} />
      </div>
    </>
  );
}
