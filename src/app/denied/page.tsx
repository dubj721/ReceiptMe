"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function DeniedPage() {
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
          background: "rgba(239,68,68,0.1)",
          border: "1px solid rgba(239,68,68,0.25)",
          boxShadow: "0 8px 32px rgba(239,68,68,0.1)",
        }}
      >
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="11" stroke="#f87171" strokeWidth="1.8"/>
          <path d="M12 12l8 8M20 12l-8 8" stroke="#f87171" strokeWidth="1.8" strokeLinecap="round"/>
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
            style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}
          >
            Access Not Approved
          </span>
        </div>

        <h1 className="text-xl font-bold text-white mb-2">
          Access request declined
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
          Your request to join the ReceiptMe beta was not approved at this time. If you believe this is a mistake or would like to appeal, please reach out to your administrator.
        </p>

        <div
          className="mt-5 pt-5 flex flex-col gap-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
        >
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            Need help?{" "}
            <a
              href="mailto:support@insightglobal.com"
              className="underline"
              style={{ color: "rgba(0,214,242,0.7)" }}
            >
              Contact support
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
    </div>
  );
}
