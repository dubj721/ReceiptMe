import { createClient } from "@/lib/supabase/server";
import { daysOld, isPolicyApplicable } from "@/types";
import type { Receipt, User } from "@/types";
import Link from "next/link";
import RecentActivity from "@/components/home/RecentActivity";
import Greeting from "@/components/home/Greeting";

// ── Quick action button ────────────────────────────────────────────────────────
function QuickAction({
  href, label, icon,
}: {
  href: string; label: string; icon: React.ReactNode;
}) {
  return (
    <Link href={href} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center"
        style={{
          background: "rgba(255,255,255,0.15)",
          border: "1px solid rgba(255,255,255,0.22)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15)",
        }}>
        {icon}
      </div>
      <span className="text-[9px] font-semibold tracking-wide" style={{ color: "rgba(255,255,255,0.65)" }}>
        {label}
      </span>
    </Link>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users").select("*").eq("id", user.id).single();
  const typedProfile = profile as User | null;

  const firstName  = typedProfile?.name?.split(" ")[0] ?? "there";
  const now        = new Date();

  const { data: allReceipts } = await supabase
    .from("receipts")
    .select("*, missing_receipt_form:missing_receipt_forms(*)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const receipts = (allReceipts ?? []) as Receipt[];

  const monthReceipts = receipts.filter(r => {
    const d = new Date(r.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthTotal = monthReceipts.reduce((s, r) => s + Number(r.amount), 0);

  const expiringSoon = isPolicyApplicable((typedProfile?.country ?? "US") as "US" | "CA")
    ? receipts.filter(r => daysOld(r.transaction_date) >= 45).length
    : 0;

  const pendingForms = receipts.filter(
    r => r.source === "bank_transaction" && !r.missing_receipt_form?.completed_at
  ).length;

  const recent = receipts.slice(0, 5);

  const totalFixed = monthTotal.toFixed(2);
  const [dollars, cents] = totalFixed.split(".");

  return (
    <div className="px-4 pt-3 pb-8">

      {/* Greeting */}
      <div className="mb-4">
        <Greeting firstName={firstName} />
      </div>

      {/* Desktop 2-col / Mobile single-col */}
      <div className="lg:grid lg:grid-cols-[380px_1fr] lg:gap-6 lg:items-start">

        {/* ── LEFT ─────────────────────────────────────────────────────────── */}
        <div className="space-y-3">

          {/* ── HERO CARD ──────────────────────────────────────────────────── */}
          <div
            className="rounded-3xl p-5 relative overflow-hidden"
            style={{
              background: "linear-gradient(140deg, #0d3f5f 0%, #0a5a82 45%, #077fa8 100%)",
              boxShadow: "0 8px 32px rgba(0, 130, 180, 0.45), 0 2px 8px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.12)",
            }}>

            {/* Top-right cyan glow */}
            <div className="absolute top-0 right-0 w-52 h-52 pointer-events-none" style={{
              background: "radial-gradient(circle, rgba(0,214,242,0.28) 0%, transparent 65%)",
              transform: "translate(40%, -40%)",
            }} />
            {/* Bottom-left secondary glow */}
            <div className="absolute bottom-0 left-0 w-36 h-36 pointer-events-none" style={{
              background: "radial-gradient(circle, rgba(0,214,242,0.12) 0%, transparent 70%)",
              transform: "translate(-30%, 30%)",
            }} />
            {/* Shimmer line across top */}
            <div className="absolute top-0 left-0 right-0 h-px" style={{
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)",
            }} />

            {/* Month label */}
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "#00D6F2" }}>
              {now.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>

            {/* Stats row */}
            <div className="flex items-end justify-between mb-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Total Spend
                </p>
                <p className="font-bold text-white leading-none tracking-tight" style={{ fontSize: 30 }}>
                  ${Number(dollars).toLocaleString()}
                  <span style={{ fontSize: 20, color: "rgba(0,214,242,0.7)" }}>.{cents}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Submitted
                </p>
                <p className="font-bold text-white leading-none tracking-tight" style={{ fontSize: 30 }}>
                  {monthReceipts.length}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>receipts</p>
              </div>
            </div>

            {/* Divider */}
            <div className="mb-4" style={{ height: 1, background: "rgba(255,255,255,0.12)" }} />

            {/* Quick actions */}
            <div className="flex justify-around">
              <QuickAction href="/capture" label="Add Receipt" icon={
                <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
                  <path d="M2 8a2 2 0 012-2h1.5l1.5-2h7l1.5 2H18a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V8z"
                    stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
                  <circle cx="11" cy="12" r="3" stroke="white" strokeWidth="1.5"/>
                </svg>
              } />
              <QuickAction href="/packets" label="Packets" icon={
                <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
                  <rect x="3" y="3" width="7" height="7" rx="2" stroke="white" strokeWidth="1.5"/>
                  <rect x="12" y="3" width="7" height="7" rx="2" stroke="white" strokeWidth="1.5"/>
                  <rect x="3" y="12" width="7" height="7" rx="2" stroke="white" strokeWidth="1.5"/>
                  <rect x="12" y="12" width="7" height="7" rx="2" stroke="white" strokeWidth="1.5"/>
                </svg>
              } />
              <QuickAction href="/archive" label="Archive" icon={
                <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
                  <rect x="3" y="7" width="16" height="12" rx="2" stroke="white" strokeWidth="1.5"/>
                  <path d="M3 10h16" stroke="white" strokeWidth="1.5"/>
                  <path d="M7 3h8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M8.5 14.5h5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              } />
              <QuickAction href="/settings" label="Settings" icon={
                <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
                  <circle cx="11" cy="11" r="3" stroke="white" strokeWidth="1.5"/>
                  <path d="M11 2v2M11 18v2M2 11h2M18 11h2M4.93 4.93l1.41 1.41M15.66 15.66l1.41 1.41M4.93 17.07l1.41-1.41M15.66 6.34l1.41-1.41"
                    stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              } />
            </div>
          </div>

          {/* ── Alert banners ──────────────────────────────────────────────── */}
          {expiringSoon > 0 && (
            <Link href="/archive"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl block active:scale-[0.99] transition-transform"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
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
            <Link href="/packets"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl block active:scale-[0.99] transition-transform"
              style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)" }}>
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

          {/* ── Recent Activity — mobile ──────────────────────────────────── */}
          {recent.length > 0 && (
            <div className="lg:hidden pt-1">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-white">Recent Activity</p>
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
              <p className="text-sm font-semibold text-white">No receipts yet</p>
              <p className="text-xs mt-1 mb-6" style={{ color: "rgba(255,255,255,0.45)" }}>
                Start by adding your first receipt
              </p>
              <Link href="/capture" className="btn-primary max-w-[180px]">Add Receipt</Link>
            </div>
          )}
        </div>

        {/* ── RIGHT — desktop only ─────────────────────────────────────────── */}
        {recent.length > 0 && (
          <div className="hidden lg:block">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-white">Recent Activity</p>
              <Link href="/packets" className="text-[11px] font-semibold" style={{ color: "#00D6F2" }}>
                See all →
              </Link>
            </div>
            <RecentActivity receipts={recent} country={typedProfile?.country ?? "US"} />
          </div>
        )}
      </div>
    </div>
  );
}
