import { createClient } from "@/lib/supabase/server";
import { daysOld, isPolicyApplicable } from "@/types";
import type { Receipt, User } from "@/types";
import Link from "next/link";
import RecentActivity from "@/components/home/RecentActivity";
import Greeting from "@/components/home/Greeting";

function StatCard({ label, value, sub, accent }: {
  label: string; value: string; sub: string; accent: string;
}) {
  return (
    <div className={`flex-1 rounded-2xl p-4 border ${accent}`}>
      <p className="text-xs font-semibold text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
      <p className="text-[10px] text-gray-400 mt-1">{sub}</p>
    </div>
  );
}

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  const typedProfile = profile as User | null;

  const firstName = typedProfile?.name?.split(" ")[0] ?? "there";
  const now = new Date();

  const { data: allReceipts } = await supabase
    .from("receipts")
    .select("*, missing_receipt_form:missing_receipt_forms(*)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const receipts = (allReceipts ?? []) as Receipt[];

  // This-month receipts
  const monthReceipts = receipts.filter(r => {
    const d = new Date(r.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthTotal = monthReceipts.reduce((s, r) => s + Number(r.amount), 0);

  // Expiring soon (US policy ≥ 45 days)
  const expiringSoon = isPolicyApplicable((typedProfile?.country ?? "US") as "US" | "CA")
    ? receipts.filter(r => daysOld(r.transaction_date) >= 45).length
    : 0;

  // Pending forms
  const pendingForms = receipts.filter(
    r => r.source === "bank_transaction" && !r.missing_receipt_form?.completed_at
  ).length;

  const recent = receipts.slice(0, 5);

  return (
    <div className="px-4 pt-2 md:pt-0 pb-8 space-y-6">

      {/* Greeting */}
      <Greeting firstName={firstName} />

      {/* Alert banners */}
      {expiringSoon > 0 && (
        <Link href="/archive"
          className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-50 border border-red-200 block">
          <span className="text-lg">⚠️</span>
          <div className="flex-1">
            <p className="text-xs font-bold text-red-600">
              {expiringSoon} receipt{expiringSoon > 1 ? "s" : ""} expiring soon
            </p>
            <p className="text-[10px] text-red-400">Tap to view overdue archive →</p>
          </div>
        </Link>
      )}

      {pendingForms > 0 && (
        <Link href="/packets"
          className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-yellow-50 border border-yellow-200 block">
          <span className="text-lg">📋</span>
          <div className="flex-1">
            <p className="text-xs font-bold text-yellow-700">
              {pendingForms} missing receipt form{pendingForms > 1 ? "s" : ""} need attention
            </p>
            <p className="text-[10px] text-yellow-500">Tap to complete →</p>
          </div>
        </Link>
      )}

      {/* Stats */}
      <div className="flex gap-3">
        <StatCard
          label="This month"
          value={`${monthReceipts.length}`}
          sub="receipts submitted"
          accent="border-brand-cyan/30 bg-brand-cyan/5"
        />
        <StatCard
          label="Total spent"
          value={`$${monthTotal.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          sub="this month"
          accent="border-gray-200 bg-white"
        />
      </div>

      {/* Quick actions */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Quick Actions</p>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/capture"
            className="flex flex-col items-center gap-2 py-5 rounded-2xl bg-white border border-gray-200 text-gray-700 text-center hover:border-brand-cyan transition-colors">
            <span className="text-2xl">📷</span>
            <span className="text-xs font-semibold">Add Receipt</span>
          </Link>
          <Link href="/packets"
            className="flex flex-col items-center gap-2 py-5 rounded-2xl bg-white border border-gray-200 text-gray-700 text-center hover:border-brand-cyan transition-colors">
            <span className="text-2xl">📋</span>
            <span className="text-xs font-semibold">View Packets</span>
          </Link>
        </div>
      </div>

      {/* Recent receipts */}
      {recent.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Recent Activity</p>
            <Link href="/packets" className="text-[11px] text-brand-cyan font-semibold">See all →</Link>
          </div>
          <RecentActivity receipts={recent} country={typedProfile?.country ?? "US"} />
        </div>
      )}

      {receipts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-3xl mb-3">🧾</p>
          <p className="text-sm font-semibold text-gray-700">No receipts yet</p>
          <p className="text-xs text-gray-400 mt-1 mb-6">Start by adding your first receipt</p>
          <Link href="/capture" className="btn-primary max-w-[180px]">Add Receipt</Link>
        </div>
      )}
    </div>
  );
}
