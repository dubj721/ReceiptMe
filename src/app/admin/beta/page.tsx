import { createAdminClient } from "@/lib/supabase/admin";
import BetaActionButtons from "@/components/admin/BetaActionButtons";
import Link from "next/link";

const CARD = {
  background: "linear-gradient(135deg, rgb(10,44,68) 0%, rgb(16,62,92) 100%)",
  border: "1px solid rgba(0,214,242,0.15)",
  borderRadius: 16,
} as const;

export default async function AdminBetaPage() {
  const admin = createAdminClient();
  const { data: users } = await admin
    .from("users")
    .select("id, name, email, beta_status, created_at, country")
    .order("created_at", { ascending: false });

  const all      = users ?? [];
  const pending  = all.filter((u: any) => u.beta_status === "pending");
  const approved = all.filter((u: any) => u.beta_status === "approved");
  const denied   = all.filter((u: any) => u.beta_status === "denied");

  const statCards = [
    { label: "Pending",  value: pending.length,  color: "#fbbf24", bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.2)"  },
    { label: "Approved", value: approved.length, color: "#4ade80", bg: "rgba(74,222,128,0.1)", border: "rgba(74,222,128,0.2)" },
    { label: "Denied",   value: denied.length,   color: "#f87171", bg: "rgba(239,68,68,0.1)",  border: "rgba(239,68,68,0.2)"  },
    { label: "Total",    value: all.length,       color: "#00D6F2", bg: "rgba(0,214,242,0.1)",  border: "rgba(0,214,242,0.2)"  },
  ];

  // Show pending first, then approved, then denied
  const sorted = [...pending, ...approved, ...denied];

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Beta Access</h1>
        <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
          Review and manage user access requests
        </p>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-4 gap-3">
        {statCards.map(({ label, value, color, bg, border }) => (
          <div key={label} className="p-4 text-center" style={CARD}>
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-1"
               style={{ color: "rgba(255,255,255,0.4)" }}>
              {label}
            </p>
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Pending queue callout */}
      {pending.length > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
          <span className="text-sm" style={{ color: "#fbbf24" }}>⏳</span>
          <p className="text-sm font-medium" style={{ color: "#fbbf24" }}>
            {pending.length} user{pending.length !== 1 ? "s" : ""} waiting for review
          </p>
        </div>
      )}

      {/* Users table */}
      <div className="overflow-hidden" style={CARD}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {["User", "Country", "Joined", "Status", "Actions"].map(h => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide"
                    style={{ color: "rgba(255,255,255,0.35)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((u: any) => (
                <tr
                  key={u.id}
                  className="admin-row"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>

                  {/* User */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(0,214,242,0.15)", border: "1px solid rgba(0,214,242,0.25)" }}>
                        <span className="text-xs font-bold" style={{ color: "#00D6F2" }}>
                          {u.name?.charAt(0).toUpperCase() ?? "?"}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-white text-xs">{u.name}</p>
                        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>{u.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Country */}
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-white">{u.country ?? "—"}</span>
                  </td>

                  {/* Joined */}
                  <td className="px-4 py-3">
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </td>

                  {/* Status badge */}
                  <td className="px-4 py-3">
                    {u.beta_status === "pending" && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" }}>
                        Pending
                      </span>
                    )}
                    {u.beta_status === "approved" && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(74,222,128,0.12)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.25)" }}>
                        Approved
                      </span>
                    )}
                    {u.beta_status === "denied" && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}>
                        Denied
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <BetaActionButtons userId={u.id} currentStatus={u.beta_status} />
                  </td>
                </tr>
              ))}

              {sorted.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-xs"
                    style={{ color: "rgba(255,255,255,0.3)" }}>
                    No users yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
