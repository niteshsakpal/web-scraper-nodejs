/**
 * Branding Profiles — CRUD with localStorage persistence
 *
 * Each profile stores a name, logo (as data-URL or path), and three colors.
 * One profile is marked "active" and drives the site-wide branding.
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

/* ── Helpers ── */

function readProfiles(): BrandingProfile[] {
  if (typeof window === "undefined") return [DEFAULT_PROFILE];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as BrandingProfile[];
      return parsed.length > 0 ? parsed : [DEFAULT_PROFILE];
    }
  } catch {
    /* ignore */
  }
  return [DEFAULT_PROFILE];
}

function writeProfiles(profiles: BrandingProfile[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  } catch {
    /* ignore */
  }
}

/* ── Public API ── */

export function getProfiles(): BrandingProfile[] {
  return readProfiles();
}

export function getActiveProfileId(): string {
  if (typeof window === "undefined") return DEFAULT_PROFILE.id;
  return localStorage.getItem(ACTIVE_KEY) ?? DEFAULT_PROFILE.id;
}

export function getActiveProfile(): BrandingProfile {
  const profiles = readProfiles();
  const activeId = getActiveProfileId();
  return profiles.find((p) => p.id === activeId) ?? profiles[0] ?? DEFAULT_PROFILE;
}

export function setActiveProfileId(id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_KEY, id);
  // Dispatch a custom event so the Sidebar can react in real-time
  window.dispatchEvent(new CustomEvent("branding-changed"));
}

export function saveProfile(profile: BrandingProfile) {
  const profiles = readProfiles();
  const idx = profiles.findIndex((p) => p.id === profile.id);
  if (idx >= 0) {
    profiles[idx] = profile;
  } else {
    profiles.push(profile);
  }
  writeProfiles(profiles);
  // If this is the active profile, notify listeners
  if (profile.id === getActiveProfileId()) {
    window.dispatchEvent(new CustomEvent("branding-changed"));
  }
}

export function deleteProfile(id: string) {
  let profiles = readProfiles();
  profiles = profiles.filter((p) => p.id !== id);
  if (profiles.length === 0) profiles = [DEFAULT_PROFILE];
  writeProfiles(profiles);
  // If deleted profile was active, switch to first
  if (getActiveProfileId() === id) {
    setActiveProfileId(profiles[0].id);
  }
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
