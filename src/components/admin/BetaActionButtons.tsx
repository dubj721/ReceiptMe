"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BetaActionButtons({ userId, currentStatus }: { userId: string; currentStatus: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approved" | "denied" | null>(null);

  async function updateStatus(status: "approved" | "denied") {
    setLoading(status);
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ beta_status: status }),
      });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  if (currentStatus === "approved") {
    return (
      <div className="flex items-center gap-2">
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: "rgba(74,222,128,0.12)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.25)" }}>
          Approved
        </span>
        <button
          onClick={() => updateStatus("denied")}
          disabled={!!loading}
          className="text-[10px] font-semibold px-2 py-0.5 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
          {loading === "denied" ? "…" : "Revoke"}
        </button>
      </div>
    );
  }

  if (currentStatus === "denied") {
    return (
      <div className="flex items-center gap-2">
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}>
          Denied
        </span>
        <button
          onClick={() => updateStatus("approved")}
          disabled={!!loading}
          className="text-[10px] font-semibold px-2 py-0.5 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)" }}>
          {loading === "approved" ? "…" : "Approve"}
        </button>
      </div>
    );
  }

  // pending
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => updateStatus("approved")}
        disabled={!!loading}
        className="text-[10px] font-bold px-2.5 py-1 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-40"
        style={{ background: "rgba(0,214,242,0.15)", color: "#00D6F2", border: "1px solid rgba(0,214,242,0.3)" }}>
        {loading === "approved" ? "…" : "Approve"}
      </button>
      <button
        onClick={() => updateStatus("denied")}
        disabled={!!loading}
        className="text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-40"
        style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
        {loading === "denied" ? "…" : "Deny"}
      </button>
    </div>
  );
}
