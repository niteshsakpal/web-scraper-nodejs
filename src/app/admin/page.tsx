"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PROMPT_CONFIGS,
  getPrompt,
  savePrompt,
  resetPrompt,
} from "@/config/prompts";

export default function AdminPage() {
  // Track current values for each prompt
  const [values, setValues] = useState<Record<string, string>>({});
  // Track which prompts have been modified from their saved state
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  // Track save feedback
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  // Load prompts from localStorage on mount
  useEffect(() => {
    const loaded: Record<string, string> = {};
    for (const cfg of PROMPT_CONFIGS) {
      loaded[cfg.key] = getPrompt(cfg.key);
    }
    setValues(loaded);
  }, []);

  const handleChange = useCallback((key: string, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    setDirty((prev) => ({ ...prev, [key]: true }));
    setSaved((prev) => ({ ...prev, [key]: false }));
  }, []);

  const handleSave = useCallback(
    (key: string) => {
      savePrompt(key, values[key] ?? "");
      setDirty((prev) => ({ ...prev, [key]: false }));
      setSaved((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => setSaved((prev) => ({ ...prev, [key]: false })), 2000);
    },
    [values]
  );

  const handleReset = useCallback((key: string) => {
    resetPrompt(key);
    const def =
      PROMPT_CONFIGS.find((p) => p.key === key)?.defaultValue ?? "";
    setValues((prev) => ({ ...prev, [key]: def }));
    setDirty((prev) => ({ ...prev, [key]: false }));
    setSaved((prev) => ({ ...prev, [key]: false }));
  }, []);

  return (
    <>
      {/* Page header */}
      <header className="px-8 pt-6 pb-4 border-b border-gray-200 bg-white">
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure AI prompts used for regulatory analysis. Changes are saved
          locally and used when calling the summarization, applicability, and
          materiality integrations.
        </p>
      </header>

      {/* Full-width prompt cards */}
      <div className="p-6 space-y-6">
        {PROMPT_CONFIGS.map((cfg) => (
          <div
            key={cfg.key}
            className="bg-white border border-gray-200 rounded-xl overflow-hidden"
          >
            {/* Card header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {cfg.label}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {cfg.description}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                {saved[cfg.key] && (
                  <span className="text-xs text-green-600 font-medium animate-pulse">
                    Saved!
                  </span>
                )}
                {dirty[cfg.key] && (
                  <span className="text-xs text-amber-600 font-medium">
                    Unsaved changes
                  </span>
                )}
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                  Active
                </span>
              </div>
            </div>

            {/* Textarea */}
            <div className="px-6 py-4">
              <textarea
                className="w-full min-h-[320px] p-4 rounded-lg border border-gray-200 bg-gray-50 font-mono text-[13px] leading-relaxed text-gray-800 resize-y focus:outline-none focus:ring-2 focus:ring-[#FAFD86] focus:border-transparent"
                value={values[cfg.key] ?? ""}
                onChange={(e) => handleChange(cfg.key, e.target.value)}
                spellCheck={false}
              />
            </div>

            {/* Card footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-3 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={() => handleReset(cfg.key)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Reset to Default
              </button>
              <button
                onClick={() => handleSave(cfg.key)}
                disabled={!dirty[cfg.key]}
                className="px-5 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: dirty[cfg.key] ? "#FAFD86" : "#f3f4f6",
                  color: "#222",
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
