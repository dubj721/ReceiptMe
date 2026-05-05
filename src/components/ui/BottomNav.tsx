"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BatchCapture from "@/components/capture/BatchCapture";

const INACTIVE = "rgba(255,255,255,0.38)";

const navItems = [
  {
    href: "/home",
    label: "Home",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M3 9.5L11 3l8 6.5V19a1 1 0 01-1 1H14v-5H8v5H4a1 1 0 01-1-1V9.5z"
          fill={active ? "#00D6F2" : "none"}
          stroke={active ? "#00D6F2" : INACTIVE} strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: "/packets",
    label: "Packets",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="3" y="3" width="7" height="7" rx="2"
          fill={active ? "#00D6F2" : "none"}
          stroke={active ? "#00D6F2" : INACTIVE} strokeWidth="1.5"/>
        <rect x="12" y="3" width="7" height="7" rx="2"
          fill="none" stroke={active ? "#00D6F2" : INACTIVE} strokeWidth="1.5"/>
        <rect x="3" y="12" width="7" height="7" rx="2"
          fill="none" stroke={active ? "#00D6F2" : INACTIVE} strokeWidth="1.5"/>
        <rect x="12" y="12" width="7" height="7" rx="2"
          fill="none" stroke={active ? "#00D6F2" : INACTIVE} strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    href: "/archive",
    label: "Archive",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="3" y="7" width="16" height="12" rx="2"
          stroke={active ? "#FF0069" : INACTIVE} strokeWidth="1.5"/>
        <path d="M3 10h16" stroke={active ? "#FF0069" : INACTIVE} strokeWidth="1.5"/>
        <path d="M7 3h8"   stroke={active ? "#FF0069" : INACTIVE} strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M8.5 14.5h5" stroke={active ? "#FF0069" : INACTIVE} strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname  = usePathname();
  const [showCam, setShowCam] = useState(false);

  return (
    <>
      <div
        className="px-4 pt-2"
        style={{
          background: "rgba(2, 12, 21, 0.97)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          paddingBottom: "max(24px, env(safe-area-inset-bottom, 24px))",
        }}>
        <div className="flex items-end justify-around">

          {/* Home */}
          {navItems.slice(0, 1).map(({ href, label, icon }) => {
            const active = pathname === href || pathname === "/";
            return (
              <Link key={href} href={href} className="flex flex-col items-center gap-1 min-w-[54px]">
                {icon(active)}
                <span className="text-[10px] font-semibold"
                  style={{ color: active ? "#00D6F2" : INACTIVE }}>
                  {label}
                </span>
              </Link>
            );
          })}

          {/* Packets */}
          {navItems.slice(1, 2).map(({ href, label, icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} className="flex flex-col items-center gap-1 min-w-[54px]">
                {icon(active)}
                <span className="text-[10px] font-semibold"
                  style={{ color: active ? "#00D6F2" : INACTIVE }}>
                  {label}
                </span>
              </Link>
            );
          })}

          {/* Center camera FAB — cyan so it pops on dark nav */}
          <button
            onClick={() => setShowCam(true)}
            className="flex flex-col items-center gap-1 min-w-[54px]"
            aria-label="Batch capture">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center -mt-5 active:scale-95 transition-transform"
              style={{
                background: "#00D6F2",
                boxShadow: "0 4px 20px rgba(0,214,242,0.4)",
              }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M2 8a2 2 0 012-2h1.5l1.5-2h7l1.5 2H17a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V8z"
                  stroke="#00283C" strokeWidth="1.5" strokeLinejoin="round"/>
                <circle cx="11" cy="12" r="3" stroke="#00283C" strokeWidth="1.5"/>
              </svg>
            </div>
            <span className="text-[10px] font-semibold" style={{ color: INACTIVE }}>Camera</span>
          </button>

          {/* Archive */}
          {navItems.slice(2).map(({ href, label, icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} className="flex flex-col items-center gap-1 min-w-[54px]">
                {icon(active)}
                <span className="text-[10px] font-semibold"
                  style={{ color: active ? "#FF0069" : INACTIVE }}>
                  {label}
                </span>
              </Link>
            );
          })}

          {/* Add (single receipt) */}
          <Link href="/capture" className="flex flex-col items-center gap-1 min-w-[54px]">
            <svg width="22" height="22" viewBox="0 0 22 22"
              fill={pathname === "/capture" ? "#00D6F2" : "none"}>
              <rect x="3" y="3" width="16" height="16" rx="3"
                stroke={pathname === "/capture" ? "#00D6F2" : INACTIVE} strokeWidth="1.5"/>
              <path d="M11 7v8M7 11h8"
                stroke={pathname === "/capture" ? "#00D6F2" : INACTIVE} strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span className="text-[10px] font-semibold"
              style={{ color: pathname === "/capture" ? "#00D6F2" : INACTIVE }}>
              Add
            </span>
          </Link>

        </div>
      </div>

      {/* Batch capture overlay */}
      {showCam && <BatchCapture onClose={() => setShowCam(false)} />}
    </>
  );
}
