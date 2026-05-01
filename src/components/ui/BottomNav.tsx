"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BatchCapture from "@/components/capture/BatchCapture";

const navItems = [
  {
    href: "/home",
    label: "Home",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M3 9.5L11 3l8 6.5V19a1 1 0 01-1 1H14v-5H8v5H4a1 1 0 01-1-1V9.5z"
          fill={active ? "#00D6F2" : "none"}
          stroke={active ? "#00D6F2" : "#9ca3af"} strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: "/packets",
    label: "Packets",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="3" y="3" width="7" height="7" rx="2" fill={active ? "#00D6F2" : "none"}
          stroke={active ? "#00D6F2" : "#9ca3af"} strokeWidth="1.5"/>
        <rect x="12" y="3" width="7" height="7" rx="2" fill="none"
          stroke={active ? "#00D6F2" : "#9ca3af"} strokeWidth="1.5"/>
        <rect x="3" y="12" width="7" height="7" rx="2" fill="none"
          stroke={active ? "#00D6F2" : "#9ca3af"} strokeWidth="1.5"/>
        <rect x="12" y="12" width="7" height="7" rx="2" fill="none"
          stroke={active ? "#00D6F2" : "#9ca3af"} strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    href: "/archive",
    label: "Archive",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="3" y="7" width="16" height="12" rx="2"
          stroke={active ? "#FF0069" : "#9ca3af"} strokeWidth="1.5"/>
        <path d="M3 10h16" stroke={active ? "#FF0069" : "#9ca3af"} strokeWidth="1.5"/>
        <path d="M7 3h8" stroke={active ? "#FF0069" : "#9ca3af"} strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M8.5 14.5h5" stroke={active ? "#FF0069" : "#9ca3af"} strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname   = usePathname();
  const [showCam, setShowCam] = useState(false);

  return (
    <>
      <div className="bg-white border-t border-gray-100 px-4 pb-6 pt-2">
        <div className="flex items-end justify-around">

          {/* Home */}
          {navItems.slice(0, 1).map(({ href, label, icon }) => {
            const active = pathname === href || pathname === "/";
            return (
              <Link key={href} href={href} className="flex flex-col items-center gap-1 min-w-[54px]">
                {icon(active)}
                <span className={`text-[10px] font-semibold ${active ? "text-brand-cyan" : "text-gray-400"}`}>
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
                <span className={`text-[10px] font-semibold ${active ? "text-brand-cyan" : "text-gray-400"}`}>
                  {label}
                </span>
              </Link>
            );
          })}

          {/* Center camera FAB */}
          <button
            onClick={() => setShowCam(true)}
            className="flex flex-col items-center gap-1 min-w-[54px]"
            aria-label="Batch capture">
            <div className="w-12 h-12 rounded-2xl bg-brand-navy flex items-center justify-center -mt-5 shadow-lg
              active:scale-95 transition-transform">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M2 8a2 2 0 012-2h1.5l1.5-2h7l1.5 2H17a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V8z"
                  stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
                <circle cx="11" cy="12" r="3" stroke="white" strokeWidth="1.5"/>
              </svg>
            </div>
            <span className="text-[10px] font-semibold text-gray-400">Camera</span>
          </button>

          {/* Archive */}
          {navItems.slice(2).map(({ href, label, icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} className="flex flex-col items-center gap-1 min-w-[54px]">
                {icon(active)}
                <span className={`text-[10px] font-semibold ${active ? "text-[#FF0069]" : "text-gray-400"}`}>
                  {label}
                </span>
              </Link>
            );
          })}

          {/* Add (single receipt) */}
          <Link href="/capture" className="flex flex-col items-center gap-1 min-w-[54px]">
            <svg width="22" height="22" viewBox="0 0 22 22" fill={pathname === "/capture" ? "#00D6F2" : "none"}>
              <rect x="3" y="3" width="16" height="16" rx="3"
                stroke={pathname === "/capture" ? "#00D6F2" : "#9ca3af"} strokeWidth="1.5"/>
              <path d="M11 7v8M7 11h8"
                stroke={pathname === "/capture" ? "#00D6F2" : "#9ca3af"} strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span className={`text-[10px] font-semibold ${pathname === "/capture" ? "text-brand-cyan" : "text-gray-400"}`}>
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
