"use client";

import { useState } from "react";
import type { Stage } from "@/types/job";

const statusDot: Record<string, string> = {
  Complete: "bg-green-500",
  Running: "bg-blue-500 animate-pulse",
  Failed: "bg-red-500",
  Pending: "bg-gray-300",
};

const statusLine: Record<string, string> = {
  Complete: "bg-green-500",
  Running: "bg-blue-300",
  Failed: "bg-red-300",
  Pending: "bg-gray-200",
};

export default function StageTracker({ stages }: { stages: Stage[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-0">
      {stages.map((stage, idx) => {
        const isOpen = openIndex === idx;
        const isLast = idx === stages.length - 1;

        return (
          <div key={stage.name} className="relative">
            {/* Connector line */}
            {!isLast && (
              <div
                className={`absolute left-[19px] top-[44px] h-[calc(100%-28px)] w-0.5 ${statusLine[stage.status]}`}
              />
            )}

            {/* Stage card */}
            <div className="relative flex gap-4">
              {/* Dot */}
              <div className="flex flex-col items-center pt-4">
                <div
                  className={`h-3.5 w-3.5 rounded-full border-2 border-white ring-2 ring-gray-100 ${statusDot[stage.status]}`}
                />
              </div>

              {/* Content */}
              <div className="flex-1 pb-4">
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition-all hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-900">{stage.name}</span>
                    {stage.status === "Running" && (
                      <span className="text-xs text-blue-600 animate-pulse">Processing...</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {stage.durationMs && (
                      <span className="text-xs text-gray-400">
                        {(stage.durationMs / 1000).toFixed(1)}s
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        stage.status === "Complete"
                          ? "bg-green-100 text-green-700"
                          : stage.status === "Running"
                            ? "bg-blue-100 text-blue-700"
                            : stage.status === "Failed"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {stage.status}
                    </span>
                    <svg
                      className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div className="mt-2 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                    <div className="space-y-1.5">
                      {stage.details && <p>{stage.details}</p>}
                      {stage.startedAt && (
                        <p className="text-xs text-gray-400">
                          Started: {new Date(stage.startedAt).toLocaleTimeString()}
                        </p>
                      )}
                      {stage.completedAt && (
                        <p className="text-xs text-gray-400">
                          Completed: {new Date(stage.completedAt).toLocaleTimeString()}
                        </p>
                      )}
                      {!stage.details && stage.status === "Pending" && (
                        <p className="italic text-gray-400">Waiting for previous stage to complete...</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
