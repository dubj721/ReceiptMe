"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteUserButton({ userId, userName }: { userId: string; userName: string }) {
  const router = useRouter();
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error ?? "Something went wrong.");
      setLoading(false);
      return;
    }
    router.push("/admin/users");
    router.refresh();
  }

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-semibold px-3 py-2 rounded-xl transition-opacity hover:opacity-80"
        style={{
          background: "rgba(239,68,68,0.1)",
          color: "#f87171",
          border: "1px solid rgba(239,68,68,0.25)",
        }}>
        Delete Account
      </button>

      {/* Confirmation modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
          onClick={(e) => { if (e.target === e.currentTarget && !loading) setOpen(false); }}>
          <div
            className="w-full max-w-sm p-6 rounded-2xl"
            style={{
              background: "linear-gradient(135deg, rgb(10,44,68) 0%, rgb(16,62,92) 100%)",
              border: "1px solid rgba(239,68,68,0.3)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
            }}>

            {/* Icon */}
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center mb-4"
              style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 6v4M10 14h.01" stroke="#f87171" strokeWidth="1.8" strokeLinecap="round"/>
                <circle cx="10" cy="10" r="8" stroke="#f87171" strokeWidth="1.6"/>
              </svg>
            </div>

            <p className="text-base font-bold text-white mb-1">Delete account?</p>
            <p className="text-sm mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>
              <span className="font-semibold" style={{ color: "rgba(255,255,255,0.8)" }}>{userName}</span> will be permanently signed out and unable to log in.
            </p>
            <p className="text-xs mb-5" style={{ color: "rgba(255,255,255,0.35)" }}>
              Their receipts, events, and feedback are kept for analytics. This action cannot be undone.
            </p>

            {error && (
              <p className="text-xs mb-4 px-3 py-2 rounded-lg"
                style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}>
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ background: "rgba(239,68,68,0.2)", color: "#f87171", border: "1px solid rgba(239,68,68,0.35)" }}>
                {loading ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
