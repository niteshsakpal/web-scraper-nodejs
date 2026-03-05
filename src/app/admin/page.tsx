"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import {
  PROMPT_CONFIGS,
  getPrompt,
  savePrompt,
  resetPrompt,
  loadPromptsFromServer,
} from "@/config/prompts";
import {
  fetchProfiles,
  fetchActiveProfileId,
  serverSetActiveProfileId,
  serverSaveProfile,
  serverDeleteProfile,
  createBlankProfile,
  type BrandingProfile,
} from "@/config/brandingProfiles";

/* ============================================================
   AI Prompts Tab
   ============================================================ */
function AIPromptsTab() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Load cached values immediately, then hydrate from server
    const cached: Record<string, string> = {};
    for (const cfg of PROMPT_CONFIGS) {
      cached[cfg.key] = getPrompt(cfg.key);
    }
    setValues(cached);
    loadPromptsFromServer().then((serverVals) => setValues(serverVals));
  }, []);

  const handleChange = useCallback((key: string, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    setDirty((prev) => ({ ...prev, [key]: true }));
    setSaved((prev) => ({ ...prev, [key]: false }));
  }, []);

  const handleSave = useCallback(
    async (key: string) => {
      await savePrompt(key, values[key] ?? "");
      setDirty((prev) => ({ ...prev, [key]: false }));
      setSaved((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => setSaved((prev) => ({ ...prev, [key]: false })), 2000);
    },
    [values],
  );

  const handleReset = useCallback(async (key: string) => {
    await resetPrompt(key);
    const def = PROMPT_CONFIGS.find((p) => p.key === key)?.defaultValue ?? "";
    setValues((prev) => ({ ...prev, [key]: def }));
    setDirty((prev) => ({ ...prev, [key]: false }));
    setSaved((prev) => ({ ...prev, [key]: false }));
  }, []);

  return (
    <div className="space-y-6">
      {PROMPT_CONFIGS.map((cfg) => (
        <div key={cfg.key} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{cfg.label}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{cfg.description}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-4">
              {saved[cfg.key] && (
                <span className="text-xs text-green-600 font-medium animate-pulse">Saved!</span>
              )}
              {dirty[cfg.key] && (
                <span className="text-xs text-amber-600 font-medium">Unsaved changes</span>
              )}
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                Active
              </span>
            </div>
          </div>
          <div className="px-6 py-4">
            <textarea
              className="w-full min-h-[320px] p-4 rounded-lg border border-gray-200 bg-gray-50 font-mono text-[13px] leading-relaxed text-gray-800 resize-y focus:outline-none focus:ring-2 focus:ring-[#FAFD86] focus:border-transparent"
              value={values[cfg.key] ?? ""}
              onChange={(e) => handleChange(cfg.key, e.target.value)}
              spellCheck={false}
            />
          </div>
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
  );
}

/* ============================================================
   Branding Tab
   ============================================================ */
function BrandingTab() {
  const [mounted, setMounted] = useState(false);
  const [profiles, setProfiles] = useState<BrandingProfile[]>([]);
  const [activeId, setActiveId] = useState("");
  const [editing, setEditing] = useState<BrandingProfile | null>(null);
  const [dirty, setDirty] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    const [p, id] = await Promise.all([fetchProfiles(), fetchActiveProfileId()]);
    setProfiles(p);
    setActiveId(id);
  }, []);

  useEffect(() => {
    reload();
    setMounted(true);
  }, [reload]);

  const selectProfile = (p: BrandingProfile) => {
    setEditing({ ...p });
    setDirty(false);
    setSavedMsg(false);
    setConfirmDelete(false);
  };

  const handleNew = () => {
    const blank = createBlankProfile();
    selectProfile(blank);
    setDirty(true);
  };

  const updateField = <K extends keyof BrandingProfile>(key: K, val: BrandingProfile[K]) => {
    if (!editing) return;
    setEditing({ ...editing, [key]: val });
    setDirty(true);
    setSavedMsg(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("Logo must be under 2 MB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") updateField("logoUrl", reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.name.trim()) { alert("Profile name is required"); return; }
    await serverSaveProfile(editing);
    setDirty(false);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
    await reload();
  };

  const handleDelete = async () => {
    if (!editing) return;
    await serverDeleteProfile(editing.id);
    setEditing(null);
    setConfirmDelete(false);
    await reload();
  };

  const handleActivate = async (id: string) => {
    await serverSetActiveProfileId(id);
    setActiveId(id);
  };

  const handleReset = () => {
    if (!editing) return;
    const original = profiles.find((p) => p.id === editing.id);
    if (original) setEditing({ ...original });
    setDirty(false);
  };

  const isActiveEditing = editing && editing.id === activeId;

  // Prevent rendering before client hydration to avoid flash of empty state
  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
        Loading branding profiles…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Profile Cards Grid ── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-base font-bold text-gray-900">Saved Branding Profiles</h2>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full" style={{ background: "#FAFD86", color: "#002535" }}>
            {profiles.length} profile{profiles.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {profiles.map((p) => {
            const isActive = p.id === activeId;
            const isSelected = editing?.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => selectProfile(p)}
                className={`relative text-left rounded-xl border-2 p-4 transition-all cursor-pointer hover:shadow-md ${
                  isSelected ? "border-blue-500 ring-2 ring-blue-200"
                    : isActive ? "border-green-400 bg-green-50/50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                {isActive && (
                  <span className="absolute top-2.5 right-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500 text-white">Active</span>
                )}
                <div className="w-full h-14 rounded-lg flex items-center justify-center mb-3 border border-white/20" style={{ background: p.headerBg }}>
                  {p.logoUrl ? (
                    <Image src={p.logoUrl} alt={p.name} width={100} height={28} className="h-6 w-auto brightness-0 invert object-contain" unoptimized={p.logoUrl.startsWith("data:")} />
                  ) : (
                    <span className="text-xs text-white/40">No logo</span>
                  )}
                </div>
                <div className="font-semibold text-sm text-gray-900">{p.name || "Untitled"}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  {new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>
                <div className="flex gap-1.5 mt-2">
                  <div className="w-5 h-5 rounded-full border-2 border-white shadow-sm" style={{ background: p.primaryColor }} title="Primary" />
                  <div className="w-5 h-5 rounded-full border-2 border-white shadow-sm" style={{ background: p.headerBg }} title="Header BG" />
                  <div className="w-5 h-5 rounded-full border-2 border-white shadow-sm" style={{ background: p.headerText, boxShadow: "0 0 0 1px #d1d5db" }} title="Header Text" />
                </div>
              </button>
            );
          })}

          {/* Create New */}
          <button
            onClick={handleNew}
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-4 min-h-[160px] text-gray-400 hover:border-gray-500 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <span className="text-3xl font-light mb-1">+</span>
            <span className="text-xs font-semibold">Create New Profile</span>
          </button>
        </div>
      </div>

      {/* ── Editor Panel ── */}
      {editing && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="text-[15px] font-bold text-gray-900">
              {profiles.find((p) => p.id === editing.id) ? `Edit Profile: ${editing.name || "Untitled"}` : "New Profile"}
            </h3>
            <div className="flex items-center gap-2">
              {savedMsg && <span className="text-xs text-green-600 font-medium animate-pulse">Saved!</span>}
              {isActiveEditing ? (
                <span className="px-3 py-1.5 text-xs font-bold rounded-lg bg-green-500 text-white">Active</span>
              ) : (
                <button
                  onClick={() => { if (dirty) handleSave(); handleActivate(editing.id); }}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors cursor-pointer"
                >
                  Set as Active
                </button>
              )}
              {profiles.length > 1 && profiles.find((p) => p.id === editing.id) && (
                confirmDelete ? (
                  <div className="flex items-center gap-1">
                    <button onClick={handleDelete} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors cursor-pointer">Confirm</button>
                    <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(true)} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors cursor-pointer">Delete</button>
                )
              )}
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left column */}
              <div className="space-y-5">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Profile Name</label>
                  <input
                    type="text"
                    value={editing.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="e.g. Synechron, Acme Corp..."
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Logo Upload</label>
                  <input ref={fileInputRef} type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp" onChange={handleLogoUpload} className="hidden" />
                  {editing.logoUrl ? (
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-32 rounded-lg flex items-center justify-center border" style={{ background: editing.headerBg }}>
                        <Image src={editing.logoUrl} alt="Logo preview" width={100} height={28} className="h-6 w-auto brightness-0 invert object-contain" unoptimized={editing.logoUrl.startsWith("data:")} />
                      </div>
                      <button onClick={() => fileInputRef.current?.click()} className="px-3 py-2 text-xs font-medium rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">Change</button>
                      <button onClick={() => updateField("logoUrl", "")} className="px-3 py-2 text-xs font-medium rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors cursor-pointer">Remove</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-gray-300 rounded-lg py-6 flex flex-col items-center gap-2 hover:border-gray-400 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <svg className="h-7 w-7 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      <span className="text-xs text-gray-500">Drop logo here or <span className="font-semibold text-gray-700">click to browse</span></span>
                      <span className="text-[10px] text-gray-400">SVG, PNG, or JPG — max 2 MB</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Right column — Colors */}
              <div className="space-y-5">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Primary / Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={editing.primaryColor} onChange={(e) => updateField("primaryColor", e.target.value)} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                    <input type="text" value={editing.primaryColor} onChange={(e) => updateField("primaryColor", e.target.value)} className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Header Background</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={editing.headerBg} onChange={(e) => updateField("headerBg", e.target.value)} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                    <input type="text" value={editing.headerBg} onChange={(e) => updateField("headerBg", e.target.value)} className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Header Text Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={editing.headerText} onChange={(e) => updateField("headerText", e.target.value)} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                    <input type="text" value={editing.headerText} onChange={(e) => updateField("headerText", e.target.value)} className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                  </div>
                </div>
              </div>
            </div>

            {/* Live Preview */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">Live Preview</label>
              <div className="rounded-lg px-5 py-3 flex items-center gap-4" style={{ background: editing.headerBg }}>
                {editing.logoUrl ? (
                  <Image src={editing.logoUrl} alt="Preview" width={100} height={24} className="h-5 w-auto brightness-0 invert object-contain" unoptimized={editing.logoUrl.startsWith("data:")} />
                ) : (
                  <span className="text-sm font-semibold" style={{ color: editing.headerText }}>{editing.name || "Logo"}</span>
                )}
                <span className="text-xs" style={{ color: `${editing.headerText}99` }}>
                  Scrape URL &nbsp;&middot;&nbsp; Dashboard &nbsp;&middot;&nbsp; Admin
                </span>
                <span className="ml-auto">
                  <span className="px-4 py-1.5 rounded-lg text-xs font-bold" style={{ background: editing.primaryColor, color: editing.headerBg }}>
                    Scrape &amp; Analyze
                  </span>
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={handleReset}
                disabled={!dirty}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Reset
              </button>
              <button
                onClick={handleSave}
                disabled={!dirty}
                className="px-5 py-2 text-sm font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: dirty ? "#002535" : "#e5e7eb", color: dirty ? "#fff" : "#999" }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Metadata Tab
   ============================================================ */
interface MetadataInfo {
  lastJobId: number;
  nextJobId: number;
  totalJobs: number;
  totalProfiles: number;
}

function MetadataTab() {
  const [meta, setMeta] = useState<MetadataInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMeta = useCallback(async () => {
    try {
      const res = await fetch("/api/metadata");
      const data = await res.json();
      setMeta(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
        Loading metadata...
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="text-sm text-red-500 py-8 text-center">
        Failed to load metadata.
      </div>
    );
  }

  const cards = [
    {
      label: "Last Generated Identifier",
      value: meta.lastJobId < 100000 ? "None yet" : String(meta.lastJobId),
      description: "The most recent job identifier that was assigned when a user clicked Scrape & Analyze.",
      icon: (
        <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.9 19.5m-2.1-19.5l-3.9 19.5" />
        </svg>
      ),
    },
    {
      label: "Next Identifier",
      value: String(meta.nextJobId),
      description: "The identifier that will be assigned to the next job.",
      icon: (
        <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      ),
    },
    {
      label: "Total Jobs",
      value: String(meta.totalJobs),
      description: "Total number of scraping jobs stored on the server.",
      icon: (
        <svg className="h-6 w-6 text-violet-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      ),
    },
    {
      label: "Branding Profiles",
      value: String(meta.totalProfiles),
      description: "Number of branding profiles saved on the server.",
      icon: (
        <svg className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-gray-50">{card.icon}</div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{card.label}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{card.value}</div>
            <p className="text-xs text-gray-500">{card.description}</p>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <button
          onClick={() => { setLoading(true); fetchMeta(); }}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer flex items-center gap-2"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
          </svg>
          Refresh
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   Main Admin Page with Tabs
   ============================================================ */
export default function AdminPage() {
  const [tab, setTab] = useState<"prompts" | "branding" | "metadata">("prompts");

  return (
    <>
      <header className="px-8 pt-6 pb-0 bg-white">
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-sm text-gray-500 mt-1">Manage AI prompts, branding, and system metadata</p>
        <div className="flex gap-0 mt-4 border-b border-gray-200">
          <button
            onClick={() => setTab("prompts")}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer ${
              tab === "prompts" ? "border-[#FAFD86] text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            AI Prompts
          </button>
          <button
            onClick={() => setTab("branding")}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer ${
              tab === "branding" ? "border-[#FAFD86] text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Branding
          </button>
          <button
            onClick={() => setTab("metadata")}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer ${
              tab === "metadata" ? "border-[#FAFD86] text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Metadata
          </button>
        </div>
      </header>
      <div className="p-6">
        {tab === "prompts" ? <AIPromptsTab /> : tab === "branding" ? <BrandingTab /> : <MetadataTab />}
      </div>
    </>
  );
}
