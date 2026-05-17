import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";

export default async function AdminUsersPage() {
  const admin = createAdminClient();
  const { data: users } = await admin.from("users").select("*").order("created_at", { ascending: false });

  const enriched = await Promise.all((users ?? []).map(async (u: any) => {
    const [
      { count: receiptCount },
      { count: overdueCount },
      { count: exportCount },
      { data: lastEvent },
    ] = await Promise.all([
      admin.from("receipts").select("*", { count: "exact", head: true }).eq("user_id", u.id),
      admin.from("receipts").select("*", { count: "exact", head: true }).eq("user_id", u.id).eq("status", "overdue_flagged"),
      admin.from("events").select("*", { count: "exact", head: true }).eq("user_id", u.id).eq("event_type", "pdf_exported"),
      admin.from("events").select("created_at").eq("user_id", u.id).order("created_at", { ascending: false }).limit(1),
    ]);
    const lastActive = lastEvent?.[0]?.created_at ?? u.created_at;
    const daysSince  = Math.floor((Date.now() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24));
    return { ...u, receiptCount: receiptCount ?? 0, overdueCount: overdueCount ?? 0, exportCount: exportCount ?? 0, daysSince };
  }));

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white">Users</h1>
        <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
          {enriched.length} total beta users
        </p>
      </div>

      <div
        className="overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgb(10,44,68) 0%, rgb(16,62,92) 100%)",
          border: "1px solid rgba(0,214,242,0.15)",
          borderRadius: 16,
        }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {["User","Receipts","Overdue","Exports","Last Active","Role",""].map(h => (
                  <th key={h}
                    className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide"
                    style={{ color: "rgba(255,255,255,0.35)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {enriched.map((u: any) => (
                <tr
                  key={u.id}
                  className="admin-row"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>

                  {/* User */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(0,214,242,0.15)", border: "1px solid rgba(0,214,242,0.25)" }}>
                        <span className="text-xs font-bold" style={{ color: "#00D6F2" }}>
                          {u.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-white text-xs">{u.name}</p>
                        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>{u.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Receipts */}
                  <td className="px-4 py-3 text-center text-sm font-semibold text-white">{u.receiptCount}</td>

                  {/* Overdue */}
                  <td className="px-4 py-3 text-center">
                    {u.overdueCount > 0
                      ? <span className="text-xs font-semibold text-red-400">{u.overdueCount}</span>
                      : <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>—</span>}
                  </td>

                  {/* Exports */}
                  <td className="px-4 py-3 text-center text-sm font-semibold text-white">{u.exportCount}</td>

                  {/* Last Active */}
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs font-medium"
                      style={{ color: u.daysSince > 7 ? "#fbbf24" : "#4ade80" }}>
                      {u.daysSince === 0 ? "Today" : u.daysSince === 1 ? "Yesterday" : `${u.daysSince}d ago`}
                    </span>
                  </td>

                  {/* Role */}
                  <td className="px-4 py-3 text-center">
                    {u.is_admin
                      ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(0,214,242,0.15)", color: "#00D6F2", border: "1px solid rgba(0,214,242,0.3)" }}>
                          Admin
                        </span>
                      : <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" }}>
                          User
                        </span>
                    }
                  </td>

                  {/* Detail link */}
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={"/admin/users/" + u.id}
                      className="text-[11px] font-semibold hover:opacity-80 transition-opacity"
                      style={{ color: "#00D6F2" }}>
                      Details →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
