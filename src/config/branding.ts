/**
 * Branding Configuration
 *
 * This file centralizes all branding settings (logo, colors, app name).
 * In the future, these values will be loaded from an admin panel / API.
 * For now, they are hardcoded defaults.
 */

export interface BrandingConfig {
  /** Application display name */
  appName: string;
  /** Tagline shown below the app name */
  tagline: string;
  /** Path to the company logo (relative to /public) */
  logoUrl: string;
  /** Primary brand color (hex) */
  primaryColor: string;
  /** Text color to use on primary-colored backgrounds */
  primaryTextColor: string;
  /** Sidebar accent color for active items */
  sidebarActiveColor: string;
  /** Sidebar active text color */
  sidebarActiveTextColor: string;
  /** Header background color */
  headerBg: string;
  /** Header text color */
  headerText: string;
}

const branding: BrandingConfig = {
  appName: "Regulatory Horizon Scraper",
  tagline: "AI-powered regulatory document scraping and analysis",
  logoUrl: "/branding/synechron-logo.svg",
  primaryColor: "#FAFD86",
  primaryTextColor: "#1a1a2e",
  sidebarActiveColor: "rgba(250, 253, 134, 0.15)",
  sidebarActiveTextColor: "#FAFD86",
  /** Dark navy for header bar */
  headerBg: "#002535",
  headerText: "#ffffff",
};

export default branding;
