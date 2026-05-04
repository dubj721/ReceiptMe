"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/types";

const nav = [
  { href: "/home",    label: "Home",          color: "text-brand-cyan" },
  { href: "/packets", label: "Packets",        color: "text-brand-cyan" },
  { href: "/capture", label: "Add Receipt",    color: "text-brand-cyan" },
  { href: "/archive", label: "Overdue Archive",color: "text-brand-pink" },
];

export default function Sidebar({ profile }: { profile: (User & { is_admin?: boolean }) | null }) {
  const pathname = usePathname();
  const router   = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="h-full bg-brand-navy flex flex-col py-8 px-4 w-56">
      <div className="mb-10 px-2">
        <p className="text-brand-cyan text-[10px] font-bold uppercase tracking-widest mb-1">
          Insight Global
        </p>
        <p className="text-white text-lg font-bold leading-tight">Receipt Manager</p>
      </div>

      <nav className="flex-1 space-y-1">
        {nav.map(({ href, label, color }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                ${active ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80 hover:bg-white/5"}`}>
              <span className={active ? color : ""}>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 pt-4 mt-4">
        {profile && (
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-brand-cyan/20 flex items-center justify-center flex-shrink-0">
              <span className="text-brand-cyan text-xs font-bold">
                {profile.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-medium truncate">{profile.name}</p>
              <p className="text-white/40 text-[10px] truncate">{profile.email}</p>
            </div>
          </div>
        )}
        <Link href="/settings"
          className="w-full text-left px-3 py-2 text-white/40 hover:text-white/70 text-xs transition-colors block">
          Account Settings
        </Link>
        {profile?.is_admin && (
          <button
            onClick={() => router.push("/admin")}
            className="w-full text-left px-3 py-2 text-brand-cyan hover:text-white text-xs font-semibold transition-colors flex items-center gap-2">
            <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
              <rect x="1.5" y="1.5" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M5 13.5h5M7.5 10.5v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Switch to Admin View
          </button>
        )}
        <button onClick={signOut}
          className="w-full text-left px-3 py-2 text-white/40 hover:text-white/70 text-xs transition-colors">
          Sign out
        </button>
      </div>
    </div>
  );
}
