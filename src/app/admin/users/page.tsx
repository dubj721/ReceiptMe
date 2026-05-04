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
    const daysSince = Math.floor((Date.now() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24));
    return { ...u, receiptCount: receiptCount ?? 0, overdueCount: overdueCount ?? 0, exportCount: exportCount ?? 0, daysSince };
  }));

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Users</h1>
        <p className="text-sm text-gray-400">{enriched.length} total beta users</p>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["User","Receipts","Overdue","Exports","Last Active","Role",""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {enriched.map((u: any) => (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-navy/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-brand-navy">{u.name?.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-xs">{u.name}</p>
                        <p className="text-[10px] text-gray-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-semibold text-gray-700">{u.receiptCount}</td>
                  <td className="px-4 py-3 text-center">
                    {u.overdueCount > 0
                      ? <span className="text-xs font-semibold text-red-500">{u.overdueCount}</span>
                      : <span className="text-xs text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-semibold text-gray-700">{u.exportCount}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-medium ${u.daysSince > 7 ? "text-yellow-500" : "text-green-600"}`}>
                      {u.daysSince === 0 ? "Today" : u.daysSince === 1 ? "Yesterday" : `${u.daysSince}d ago`}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {u.is_admin
                      ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-navy text-brand-cyan">Admin</span>
                      : <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">User</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={"/admin/users/" + u.id} className="text-[11px] font-semibold text-brand-navy hover:underline">
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
