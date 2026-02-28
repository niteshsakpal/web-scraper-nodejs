"use client";

import React, { useEffect, useState, useCallback, use, useRef } from "react";
import Link from "next/link";
import { getApiClient } from "@/services/api.client";
import type { Job, Stage, ValidationResult, ScrapeResult, SummarizationResult, SummarizationFileResult } from "@/types/job";
import JobStatusBadge from "@/components/jobs/JobStatusBadge";
import Loader from "@/components/common/Loader";
import branding from "@/config/branding";

/* ── mock content per stage (simulates real output) ── */
const STAGE_CONTENT: Record<string, { title: string; sections: { heading: string; lines: string[] }[] }> = {
  "URL Validation": {
    title: "URL Validation",
    sections: [
      {
        heading: "Validation Result",
        lines: [
          "Status: Reachable",
          "Response Code: 200",
          "Content-Type: text/html; charset=UTF-8",
          "Redirect Chain: None",
          "SSL: Valid",
        ],
      },
      {
        heading: "Detected Metadata",
        lines: [
          "Document Type: EU Regulation",
          "Language: English (EN)",
          "Source: EUR-Lex",
        ],
      },
    ],
  },
  Scraping: {
    title: "Scraping",
    sections: [
      {
        heading: "Extraction Summary",
        lines: [
          "Sections extracted: 14",
          "Total words: 6,820",
          "Tables found: 3",
          "Images skipped: 2",
        ],
      },
      {
        heading: "Content Preview",
        lines: [
          "Article 1 — Subject matter and scope",
          "This Regulation lays down uniform rules on...",
          "Article 2 — Definitions",
          "For the purposes of this Regulation, the following definitions apply...",
        ],
      },
    ],
  },
  Summarization: {
    title: "Summarization",
    sections: [
      {
        heading: "Executive Summary",
        lines: [
          "This regulation establishes a comprehensive framework for...",
          "Key compliance requirements include quarterly reporting,",
          "risk assessment documentation, and cross-border data sharing protocols.",
        ],
      },
      {
        heading: "Key Compliance Points",
        lines: [
          "1. Quarterly reporting obligation (Article 5)",
          "2. Risk assessment framework (Article 12)",
          "3. Cross-border data sharing (Article 18)",
          "4. Penalty provisions up to 4% annual turnover (Article 24)",
        ],
      },
    ],
  },
};

/* ── Validation result display component ── */
function ValidationResultCard({ result, failed }: { result: ValidationResult; failed: boolean }) {
  const borderColor = failed ? "border-red-200" : "border-green-200";
  const bgColor = failed ? "bg-red-50" : "bg-green-50";
  const iconColor = failed ? "text-red-500" : "text-green-500";
  const label = result.canScrape ? "Scraping Allowed" : "Scraping Not Allowed";

  return (
    <div className="space-y-4">
      {/* Verdict card */}
      <div className={`rounded-xl border-2 ${borderColor} ${bgColor} p-6`}>
        <div className="flex items-center gap-3 mb-4">
          {result.canScrape ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
          )}
          <div>
            <div className={`text-lg font-bold ${iconColor}`}>{label}</div>
            <div className="text-sm text-gray-600 mt-0.5">{result.reason}</div>
          </div>
        </div>
      </div>

      {/* Details card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
          Validation Details
        </h3>
        <div className="font-mono text-sm text-gray-700 bg-gray-50 rounded-lg border border-gray-100 p-4 space-y-2">
          <div><span className="text-gray-400">Target URL:</span> {result.targetUrl}</div>
          <div><span className="text-gray-400">Robots.txt:</span> {result.robotsUrl}</div>
          <div>
            <span className="text-gray-400">Can Scrape:</span>{" "}
            <span className={result.canScrape ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
              {result.canScrape ? "Yes" : "No"}
            </span>
          </div>
          {result.crawlDelaySeconds != null && (
            <div><span className="text-gray-400">Crawl Delay:</span> {result.crawlDelaySeconds}s</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Fetch file content via our proxy ── */
async function fetchFileContent(
  identifier: string,
  fileType: "cleaned_html" | "pdf",
  fileName: string
): Promise<{ srcLang?: string; content?: string; error?: string }> {
  try {
    const resp = await fetch("/api/file-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: parseInt(identifier, 10),
        fileType,
        fileName,
      }),
    });
    return await resp.json();
  } catch {
    return { error: "Failed to fetch file content" };
  }
}

