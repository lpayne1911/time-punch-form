"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Mobile-only bottom tab bar (hidden on desktop via CSS).
 * Five primary destinations; advanced items live under Profile on mobile.
 */
const TABS = [
  { href: "/discover", label: "Discover", icon: "discover" },
  { href: "/likes", label: "Likes", icon: "likes" },
  { href: "/matches", label: "Matches", icon: "matches" },
  { href: "/events", label: "Events", icon: "events" },
  { href: "/profile", label: "Profile", icon: "profile" },
] as const;

function Icon({ name }: { name: string }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
  };
  switch (name) {
    case "discover":
      return (
        <svg {...common}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
      );
    case "likes":
      return (
        <svg {...common}><path d="M12 20s-7-4.6-7-9.6A3.9 3.9 0 0 1 12 7a3.9 3.9 0 0 1 7 3.4C19 15.4 12 20 12 20Z" /></svg>
      );
    case "matches":
      return (
        <svg {...common}><path d="M21 11.5a8 8 0 0 1-11.6 7.1L4 20l1.4-5A8 8 0 1 1 21 11.5Z" /></svg>
      );
    case "events":
      return (
        <svg {...common}><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M4 10h16M8 3v4M16 3v4" /></svg>
      );
    case "profile":
      return (
        <svg {...common}><circle cx="12" cy="8" r="3.4" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>
      );
    default:
      return null;
  }
}

export default function BottomNav() {
  const pathname = usePathname() || "";
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {TABS.map((t) => {
        const active = pathname === t.href || pathname.startsWith(t.href + "/");
        return (
          <Link key={t.href} href={t.href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
            <Icon name={t.icon} />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
