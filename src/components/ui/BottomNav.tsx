"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BatchCapture from "@/components/capture/BatchCapture";

const INACTIVE = "rgba(255,255,255,0.38)";
const CYAN     = "#00D6F2";
const RED      = "#FF0069";

export default function BottomNav() {
  const pathname  = usePathname();
  const [showCam, setShowCam] = useState(false);

  const homeActive    = pathname === "/home" || pathname === "/";
  const packetsActive = pathname === "/packets";
  const archiveActive = pathname === "/archive";
  const addActive     = pathname === "/capture";

  return (
    <>
      {/*
        Outer wrapper is position:relative so the floating FAB can sit at
        top:0 with transform:translateY(-50%), floating half above the bar.
        overflow:visible (default) lets it paint outside the box.
      */}
      <div
        className="relative"
        style={{
          background: "rgba(2, 12, 21, 0.97)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}>

        {/* ── Floating Camera FAB ─────────────────────────────────────────── */}
        <button
          onClick={() => setShowCam(true)}
          aria-label="Batch capture"
          className="absolute active:scale-90 transition-transform"
          style={{
            top: 0,
            left: "50%",
            transform: "translate(-50%, -52%)",
            width: 58,
            height: 58,
            borderRadius: "50%",
            background: "linear-gradient(145deg, #00c4e0 0%, #00D6F2 100%)",
            boxShadow: "0 4px 22px rgba(0,214,242,0.5), 0 2px 8px rgba(0,0,0,0.5)",
            border: "2.5px solid rgba(2,12,21,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
          }}>
          <svg width="24" height="24" viewBox="0 0 22 22" fill="none">
            <path d="M2 8a2 2 0 012-2h1.5l1.5-2h7l1.5 2H17a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V8z"
              stroke="#00283C" strokeWidth="1.6" strokeLinejoin="round"/>
            <circle cx="11" cy="12" r="3" stroke="#00283C" strokeWidth="1.6"/>
          </svg>
        </button>

        {/* ── Nav items ───────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-around px-2"
          style={{
            paddingTop: 10,
            paddingBottom: "max(20px, env(safe-area-inset-bottom, 20px))",
          }}>

          {/* Home */}
          <Link href="/home" className="flex flex-col items-center gap-1 min-w-[54px]">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M3 9.5L11 3l8 6.5V19a1 1 0 01-1 1H14v-5H8v5H4a1 1 0 01-1-1V9.5z"
                fill={homeActive ? CYAN : "none"}
                stroke={homeActive ? CYAN : INACTIVE} strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
            <span className="text-[10px] font-semibold"
              style={{ color: homeActive ? CYAN : INACTIVE }}>Home</span>
          </Link>

          {/* Packets */}
          <Link href="/packets" className="flex flex-col items-center gap-1 min-w-[54px]">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect x="3" y="3" width="7" height="7" rx="2"
                fill={packetsActive ? CYAN : "none"}
                stroke={packetsActive ? CYAN : INACTIVE} strokeWidth="1.5"/>
              <rect x="12" y="3" width="7" height="7" rx="2"
                fill="none" stroke={packetsActive ? CYAN : INACTIVE} strokeWidth="1.5"/>
              <rect x="3" y="12" width="7" height="7" rx="2"
                fill="none" stroke={packetsActive ? CYAN : INACTIVE} strokeWidth="1.5"/>
              <rect x="12" y="12" width="7" height="7" rx="2"
                fill="none" stroke={packetsActive ? CYAN : INACTIVE} strokeWidth="1.5"/>
            </svg>
            <span className="text-[10px] font-semibold"
              style={{ color: packetsActive ? CYAN : INACTIVE }}>Packets</span>
          </Link>

          {/* Spacer so FAB doesn't overlap text */}
          <div style={{ width: 58, flexShrink: 0 }} aria-hidden />

          {/* Archive */}
          <Link href="/archive" className="flex flex-col items-center gap-1 min-w-[54px]">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect x="3" y="7" width="16" height="12" rx="2"
                stroke={archiveActive ? RED : INACTIVE} strokeWidth="1.5"/>
              <path d="M3 10h16" stroke={archiveActive ? RED : INACTIVE} strokeWidth="1.5"/>
              <path d="M7 3h8" stroke={archiveActive ? RED : INACTIVE} strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M8.5 14.5h5" stroke={archiveActive ? RED : INACTIVE} strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span className="text-[10px] font-semibold"
              style={{ color: archiveActive ? RED : INACTIVE }}>Archive</span>
          </Link>

          {/* Add */}
          <Link href="/capture" className="flex flex-col items-center gap-1 min-w-[54px]">
            <svg width="22" height="22" viewBox="0 0 22 22" fill={addActive ? CYAN : "none"}>
              <rect x="3" y="3" width="16" height="16" rx="3"
                stroke={addActive ? CYAN : INACTIVE} strokeWidth="1.5"/>
              <path d="M11 7v8M7 11h8"
                stroke={addActive ? CYAN : INACTIVE} strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span className="text-[10px] font-semibold"
              style={{ color: addActive ? CYAN : INACTIVE }}>Add</span>
          </Link>

        </div>
      </div>

      {showCam && <BatchCapture onClose={() => setShowCam(false)} />}
    </>
  );
}
