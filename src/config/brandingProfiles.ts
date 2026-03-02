/**
 * Branding Profiles — CRUD with server-side persistence
 *
 * Each profile stores a name, logo (as data-URL or path), and three colors.
 * One profile is marked "active" and drives the site-wide branding.
 *
 * Server API is the source of truth; localStorage is used as a fast cache.
 */

export interface BrandingProfile {
  id: string;
  name: string;
  /** data-URL (uploaded) or path under /public */
  logoUrl: string;
  primaryColor: string;
  headerBg: string;
  headerText: string;
  createdAt: string; // ISO
}

const STORAGE_KEY = "rhs_branding_profiles";
const ACTIVE_KEY = "rhs_branding_active";

/* ── Default Synechron profile ── */
const DEFAULT_PROFILE: BrandingProfile = {
  id: "default-synechron",
  name: "Synechron",
  logoUrl: "/branding/synechron-logo.svg",
  primaryColor: "#FAFD86",
  headerBg: "#002535",
  headerText: "#ffffff",
  createdAt: new Date("2026-02-20").toISOString(),
};

/* ── localStorage cache helpers (fast reads) ── */

function cacheProfiles(profiles: BrandingProfile[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles)); } catch { /* */ }
}

function cacheActiveId(id: string) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(ACTIVE_KEY, id); } catch { /* */ }
}

function readCachedProfiles(): BrandingProfile[] {
  if (typeof window === "undefined") return [DEFAULT_PROFILE];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as BrandingProfile[];
      if (parsed.length > 0) return parsed;
    }
  } catch { /* */ }
  return [DEFAULT_PROFILE];
}

function readCachedActiveId(): string {
  if (typeof window === "undefined") return DEFAULT_PROFILE.id;
  return localStorage.getItem(ACTIVE_KEY) ?? DEFAULT_PROFILE.id;
}

/* ── Async server-backed API (source of truth) ── */

export async function fetchProfiles(): Promise<BrandingProfile[]> {
  try {
    const res = await fetch("/api/branding");
    const data = await res.json();
    const profiles: BrandingProfile[] = data.profiles ?? [DEFAULT_PROFILE];
    cacheProfiles(profiles);
    return profiles;
  } catch {
    return readCachedProfiles();
  }
}

export async function fetchActiveProfileId(): Promise<string> {
  try {
    const res = await fetch("/api/branding/active");
    const data = await res.json();
    const id: string = data.activeId ?? DEFAULT_PROFILE.id;
    cacheActiveId(id);
    return id;
  } catch {
    return readCachedActiveId();
  }
}

export async function fetchActiveProfile(): Promise<BrandingProfile> {
  const [profiles, activeId] = await Promise.all([
    fetchProfiles(),
    fetchActiveProfileId(),
  ]);
  return profiles.find((p) => p.id === activeId) ?? profiles[0] ?? DEFAULT_PROFILE;
}

export async function serverSetActiveProfileId(id: string) {
  cacheActiveId(id);
  try {
    await fetch("/api/branding/active", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  } catch { /* */ }
  window.dispatchEvent(new CustomEvent("branding-changed"));
}

export async function serverSaveProfile(profile: BrandingProfile) {
  // Update local cache immediately for fast UI
  const profiles = readCachedProfiles();
  const idx = profiles.findIndex((p) => p.id === profile.id);
  if (idx >= 0) profiles[idx] = profile;
  else profiles.push(profile);
  cacheProfiles(profiles);

  // Persist to server
  try {
    await fetch("/api/branding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
  } catch { /* */ }

  if (profile.id === readCachedActiveId()) {
    window.dispatchEvent(new CustomEvent("branding-changed"));
  }
}

export async function serverDeleteProfile(id: string) {
  try {
    const res = await fetch(`/api/branding/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.profiles) cacheProfiles(data.profiles);
    if (data.activeId) cacheActiveId(data.activeId);
  } catch {
    // Fallback: remove from cache
    let profiles = readCachedProfiles().filter((p) => p.id !== id);
    if (profiles.length === 0) profiles = [DEFAULT_PROFILE];
    cacheProfiles(profiles);
    if (readCachedActiveId() === id) cacheActiveId(profiles[0].id);
  }
  window.dispatchEvent(new CustomEvent("branding-changed"));
}

/* ── Sync helpers (used for SSR fallback and fast initial reads) ── */

export function getProfiles(): BrandingProfile[] {
  return readCachedProfiles();
}

export function getActiveProfileId(): string {
  return readCachedActiveId();
}

export function getActiveProfile(): BrandingProfile {
  const profiles = readCachedProfiles();
  const activeId = readCachedActiveId();
  return profiles.find((p) => p.id === activeId) ?? profiles[0] ?? DEFAULT_PROFILE;
}

export function createBlankProfile(): BrandingProfile {
  return {
    id: `profile-${Date.now()}`,
    name: "",
    logoUrl: "",
    primaryColor: "#3B82F6",
    headerBg: "#1a1a2e",
    headerText: "#ffffff",
    createdAt: new Date().toISOString(),
  };
}
