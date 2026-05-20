"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/admin",          label: "Overview"    },
  { href: "/admin/users",    label: "Users"       },
  { href: "/admin/beta",     label: "Beta Access" },
  { href: "/admin/feedback", label: "Feedback"    },
];

const CYAN     = "#00D6F2";
const INACTIVE = "rgba(255,255,255,0.45)";

// ── Sidebar variant (desktop left rail) ────────────────────────────────────
function SidebarNav() {
  const pathname = usePathname();
  const router   = useRouter();

  return (
    <div className="h-full flex flex-col py-8 px-4 w-56" style={{ background: "rgba(2,12,21,0.97)" }}>
      {/* Logo */}
      <div className="mb-8 px-2">
        <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: CYAN }}>
          Admin
        </p>
        <p className="text-white text-lg font-bold leading-tight">Insight Global</p>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-1">
        {NAV.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href}
              className="flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={active
                ? { background: "rgba(0,214,242,0.12)", color: CYAN }
                : { color: INACTIVE }
              }>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Back to user view */}
      <div className="border-t pt-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <button
          onClick={() => router.push("/home")}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          style={{ color: CYAN }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,214,242,0.08)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L4 7l5 5" stroke={CYAN} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          User View
        </button>
      </div>
    </div>
  );
}

// ── Tabs variant (mobile bottom strip) ────────────────────────────────────
function TabsNav() {
  const pathname = usePathname();

  return (
    <div
      className="flex border-t"
      style={{
        borderColor: "rgba(255,255,255,0.08)",
        background: "rgba(2,12,21,0.97)",
      }}>
      {NAV.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link key={href} href={href}
            className="flex-1 py-2.5 text-center text-xs font-semibold transition-colors"
            style={{ color: active ? CYAN : INACTIVE }}>
            {label}
          </Link>
        );
      })}
    </div>
  );
}

export default function AdminNav({ variant }: { variant: "sidebar" | "tabs" }) {
  return variant === "sidebar" ? <SidebarNav /> : <TabsNav />;
}
