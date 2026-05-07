import { createClient } from "@/lib/supabase/server";
import { daysOld, isPolicyApplicable } from "@/types";
import type { Receipt, User } from "@/types";
import { getNextDeadline } from "@/lib/expense-schedule";
import Link from "next/link";
import RecentActivity from "@/components/home/RecentActivity";
import Greeting from "@/components/home/Greeting";
import DeadlineBanner from "@/components/home/DeadlineBanner";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users").select("*").eq("id", user.id).single();
  const typedProfile = profile as User | null;

  const firstName = typedProfile?.name?.split(" ")[0] ?? "there";

  const { data: allReceipts } = await supabase
    .from("receipts")
    .select("*, missing_receipt_form:missing_receipt_forms(*)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const receipts = (allReceipts ?? []) as Receipt[];

  const expiringSoon = isPolicyApplicable((typedProfile?.country ?? "US") as "US" | "CA")
    ? receipts.filter(r => daysOld(r.transaction_date) >= 45).length
    : 0;

  const pendingForms = receipts.filter(
    r => r.source === "bank_transaction" && !r.missing_receipt_form?.completed_at
  ).length;

  const recent = receipts.slice(0, 5);

  // Expense deadline — based on office city and country
  const country  = (typedProfile?.country ?? "US") as "US" | "CA";
  const deadline = getNextDeadline(typedProfile?.city, country);

  const daysUntil         = deadline?.daysUntil         ?? null;
  const payrollRunDate    = deadline?.payrollRunDate     ?? null;
  const iaReviewStartDate = deadline?.iaReviewStartDate  ?? null;
  const nextCycleDate     = deadline?.nextCycleDate      ?? null;
  const cutoffTime        = deadline?.cutoffTime         ?? null;
  const reviewStarted     = deadline?.reviewStarted      ?? false;

  return (
    <div className="w-full px-4 pt-3 pb-8" style={{ boxSizing: "border-box" }}>

      {/* Greeting */}
      <div className="w-full mb-4">
        <Greeting firstName={firstName} />
      </div>

      <div className="w-full space-y-3">

        {/* ── Expense Deadline Banner ─────────────────────────────────────── */}
        <DeadlineBanner
          city={typedProfile?.city}
          daysUntil={daysUntil}
          payrollRunDate={payrollRunDate}
          iaReviewStartDate={iaReviewStartDate}
          nextCycleDate={nextCycleDate}
          cutoffTime={cutoffTime}
          reviewStarted={reviewStarted}
        />

        {/* ── Alert banners ──────────────────────────────────────────────── */}
        {expiringSoon > 0 && (
          <Link
            href="/archive"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl active:scale-[0.99] transition-transform"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.25)",
              boxSizing: "border-box",
            }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm"
              style={{ background: "rgba(239,68,68,0.15)" }}>⚠️</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-red-400">
                {expiringSoon} receipt{expiringSoon > 1 ? "s" : ""} expiring soon
              </p>
              <p className="text-[10px] text-red-500/70">Tap to view overdue archive →</p>
            </div>
          </Link>
        )}

        {pendingForms > 0 && (
          <Link
            href="/packets"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl active:scale-[0.99] transition-transform"
            style={{
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.25)",
              boxSizing: "border-box",
            }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm"
              style={{ background: "rgba(245,158,11,0.15)" }}>📋</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-yellow-400">
                {pendingForms} missing receipt form{pendingForms > 1 ? "s" : ""} need attention
              </p>
              <p className="text-[10px] text-yellow-500/70">Tap to complete →</p>
            </div>
          </Link>
        )}

        {/* ── Recent Activity ─────────────────────────────────────────────── */}
        {recent.length > 0 && (
          <div className="w-full pt-1">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold" style={{ color: "#00283C" }}>Recent Activity</p>
              <Link href="/packets" className="text-[11px] font-semibold"
                style={{ color: "#00D6F2" }}>
                See all →
              </Link>
            </div>
            <RecentActivity receipts={recent} country={typedProfile?.country ?? "US"} />
          </div>
        )}

        {/* ── Empty state ─────────────────────────────────────────────────── */}
        {receipts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-3xl mb-3">🧾</p>
            <p className="text-sm font-semibold text-gray-700">No receipts yet</p>
            <p className="text-xs mt-1 mb-6 text-gray-400">
              Start by adding your first receipt
            </p>
            <Link href="/capture" className="btn-primary max-w-[180px]">Add Receipt</Link>
          </div>
        )}

      </div>
    </div>
  );
}
