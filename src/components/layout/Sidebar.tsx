"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import brandingDefaults from "@/config/branding";
import { fetchActiveProfile, type BrandingProfile } from "@/config/brandingProfiles";

const navItems = [
  {
    href: "/",
    label: "Scrape URL",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
  },
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    href: "/admin",
    label: "Admin",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

/** Hook that returns the active branding profile, re-renders on change */
export function useActiveBranding() {
  const [brand, setBrand] = useState<BrandingProfile | null>(null);

  const refresh = useCallback(() => {
    fetchActiveProfile().then(setBrand);
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener("branding-changed", refresh);
    return () => window.removeEventListener("branding-changed", refresh);
  }, [refresh]);

  // Fallback to static defaults during SSR / before hydration
  if (!brand) {
    return {
      logoUrl: brandingDefaults.logoUrl,
      primaryColor: brandingDefaults.primaryColor,
      headerBg: brandingDefaults.headerBg,
      headerText: brandingDefaults.headerText,
      name: "Synechron",
    };
  }
  return brand;
}

export default function Sidebar() {
  const pathname = usePathname();
  const brand = useActiveBranding();

  return (
    <header
      className="flex items-center px-6 py-3 shadow-lg"
      style={{ backgroundColor: brand.headerBg }}
    >
      {/* Logo */}
      <div className="flex items-center mr-8">
        {brand.logoUrl ? (
          <Image
            src={brand.logoUrl}
            alt={brand.name ?? "Logo"}
            width={120}
            height={28}
            className="h-7 w-auto brightness-0 invert"
            priority
            unoptimized={brand.logoUrl.startsWith("data:")}
          />
        ) : (
          <span className="text-lg font-bold" style={{ color: brand.headerText }}>
            {brand.name}
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex items-center gap-1">
        {navItems.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              style={
                active
                  ? {
                      backgroundColor: `${brand.primaryColor}22`,
                      color: brand.primaryColor,
                    }
                  : {
                      color: `${brand.headerText}B3`,
                    }
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Version pushed right */}
      <div className="ml-auto text-[11px]" style={{ color: `${brand.headerText}66` }}>v0.1.0</div>
    </header>
  );
}
