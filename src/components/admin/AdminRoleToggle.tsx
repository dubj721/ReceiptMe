"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  userId: string;
  isAdmin: boolean;
  isSelf: boolean;
}

export default function AdminRoleToggle({ userId, isAdmin, isSelf }: Props) {
  const router  = useRouter();
  const [loading,  setLoading]  = useState(false);
  const [confirm,  setConfirm]  = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (isSelf) return null; // Can't change your own status

  async function apply() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_admin: !isAdmin }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error ?? "Something went wrong.");
      } else {
        router.refresh();
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setLoading(false);
      setConfirm(false);
    }
  }

  // ── Confirmation prompt ────────────────────────────────────────────────────
  if (confirm) {
    return (
      <div
        className="p-4 rounded-2xl space-y-3"
        style={{
          background: isAdmin
            ? "linear-gradient(135deg, rgb(70,10,10) 0%, rgb(90,16,16) 100%)"
            : "linear-gradient(135deg, rgb(4,40,28) 0%, rgb(6,56,38) 100%)",
          border: isAdmin
            ? "1px solid rgba(239,68,68,0.3)"
            : "1px solid rgba(34,197,94,0.3)",
        }}>
        <p className="text-sm font-semibold text-white">
          {isAdmin ? "Revoke admin access?" : "Grant admin access?"}
        </p>
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
          {isAdmin
            ? "This user will no longer be able to access the admin panel."
            : "This user will have full access to the admin panel, including all user data."}
        </p>
        {errorMsg && (
          <p className="text-xs font-semibold text-red-400">{errorMsg}</p>
        )}
        <div className="flex gap-2">
          <button
            onClick={apply}
            disabled={loading}
            className="flex-1 py-2 rounded-xl text-xs font-bold transition-opacity disabled:opacity-50"
            style={{
              background: isAdmin ? "#ef4444" : "#22c55e",
              color: "#fff",
            }}>
            {loading ? "Saving…" : "Confirm"}
          </button>
          <button
            onClick={() => { setConfirm(false); setErrorMsg(null); }}
            disabled={loading}
            className="flex-1 py-2 rounded-xl text-xs font-semibold transition-opacity disabled:opacity-50"
            style={{
              background: "rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.6)",
            }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Default button ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-1.5">
      {errorMsg && (
        <p className="text-xs font-semibold text-red-400">{errorMsg}</p>
      )}
      <button
        onClick={() => setConfirm(true)}
        className="w-full py-2.5 rounded-xl text-xs font-bold transition-opacity hover:opacity-80"
        style={isAdmin
          ? {
              background: "rgba(239,68,68,0.12)",
              color: "#f87171",
              border: "1px solid rgba(239,68,68,0.3)",
            }
          : {
              background: "rgba(34,197,94,0.12)",
              color: "#4ade80",
              border: "1px solid rgba(34,197,94,0.3)",
            }
        }>
        {isAdmin ? "Revoke Admin Access" : "Grant Admin Access"}
      </button>
    </div>
  );
}
