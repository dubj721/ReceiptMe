import { createClient } from "@/lib/supabase/server";
import { daysOld, isPolicyApplicable } from "@/types";
import type { Receipt, User } from "@/types";
import Link from "next/link";
import RecentActivity from "@/components/home/RecentActivity";
import Greeting from "@/components/home/Greeting";

// ── Quick action button ────────────────────────────────────────────────────────
function QuickAction({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href} className="flex flex-col items-center gap-2 active:scale-95 transition-transform">
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{
          background: "rgba(255,255,255,0.12)",
          border: "1px solid rgba(255,255,255,0.18)",
        }}>
        {icon}
      </div>
      <span className="text-[10px] font-semibold text-white/60">{label}</span>
    </Link>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();
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

  // Split total into dollars + cents for hero display
  const totalFixed = monthTotal.toFixed(2);
  const [dollars, cents] = totalFixed.split(".");

  return (
    <div className="px-4 pt-2 md:pt-0 pb-8">
      <div className="md:max-w-lg md:mx-auto lg:max-w-none">

        {/* Greeting */}
        <div className="mb-4">
          <Greeting firstName={firstName} />
        </div>

        {/*
          ── TWO-COLUMN LAYOUT ──────────────────────────────────────────────────
          Mobile: single column stack
          Desktop (lg+): left col = hero + alerts, right col = recent activity
        */}
        <div className="lg:grid lg:grid-cols-[400px_1fr] lg:gap-6 lg:items-start">

          {/* ── LEFT COLUMN ─────────────────────────────────────────────────── */}
          <div className="space-y-3">

            {/* Hero Summary Card */}
            <div
              className="rounded-3xl p-5 relative overflow-hidden"
              style={{
                background: "linear-gradient(140deg, #00283C 0%, #003d5c 55%, #00506e 100%)",
              }}>

              {/* Cyan glow — top right */}
              <div
                className="absolute top-0 right-0 w-48 h-48 pointer-events-none"
                style={{
                  background: "radial-gradient(circle, rgba(0,214,242,0.18) 0%, transparent 70%)",
                  transform: "translate(35%, -35%)",
                }}
              />
              {/* Subtle bottom glow */}
              <div
                className="absolute bottom-0 left-0 w-32 h-32 pointer-events-none"
                style={{
                  background: "radial-gradient(circle, rgba(0,214,242,0.07) 0%, transparent 70%)",
                  transform: "translate(-30%, 30%)",
                }}
              />

              {/* Month label */}
              <p
                className="text-[10px] font-bold uppercase tracking-widest mb-4"
                style={{ color: "#00D6F2" }}>
                {now.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>

              {/* Stats row */}
              <div className="flex items-end justify-between mb-5">
                {/* Total spend */}
                <div>
                  <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wide mb-1">
                    Total Spend
                  </p>
                  <p className="text-[38px] font-bold text-white leading-none tracking-tight">
                    ${Number(dollars).toLocaleString()}
                    <span className="text-2xl" style={{ color: "rgba(0,214,242,0.55)" }}>
                      .{cents}
                    </span>
                  </p>
                </div>

                {/* Receipt count */}
                <div className="text-right">
                  <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wide mb-1">
                    Submitted
                  </p>
                  <p className="text-[38px] font-bold text-white leading-none tracking-tight">
                    {monthReceipts.length}
                  </p>
                  <p className="text-[10px] text-white/40 mt-0.5">receipts</p>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t mb-4" style={{ borderColor: "rgba(255,255,255,0.1)" }} />

              {/* Quick actions */}
              <div className="flex justify-around">
                <QuickAction
                  href="/capture"
                  label="Add Receipt"
                  icon={
                    <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                      <path
                        d="M2 8a2 2 0 012-2h1.5l1.5-2h7l1.5 2H18a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V8z"
                        stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
                      <circle cx="11" cy="12" r="3" stroke="white" strokeWidth="1.5"/>
                    </svg>
                  }
                />
                <QuickAction
                  href="/packets"
                  label="Packets"
                  icon={
                    <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                      <rect x="3" y="3" width="7" height="7" rx="2" stroke="white" strokeWidth="1.5"/>
                      <rect x="12" y="3" width="7" height="7" rx="2" stroke="white" strokeWidth="1.5"/>
                      <rect x="3" y="12" width="7" height="7" rx="2" stroke="white" strokeWidth="1.5"/>
                      <rect x="12" y="12" width="7" height="7" rx="2" stroke="white" strokeWidth="1.5"/>
                    </svg>
                  }
                />
                <QuickAction
                  href="/archive"
                  label="Archive"
                  icon={
                    <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                      <rect x="3" y="7" width="16" height="12" rx="2" stroke="white" strokeWidth="1.5"/>
                      <path d="M3 10h16" stroke="white" strokeWidth="1.5"/>
                      <path d="M7 3h8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M8.5 14.5h5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  }
                />
                <QuickAction
                  href="/settings"
                  label="Settings"
                  icon={
                    <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                      <circle cx="11" cy="11" r="3" stroke="white" strokeWidth="1.5"/>
                      <path
                        d="M11 2v2M11 18v2M2 11h2M18 11h2M4.93 4.93l1.41 1.41M15.66 15.66l1.41 1.41M4.93 17.07l1.41-1.41M15.66 6.34l1.41-1.41"
                        stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  }
                />
              </div>
            </div>

            {/* ── Alert banners ──────────────────────────────────────────────── */}
            {expiringSoon > 0 && (
              <Link
                href="/archive"
                className="flex items-center gap-3 px-4 py-3 rounded-2xl block active:scale-[0.99] transition-transform"
                style={{
                  background: "rgba(239,68,68,0.07)",
                  border: "1px solid rgba(239,68,68,0.18)",
                }}>
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm"
                  style={{ background: "rgba(239,68,68,0.1)" }}>
                  ⚠️
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-red-600">
                    {expiringSoon} receipt{expiringSoon > 1 ? "s" : ""} expiring soon
                  </p>
                  <p className="text-[10px] text-red-400">Tap to view overdue archive →</p>
                </div>
              </Link>
            )}

            {pendingForms > 0 && (
              <Link
                href="/packets"
                className="flex items-center gap-3 px-4 py-3 rounded-2xl block active:scale-[0.99] transition-transform"
                style={{
                  background: "rgba(245,158,11,0.07)",
                  border: "1px solid rgba(245,158,11,0.18)",
                }}>
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm"
                  style={{ background: "rgba(245,158,11,0.1)" }}>
                  📋
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-yellow-700">
                    {pendingForms} missing receipt form{pendingForms > 1 ? "s" : ""} need attention
                  </p>
                  <p className="text-[10px] text-yellow-500">Tap to complete →</p>
                </div>
              </Link>
            )}

            {/* Recent Activity — mobile only (shown below on desktop) */}
            {recent.length > 0 && (
              <div className="lg:hidden pt-1">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-gray-900">Recent Activity</p>
                  <Link href="/packets" className="text-[11px] font-semibold" style={{ color: "#00D6F2" }}>
                    See all →
                  </Link>
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

          {/* ── RIGHT COLUMN — desktop only ─────────────────────────────────── */}
          {recent.length > 0 && (
            <div className="hidden lg:block">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-gray-900">Recent Activity</p>
                <Link href="/packets" className="text-[11px] font-semibold" style={{ color: "#00D6F2" }}>
                  See all →
                </Link>
              </div>
              <RecentActivity receipts={recent} country={typedProfile?.country ?? "US"} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
