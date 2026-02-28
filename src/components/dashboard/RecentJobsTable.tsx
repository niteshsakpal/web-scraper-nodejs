"use client";

import Link from "next/link";
import type { Job } from "@/types/job";
import JobStatusBadge from "@/components/jobs/JobStatusBadge";

export default function RecentJobsTable({ jobs }: { jobs: Job[] }) {
  if (jobs.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        No jobs yet. Submit a URL to get started.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-gray-900">Recent Jobs</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-5 py-3 text-left font-medium text-gray-500">Job ID</th>
              <th className="px-5 py-3 text-left font-medium text-gray-500">URL</th>
              <th className="px-5 py-3 text-left font-medium text-gray-500">Status</th>
              <th className="px-5 py-3 text-left font-medium text-gray-500">Current Stage</th>
              <th className="px-5 py-3 text-left font-medium text-gray-500">Created At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {jobs.map((job) => (
              <tr key={job.id} className="transition-colors hover:bg-gray-50/50">
                <td className="whitespace-nowrap px-5 py-3.5">
                  <Link
                    href={`/jobs/${job.id}`}
                    className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {job.id}
                  </Link>
                </td>
                <td className="max-w-xs truncate px-5 py-3.5 text-gray-700" title={job.url}>
                  {job.url}
                </td>
                <td className="whitespace-nowrap px-5 py-3.5">
                  <JobStatusBadge status={job.status} />
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-gray-700">
                  {job.currentStage}
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-gray-500">
                  {new Date(job.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
