"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getApiClient } from "@/services/api.client";
import { useActiveBranding } from "@/components/layout/Sidebar";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const branding = useActiveBranding();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    try {
      new URL(url);
    } catch {
      setError("Please enter a valid URL (e.g., https://example.com)");
      return;
    }

    setLoading(true);
    try {
      const job = await getApiClient().createJob({ url: url.trim() });
      router.push(`/jobs/${job.id}`);
    } catch {
      setError("Failed to submit URL. Please try again.");
      setLoading(false);
    }
  };

  const sources = ["SEC", "FCA", "EU", "BIS", "ESMA", "PRA", "EBA", "EIOPA"];

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      {/* Gradient background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(135deg, #002535 0%, #003d5c 40%, #00546e 70%, #006d7a 100%)",
        }}
      />
      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Hero content */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-8">
        {/* Glassmorphism input card */}
        <div
          className="w-full max-w-2xl rounded-2xl p-6 shadow-2xl border border-white/10"
          style={{
            background: "rgba(255,255,255,0.08)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError("");
                }}
                placeholder="Paste regulatory URL here..."
                className="w-full rounded-xl border-2 border-white/20 bg-white/10 px-5 py-4 text-sm text-white placeholder-white/40 shadow-sm focus:border-white/40 focus:bg-white/15 focus:outline-none transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="flex items-center gap-2 whitespace-nowrap rounded-xl px-7 py-4 text-sm font-bold shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-40 hover:scale-105 active:scale-95"
              style={{
                backgroundColor: branding.primaryColor,
                color: branding.headerBg,
              }}
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Analyzing...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                  Scrape &amp; Analyze
                </>
              )}
            </button>
          </form>

          {/* Error */}
          {error && (
            <p className="mt-3 text-sm text-red-400">{error}</p>
          )}
        </div>

        {/* Source logos / badges */}
        <div className="mt-10 flex flex-col items-center gap-3">
          <p className="text-xs text-white/30 uppercase tracking-widest font-medium">
            Supported regulatory sources
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {sources.map((s) => (
              <span
                key={s}
                className="rounded-full px-4 py-1.5 text-xs font-semibold border border-white/10 text-white/50 bg-white/5 hover:bg-white/10 transition-colors"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom feature highlights */}
      <div className="relative border-t border-white/10 px-8 py-6">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-12">
          {[
            { icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z", label: "URL Validation" },
            { icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z", label: "Smart Scraping" },
            { icon: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z", label: "AI Summarization" },
            { icon: "M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75", label: "Materiality" },
            { icon: "M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342", label: "Applicability" },
          ].map((f) => (
            <div key={f.label} className="flex items-center gap-2 text-white/40">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
              </svg>
              <span className="text-xs font-medium whitespace-nowrap">{f.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
