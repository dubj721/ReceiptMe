"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/track";

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
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
      setTimeout(() => { setOpen(false); setDone(false); setRating(0); setComment(""); }, 1800);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Floating button — shown above bottom nav */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-30 flex items-center gap-2 px-3.5 py-2 rounded-full
          bg-brand-navy border border-brand-cyan/30 shadow-lg text-brand-cyan text-xs font-semibold
          active:scale-95 transition-transform md:bottom-8">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <path d="M2 2h12v9H9l-3 3v-3H2V2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
          <path d="M5 6h6M5 8.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        Feedback
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
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
                  <button onClick={() => setOpen(false)}
                    className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2 2l8 8M10 2L2 10" stroke="#374151" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>

                <p className="text-xs text-gray-500 mb-3">How is the app working for you?</p>

                {/* Star rating */}
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
                  onClick={submit}
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
