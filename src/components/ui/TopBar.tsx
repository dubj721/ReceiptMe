"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/track";
import type { User } from "@/types";

const titles: Record<string, string> = {
  "/home":    "Home",
  "/packets": "Packets",
  "/capture": "Add Receipt",
  "/archive": "Overdue Archive",
};

const ADMIN_ICON = (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <rect x="1.5" y="1.5" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M5 13.5h5M7.5 10.5v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

export default function TopBar({ profile }: { profile: (User & { is_admin?: boolean }) | null }) {
  const pathname = usePathname();
  const router   = useRouter();
  const title    = titles[pathname] ?? "Receipt Manager";

  const [open, setOpen]           = useState(false);
  const [fbOpen, setFbOpen]       = useState(false);
  const [rating, setRating]       = useState(0);
  const [hover, setHover]         = useState(0);
  const [comment, setComment]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]           = useState(false);

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

  function openFeedback() {
    setOpen(false);
    setRating(0);
    setComment("");
    setDone(false);
    setFbOpen(true);
  }

  async function submitFeedback() {
    if (!rating) return;
    setSubmitting(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment, context: "menu" }),
      });
      await trackEvent("feedback_submitted", { rating, context: "menu" });
      setDone(true);
      setTimeout(() => { setFbOpen(false); setDone(false); setRating(0); setComment(""); }, 1800);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
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
                    onClick={openFeedback}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100">
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                      <path d="M2 2h12v9H9l-3 3v-3H2V2z" stroke="#6b7280" strokeWidth="1.4" strokeLinejoin="round"/>
                      <path d="M5 6h6M5 8.5h4" stroke="#6b7280" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                    Leave Feedback
                  </button>
                  {profile?.is_admin && (
                    <button
                      onClick={() => { setOpen(false); router.push("/admin"); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-brand-navy hover:bg-blue-50 transition-colors border-t border-gray-100">
                      <span className="text-brand-navy">{ADMIN_ICON}</span>
                      Switch to Admin View
                    </button>
                  )}
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

      {/* Feedback modal */}
      {fbOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setFbOpen(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6">
            {done ? (
              <div className="text-center py-4">
                <p className="text-3xl mb-2">🙏</p>
                <p className="text-sm font-bold text-gray-900">Thanks for the feedback!</p>
                <p className="text-xs text-gray-400 mt-1">It helps us improve the app.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-bold text-gray-900">Leave Feedback</p>
                  <button onClick={() => setFbOpen(false)}
                    className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2 2l8 8M10 2L2 10" stroke="#374151" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-3">How is the app working for you?</p>
                <div className="flex gap-2 mb-4">
                  {[1,2,3,4,5].map(n => (
                    <button key={n}
                      onClick={() => setRating(n)}
                      onMouseEnter={() => setHover(n)}
                      onMouseLeave={() => setHover(0)}
                      className="text-2xl transition-transform active:scale-90">
                      {n <= (hover || rating) ? "⭐" : "🤍"}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={3}
                  placeholder="Any comments? (optional)"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm
                    text-gray-900 outline-none focus:border-brand-cyan resize-none placeholder:text-gray-400 mb-4"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                />
                <button
                  onClick={submitFeedback}
                  disabled={!rating || submitting}
                  className="w-full py-2.5 rounded-xl bg-brand-navy text-brand-cyan text-sm font-bold
                    hover:opacity-90 transition-opacity disabled:opacity-40">
                  {submitting ? "Submitting..." : "Submit Feedback"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
