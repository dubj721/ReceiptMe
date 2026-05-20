"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function PendingPage() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{
        background: "linear-gradient(140deg, #020c15 0%, #041828 55%, #071e30 100%)",
        minHeight: "100dvh",
      }}
    >
      {/* Logo mark */}
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
        style={{
          background: "linear-gradient(135deg, #0a5278 0%, #086a94 100%)",
          border: "1px solid rgba(0,214,242,0.3)",
          boxShadow: "0 8px 32px rgba(0,150,200,0.25)",
        }}
      >
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <rect x="6" y="4" width="20" height="24" rx="3" stroke="#00D6F2" strokeWidth="1.8"/>
          <path d="M10 12h12M10 16h8M10 20h5" stroke="#00D6F2" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-sm p-7 text-center"
        style={{
          background: "linear-gradient(135deg, rgb(10,44,68) 0%, rgb(16,62,92) 100%)",
          border: "1px solid rgba(0,214,242,0.15)",
          borderRadius: 20,
        }}
      >
        {/* Status pill */}
        <div className="flex justify-center mb-5">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
            style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#fbbf24", animation: "pulse 2s infinite" }}
            />
            Access Pending
          </span>
        </div>

        <h1 className="text-xl font-bold text-white mb-2">
          You&apos;re on the list
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
          Your beta access request is under review. You&apos;ll receive an email at your registered address once you&apos;re approved — usually within 24 hours.
        </p>

        <div
          className="mt-5 pt-5 flex flex-col gap-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
        >
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            Questions? Contact{" "}
            <a
              href="mailto:support@insightglobal.com"
              className="underline"
              style={{ color: "rgba(0,214,242,0.7)" }}
            >
              support@insightglobal.com
            </a>
          </p>
          <button
            onClick={handleSignOut}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.5)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
}
