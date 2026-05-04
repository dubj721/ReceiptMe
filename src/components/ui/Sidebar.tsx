"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/track";
import type { User } from "@/types";

const nav = [
  { href: "/home",    label: "Home",           color: "text-brand-cyan" },
  { href: "/packets", label: "Packets",         color: "text-brand-cyan" },
  { href: "/capture", label: "Add Receipt",     color: "text-brand-cyan" },
  { href: "/archive", label: "Overdue Archive", color: "text-brand-pink" },
];

export default function Sidebar({ profile }: { profile: (User & { is_admin?: boolean }) | null }) {
  const pathname = usePathname();
  const router   = useRouter();

  const [fbOpen, setFbOpen]         = useState(false);
  const [rating, setRating]         = useState(0);
  const [hover, setHover]           = useState(0);
  const [comment, setComment]       = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]             = useState(false);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  function openFeedback() {
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

        <div className="border-t border-white/10 pt-4 mt-4 space-y-0.5">
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
          <button
            onClick={openFeedback}
            className="w-full text-left px-3 py-2 text-white/40 hover:text-white/70 text-xs transition-colors">
            Leave Feedback
          </button>
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
