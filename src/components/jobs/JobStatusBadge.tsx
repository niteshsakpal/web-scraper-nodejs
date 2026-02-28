"use client";

import type { JobStatus } from "@/types/job";

const statusStyles: Record<JobStatus, string> = {
  Pending: "bg-gray-100 text-gray-700",
  Running: "bg-blue-100 text-blue-700",
  Complete: "bg-green-100 text-green-700",
  Failed: "bg-red-100 text-red-700",
};

export default function JobStatusBadge({ status }: { status: JobStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[status]}`}
    >
      {status === "Running" && (
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
      )}
      {status}
    </span>
  );
}