/* ── Fetch translation via our proxy ── */
async function fetchTranslation(
  identifier: string,
  filename: string,
  toLanguage: string
): Promise<{ content?: string; error?: string }> {
  try {
    const resp = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: Number(identifier),
        filename,
        toLanguage: "en",
      }),
    });
    return await resp.json();
  } catch {
    return { error: "Failed to fetch translation" };
  }
}

/* ── Language code → display name helper ── */
const LANG_NAMES: Record<string, string> = {
  en: "English", fr: "French", de: "German", es: "Spanish", it: "Italian",
  nl: "Dutch", pt: "Portuguese", pl: "Polish", ro: "Romanian", bg: "Bulgarian",
  cs: "Czech", da: "Danish", el: "Greek", et: "Estonian", fi: "Finnish",
  ga: "Irish", hr: "Croatian", hu: "Hungarian", lt: "Lithuanian", lv: "Latvian",
  mt: "Maltese", sk: "Slovak", sl: "Slovenian", sv: "Swedish", ta: "Tamil",
  ar: "Arabic", zh: "Chinese", ja: "Japanese", ko: "Korean", ru: "Russian",
};
function langName(code: string): string {
  return LANG_NAMES[code.toLowerCase()] ?? code.toUpperCase();
}

/* ── Scrape result: show file content with inline translation ── */
function ScrapeResultCard({
  result,
  jobId,
}: {
  result: ScrapeResult;
  jobId: string;
}) {
  const allFiles = [
    ...result.files.cleanedHtml.map((f) => ({ name: f, type: "cleaned_html" as const })),
    ...result.files.pdf.map((f) => ({ name: f, type: "pdf" as const })),
  ];
  const [activeIdx, setActiveIdx] = useState(0);
  const [contents, setContents] = useState<Record<string, { lang: string; html: string } | { error: string }>>({});
  const [translations, setTranslations] = useState<Record<string, { html: string } | { error: string }>>({});
  const [loadingFile, setLoadingFile] = useState<string | null>(null);
  const [translatingFile, setTranslatingFile] = useState<string | null>(null);

  const loadFile = useCallback(
    async (fName: string, fType: "cleaned_html" | "pdf") => {
      if (contents[fName]) return;
      setLoadingFile(fName);
      const res = await fetchFileContent(result.identifier || jobId, fType, fName);
      if (res.error) {
        setContents((prev) => ({ ...prev, [fName]: { error: res.error! } }));
      } else {
        const lang = res.srcLang ?? "";
        setContents((prev) => ({ ...prev, [fName]: { lang, html: res.content ?? "" } }));

        // Auto-translate if not English
        if (lang && lang.toLowerCase() !== "en" && !translations[fName]) {
          setTranslatingFile(fName);
          const tr = await fetchTranslation(result.identifier || jobId, fName, "en");
          if (tr.error) {
            setTranslations((prev) => ({ ...prev, [fName]: { error: tr.error! } }));
          } else {
            setTranslations((prev) => ({ ...prev, [fName]: { html: tr.content ?? "" } }));
          }
          setTranslatingFile(null);
        }
      }
      setLoadingFile(null);
    },
    [contents, translations, jobId, result.identifier],
  );

  // Auto-load the first file on mount
  useEffect(() => {
    if (allFiles.length > 0 && !contents[allFiles[0].name]) {
      loadFile(allFiles[0].name, allFiles[0].type);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load file content when tab changes
  useEffect(() => {
    if (allFiles[activeIdx] && !contents[allFiles[activeIdx].name]) {
      loadFile(allFiles[activeIdx].name, allFiles[activeIdx].type);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx]);

  if (allFiles.length === 0) {
    return <div className="text-sm text-gray-400 italic">No files scraped.</div>;
  }

  const currentFile = allFiles[activeIdx];
  const currentContent = contents[currentFile.name];
  const currentTranslation = translations[currentFile.name];
  const isLoading = loadingFile === currentFile.name;
  const isTranslating = translatingFile === currentFile.name;
  const isNonEnglish =
    currentContent && "lang" in currentContent && currentContent.lang && currentContent.lang.toLowerCase() !== "en";

  return (
    <div className="space-y-4">
      {/* File tabs (only when multiple files) */}
      {allFiles.length > 1 && (
        <div className="flex gap-1 overflow-x-auto pb-1">
          {allFiles.map((file, i) => (
            <button
              key={file.name}
              onClick={() => setActiveIdx(i)}
              className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border whitespace-nowrap transition-colors ${
                i === activeIdx
                  ? file.type === "cleaned_html"
                    ? "bg-orange-50 border-orange-300 text-orange-700 font-semibold"
                    : "bg-red-50 border-red-300 text-red-700 font-semibold"
                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {file.type === "cleaned_html" ? (
                <svg className="h-3.5 w-3.5 text-orange-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              )}
              <span className="truncate max-w-[200px]">{file.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* File header bar */}
      <div className="flex items-center gap-2 px-1">
        <svg className="h-4 w-4 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <span className="text-sm font-medium text-gray-700 truncate">{currentFile.name}</span>
        {currentContent && "lang" in currentContent && currentContent.lang && (
          <span className="text-[11px] font-semibold uppercase bg-blue-100 text-blue-600 rounded px-1.5 py-0.5">
            {currentContent.lang}
          </span>
        )}
        {isNonEnglish && (
          <span className="text-[11px] font-medium text-purple-600 bg-purple-50 rounded px-1.5 py-0.5">
            Translated to EN
          </span>
        )}
        <span className="text-[11px] text-gray-400 ml-auto">
          {activeIdx + 1} of {allFiles.length}
        </span>
      </div>

      {/* File content — single pane (English) or side-by-side (non-English) */}
      {isLoading || !currentContent ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-blue-600">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading file content...
          </div>
        </div>
      ) : "error" in currentContent ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-600">
          {currentContent.error}
        </div>
      ) : isNonEnglish ? (
        /* ── Side-by-side: Original (left) + Translated (right) ── */
        <div className="grid grid-cols-2 gap-4">
          {/* Original content */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Original
              </span>
              <span className="text-[11px] font-semibold uppercase bg-orange-100 text-orange-600 rounded px-1.5 py-0.5">
                {langName(currentContent.lang)}
              </span>
            </div>
            <div className="p-5 overflow-auto" style={{ maxHeight: "calc(100vh - 420px)" }}>
              <div
                className="prose prose-sm max-w-none break-words overflow-x-auto prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-li:text-gray-700 prose-strong:text-gray-900"
                dangerouslySetInnerHTML={{ __html: currentContent.html }}
              />
            </div>
          </div>

          {/* Translated content */}
          <div className="rounded-xl border border-purple-200 bg-white overflow-hidden">
            <div className="px-4 py-2 border-b border-purple-100 bg-purple-50 flex items-center gap-2">
              <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">
                Translated
              </span>
              <span className="text-[11px] font-semibold uppercase bg-green-100 text-green-600 rounded px-1.5 py-0.5">
                English
              </span>
            </div>
            <div className="p-5 overflow-auto" style={{ maxHeight: "calc(100vh - 420px)" }}>
              {isTranslating || !currentTranslation ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-purple-600">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Translating to English...
                </div>
              ) : "error" in currentTranslation ? (
                <div className="text-sm text-red-600 py-4">{currentTranslation.error}</div>
              ) : (
                <div
                  className="prose prose-sm max-w-none break-words overflow-x-auto prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-li:text-gray-700 prose-strong:text-gray-900"
                  dangerouslySetInnerHTML={{ __html: currentTranslation.html }}
                />
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ── Single pane: English content ── */
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="p-6 overflow-auto" style={{ maxHeight: "calc(100vh - 380px)" }}>
            <div
              className="prose prose-sm max-w-none break-words overflow-x-auto prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-li:text-gray-700 prose-strong:text-gray-900"
              dangerouslySetInnerHTML={{ __html: currentContent.html }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Streaming text effect hook ── */
function useStreamingHtml(html: string, enabled: boolean) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const streamed = React.useRef(false);

  React.useEffect(() => {
    if (!enabled || !html) return;
    // Only stream once per content
    if (streamed.current) { setDisplayed(html); setDone(true); return; }
    streamed.current = true;

    let idx = 0;
    const chars = html;
    const step = () => {
      // Advance in chunks for speed — skip inside HTML tags instantly
      let end = idx + 6;
      while (end < chars.length && chars[end - 1] !== ">" && chars[end] === "<") {
        // jump past tag
        const close = chars.indexOf(">", end);
        end = close >= 0 ? close + 1 : end + 6;
      }
      if (end > chars.length) end = chars.length;
      idx = end;
      setDisplayed(chars.slice(0, idx));
      if (idx < chars.length) {
        requestAnimationFrame(step);
      } else {
        setDone(true);
      }
    };
    requestAnimationFrame(step);
  }, [html, enabled]);

  return { displayed: enabled ? displayed : html, done: enabled ? done : true };
}

/* ── Collapsible reasoning block ── */
function ReasoningCollapsible({ reasoning }: { reasoning: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-amber-100 transition-colors cursor-pointer"
      >
        <svg
          className={`h-4 w-4 text-amber-500 shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <svg className="h-4 w-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
        </svg>
        <span className="text-sm font-semibold text-amber-700">Reasoning</span>
      </button>
      {open && (
        <div className="border-t border-amber-200 px-4 py-4">
          <div
            className="prose prose-sm max-w-none break-words overflow-x-auto prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900"
            dangerouslySetInnerHTML={{ __html: reasoning }}
          />
        </div>
      )}
    </div>
  );
}

/* ── Single file summary with streaming ── */
function FileSummaryContent({ file }: { file: SummarizationFileResult }) {
  const { displayed, done } = useStreamingHtml(file.summaryHtml ?? "", file.status === "success");

  if (file.status === "running") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <div className="ai-thinking-icon relative flex h-12 w-12 items-center justify-center">
          <svg className="h-8 w-8 text-violet-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
          </svg>
        </div>
        <span className="text-sm font-medium text-violet-600">AI is analyzing...</span>
        <div className="flex gap-1">
          <span className="ai-dot h-1.5 w-1.5 rounded-full bg-violet-400" style={{ animationDelay: "0s" }} />
          <span className="ai-dot h-1.5 w-1.5 rounded-full bg-violet-400" style={{ animationDelay: "0.2s" }} />
          <span className="ai-dot h-1.5 w-1.5 rounded-full bg-violet-400" style={{ animationDelay: "0.4s" }} />
        </div>
      </div>
    );
  }

  if (file.status === "failure") {
    return (
      <div className="px-5 py-4 text-sm text-red-600 bg-red-50 rounded-lg">
        {file.error ?? "Summarization failed"}
      </div>
    );
  }

  if (file.status === "success" && file.summaryHtml) {
    return (
      <div>
        {/* Reasoning on top */}
        {file.reasoning && (
          <ReasoningCollapsible reasoning={file.reasoning} />
        )}

        {/* Streamed summary output */}
        <div
          className="prose prose-sm max-w-none break-words overflow-x-auto prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-li:text-gray-700 prose-strong:text-gray-900"
          dangerouslySetInnerHTML={{ __html: displayed }}
        />
        {!done && (
          <span className="inline-block w-2 h-4 bg-gray-800 animate-pulse ml-0.5 align-text-bottom" />
        )}
      </div>
    );
  }

  return <div className="px-5 py-4 text-sm text-gray-400 italic">Waiting...</div>;
}

/* ── Summarization result: direct display (no file name) ── */
function SummarizationResultCard({ result }: { result: SummarizationResult }) {
  if (result.files.length === 0) {
    return <div className="text-sm text-gray-400 italic">No files to summarize.</div>;
  }

  return (
    <div className="space-y-4">
      {result.files.map((file) => (
        <FileSummaryContent key={file.filename} file={file} />
      ))}
    </div>
  );
}

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState("");
  const [selectedStageIdx, setSelectedStageIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const prevStatusRef = useRef<string>("");

  const fetchJob = useCallback(async () => {
    try {
      const j = await getApiClient().getJob(id);
      setJob(j);
      return j;
    } catch {
      setError("Job not found");
      return null;
    }
  }, [id]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let mounted = true;

    const poll = async () => {
      const j = await fetchJob();
      if (mounted && j && j.status !== "Complete" && j.status !== "Failed") {
        timer = setTimeout(poll, 800);
      }
    };

    poll();

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [fetchJob]);

  /* Auto-select the currently running stage */
  useEffect(() => {
    if (!job) return;
    const runningIdx = job.stages.findIndex((s) => s.status === "Running");
    if (runningIdx !== -1) setSelectedStageIdx(runningIdx);
  }, [job]);

  /* Live elapsed timer */
  useEffect(() => {
    if (!job) return;
    if (job.status === "Complete" || job.status === "Failed") return;
    const start = new Date(job.createdAt).getTime();
    const tick = () => setElapsed(Math.round((Date.now() - start) / 1000));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [job]);

  /* Success celebration */
  useEffect(() => {
    if (!job) return;
    if (prevStatusRef.current && prevStatusRef.current !== "Complete" && job.status === "Complete") {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2000);
    }
    prevStatusRef.current = job.status;
  }, [job]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-12">
        <p className="text-gray-500">{error}</p>
        <Link href="/" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
          Back to Scrape URL
        </Link>
      </div>
    );
  }

  if (!job) return <Loader text="Loading job details..." />;

  const selectedStage: Stage = job.stages[selectedStageIdx];
  const content = STAGE_CONTENT[selectedStage.name];
  const completedCount = job.stages.filter((s) => s.status === "Complete").length;
  const progressPct = Math.round((completedCount / job.stages.length) * 100);
  const isRunning = job.status !== "Complete" && job.status !== "Failed";
  const totalDuration = job.stages.reduce((sum, s) => sum + (s.durationMs ?? 0), 0);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <>
      {/* Success celebration overlay */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="relative">
            <div className="celebrate-ring absolute inset-0 rounded-full border-4 border-green-400" style={{ width: 120, height: 120, marginLeft: -20, marginTop: -20 }} />
            <div className="celebrate-check flex h-20 w-20 items-center justify-center rounded-full bg-green-500 shadow-2xl">
              <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <header className="border-b border-white/10 px-8 py-4 flex items-center justify-between" style={{ background: '#002535' }}>
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-xl font-bold text-white">Job Execution</h1>
            <p className="mt-0.5 text-xs text-white/50">
              {job.id} &middot; Started {new Date(job.createdAt).toLocaleString()}
            </p>
          </div>
          {/* Live elapsed timer */}
          <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 border border-white/10">
            <svg className="h-3.5 w-3.5 text-white/50" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-mono font-semibold text-white">
              {isRunning ? formatTime(elapsed) : formatTime(Math.round(totalDuration / 1000))}
            </span>
          </div>
          {/* Stage progress indicator */}
          <div className="text-xs text-white/50">
            {completedCount}/{job.stages.length} stages
          </div>
        </div>
        <div className="flex items-center gap-3">
          {job.status === "Complete" && (
            <button
              className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition-colors"
              onClick={() => alert("Export functionality coming soon!")}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download Report
            </button>
          )}
          <JobStatusBadge status={job.status} />
        </div>
      </header>

      {/* URL bar */}
      <div className="border-b border-white/10 px-8 py-2.5 flex items-center gap-2 text-sm" style={{ background: '#003d5c' }}>
        <span className="text-white/40">URL:</span>
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-300 hover:underline truncate"
        >
          {job.url}
        </a>
      </div>

      {/* ── Split Panel: vertical steps left + content right ── */}
      <div className="flex flex-1" style={{ height: 'calc(100vh - 140px)', minHeight: 0 }}>
        {/* LEFT: Steps Panel */}
        <div className="w-72 shrink-0 border-r border-white/10 overflow-y-auto sticky top-0 self-start" style={{ background: '#002535', maxHeight: 'calc(100vh - 140px)' }}>
          <div className="px-5 py-3 border-b border-white/10">
            <div className="text-xs font-semibold uppercase tracking-wide text-white/40">
              Processing Steps
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 relative ${isRunning ? "progress-bar-shimmer" : ""}`}
                style={{ width: `${progressPct}%`, backgroundColor: progressPct === 100 ? "#22c55e" : branding.primaryColor }}
              />
            </div>
          </div>

          {job.stages.map((stage, idx) => {
            const isSelected = idx === selectedStageIdx;
            const isLast = idx === job.stages.length - 1;

            const nextStage = !isLast ? job.stages[idx + 1] : null;
            const connectorColor =
              stage.status === "Complete" && nextStage?.status === "Complete"
                ? "#86efac"
                : stage.status === "Complete" && nextStage?.status === "Running"
                  ? "linear-gradient(to bottom, #86efac, #93c5fd)"
                  : "rgba(255,255,255,0.15)";

            const nameColor =
              stage.status === "Complete"
                ? "text-white"
                : stage.status === "Running"
                  ? "text-blue-300"
                  : stage.status === "Failed"
                    ? "text-red-400"
                    : "text-white/40";
            const statusColor =
              stage.status === "Complete"
                ? "text-green-400"
                : stage.status === "Running"
                  ? "text-blue-400"
                  : stage.status === "Failed"
                    ? "text-red-400"
                    : "text-white/30";

            return (
              <div key={stage.name} className="relative">
                {/* Connector line to next step */}
                {!isLast && (
                  <div
                    className="absolute left-[34px] top-[42px] w-[2px] bottom-0 z-0"
                    style={{ background: connectorColor }}
                  />
                )}

                <button
                  onClick={() => setSelectedStageIdx(idx)}
                  className={`relative z-10 flex items-start gap-3 w-full text-left px-5 py-3.5 border-l-[3px] transition-colors ${
                    isSelected
                      ? "bg-white/10"
                      : "border-transparent hover:bg-white/5"
                  }`}
                  style={isSelected ? { borderLeftColor: branding.primaryColor } : undefined}
                >
                  {/* Status icon */}
                  <div className="mt-0.5">
                    {stage.status === "Complete" ? (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-green-600 border-2 border-green-300">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </div>
                    ) : stage.status === "Running" ? (
                      <div className="step-icon-running flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-600 border-2 border-blue-300">
                        <div className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
                      </div>
                    ) : stage.status === "Failed" ? (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-red-600 border-2 border-red-300">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/40 text-xs font-semibold border-2 border-white/20">
                        {idx + 1}
                      </div>
                    )}
                  </div>

                  {/* Step info */}
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold ${nameColor}`}>
                      {idx + 1}. {stage.name}
                    </div>
                    <div className={`text-xs mt-0.5 ${statusColor}`}>
                      {stage.status === "Running"
                        ? "Processing..."
                        : stage.status}
                    </div>
                    {stage.status === "Running" && stage.startedAt && (
                      <div className="text-[11px] text-blue-400 mt-0.5">
                        {Math.round((Date.now() - new Date(stage.startedAt).getTime()) / 1000)}s elapsed
                      </div>
                    )}
                    {stage.status === "Complete" && stage.durationMs != null && (
                      <div className="text-[11px] text-white/30 mt-0.5">
                        {(stage.durationMs / 1000).toFixed(1)}s
                      </div>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* RIGHT: Content Panel */}
        <div className="flex-1 bg-gray-50 p-8 min-w-0 overflow-y-auto overflow-x-hidden">
          <div key={selectedStageIdx} className="stage-content-enter">
          {/* Content header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">{content?.title ?? selectedStage.name}</h2>
            <span
              className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${
                selectedStage.status === "Complete"
                  ? "bg-green-100 text-green-700"
                  : selectedStage.status === "Running"
                    ? "bg-blue-100 text-blue-700"
                    : selectedStage.status === "Failed"
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-500"
              }`}
            >
              {selectedStage.status}
            </span>
          </div>

          {/* Meta row */}
          <div className="flex gap-8 mb-6">
            {selectedStage.durationMs != null && (
              <div>
                <div className="text-[11px] text-gray-400 uppercase tracking-wide">Duration</div>
                <div className="text-sm font-medium text-gray-900 mt-0.5">
                  {(selectedStage.durationMs / 1000).toFixed(1)} seconds
                </div>
              </div>
            )}
            {selectedStage.startedAt && (
              <div>
                <div className="text-[11px] text-gray-400 uppercase tracking-wide">Started</div>
                <div className="text-sm font-medium text-gray-900 mt-0.5">
                  {new Date(selectedStage.startedAt).toLocaleTimeString()}
                </div>
              </div>
            )}
            {selectedStage.completedAt && (
              <div>
                <div className="text-[11px] text-gray-400 uppercase tracking-wide">Completed</div>
                <div className="text-sm font-medium text-gray-900 mt-0.5">
                  {new Date(selectedStage.completedAt).toLocaleTimeString()}
                </div>
              </div>
            )}
          </div>

          {/* Stage content cards */}
          {selectedStage.status === "Pending" ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400 italic">
              Waiting for previous stage to complete...
            </div>
          ) : selectedStage.status === "Running" ? (
            ["Summarization", "Materiality", "Applicability"].includes(selectedStage.name) ? (
              <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-10 text-center">
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="ai-thinking-icon relative flex h-14 w-14 items-center justify-center">
                    <svg className="h-9 w-9 text-violet-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-violet-700">AI is analyzing {selectedStage.name.toLowerCase()}...</span>
                  <p className="text-xs text-violet-400 max-w-sm">Processing document through our AI pipeline. This may take a moment.</p>
                  <div className="flex gap-1.5 mt-1">
                    <span className="ai-dot h-2 w-2 rounded-full bg-violet-400" style={{ animationDelay: "0s" }} />
                    <span className="ai-dot h-2 w-2 rounded-full bg-violet-400" style={{ animationDelay: "0.2s" }} />
                    <span className="ai-dot h-2 w-2 rounded-full bg-violet-400" style={{ animationDelay: "0.4s" }} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 text-center">
                <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing {selectedStage.name.toLowerCase()}...
                </div>
              </div>
            )
          ) : selectedStage.name === "URL Validation" && selectedStage.validationResult ? (
            <ValidationResultCard result={selectedStage.validationResult} failed={selectedStage.status === "Failed"} />
          ) : selectedStage.name === "Scraping" && selectedStage.scrapeResult ? (
            <ScrapeResultCard result={selectedStage.scrapeResult} jobId={job.id} />
          ) : selectedStage.name === "Summarization" && selectedStage.summarizationResult ? (
            <SummarizationResultCard result={selectedStage.summarizationResult} />
          ) : selectedStage.name === "Applicability" && selectedStage.applicabilityResult ? (
            <SummarizationResultCard result={selectedStage.applicabilityResult} />
          ) : selectedStage.name === "Materiality" && selectedStage.materialityResult ? (
            <SummarizationResultCard result={selectedStage.materialityResult} />
          ) : selectedStage.status === "Failed" ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-red-400 mb-3">Error</h3>
              <div className="text-sm text-red-700">{selectedStage.details ?? "Stage failed"}</div>
            </div>
          ) : (
            content?.sections.map((section) => (
              <div key={section.heading} className="rounded-xl border border-gray-200 bg-white p-6 mb-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                  {section.heading}
                </h3>
                <div className="font-mono text-sm text-gray-700 bg-gray-50 rounded-lg border border-gray-100 p-4 space-y-1">
                  {section.lines.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              </div>
            ))
          )}
          </div>
        </div>
      </div>
    </>
  );
}
