"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/types";

const titles: Record<string, string> = {
  "/home":    "Home",
  "/packets": "Packets",
  "/capture": "Add Receipt",
  "/archive": "Overdue Archive",
};

export default function TopBar({ profile }: { profile: User | null }) {
  const pathname = usePathname();
  const router   = useRouter();
  const title    = titles[pathname] ?? "Receipt Manager";
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="bg-brand-navy px-4 pt-12 pb-4">
      <p className="text-brand-cyan text-[10px] font-bold uppercase tracking-widest mb-0.5">
        Insight Global
      </p>
      <div className="flex items-center justify-between">
        <h1 className="text-white text-xl font-bold">{title}</h1>
        {profile && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setOpen(o => !o)}
              className="w-9 h-9 rounded-full bg-brand-cyan/20 border border-brand-cyan/30 flex items-center justify-center">
              <span className="text-brand-cyan text-sm font-bold">
                {profile.name?.charAt(0).toUpperCase()}
              </span>
            </button>

            {open && (
              <div className="absolute right-0 top-11 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <p className="text-xs font-bold text-gray-900 truncate">{profile.name}</p>
                  <p className="text-[10px] text-gray-400 truncate mt-0.5">{profile.email}</p>
                </div>
                <button
                  onClick={() => { setOpen(false); router.push("/settings"); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <circle cx="7.5" cy="5" r="2.5" stroke="#6b7280" strokeWidth="1.3"/>
                    <path d="M2.5 13c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5" stroke="#6b7280" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  Account Settings
                </button>
                <button
                  onClick={signOut}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors border-t border-gray-100">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d="M5.5 2.5H3a1 1 0 00-1 1v8a1 1 0 001 1h2.5" stroke="#ef4444" strokeWidth="1.3" strokeLinecap="round"/>
                    <path d="M10 10.5l3-3-3-3M13 7.5H6" stroke="#ef4444" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
