import { createClient } from "@/lib/supabase/server";
import { daysOld, isPolicyApplicable } from "@/types";
import type { Receipt, User } from "@/types";
import Link from "next/link";
import RecentActivity from "@/components/home/RecentActivity";
import Greeting from "@/components/home/Greeting";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users").select("*").eq("id", user.id).single();
  const typedProfile = profile as User | null;

  const firstName = typedProfile?.name?.split(" ")[0] ?? "there";
  const now       = new Date();

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
    /*
      w-full + box-sizing keeps this div exactly viewport-width minus any parent
      padding — nothing can bleed out to the right.
    */
    <div className="w-full px-4 pt-3 pb-8" style={{ boxSizing: "border-box" }}>

      {/* Greeting */}
      <div className="w-full mb-4">
        <Greeting firstName={firstName} />
      </div>

      <div className="w-full space-y-3">

        {/* ── HERO CARD ─────────────────────────────────────────────────────
            Pure flex two-panel layout.  NO absolutely-positioned children.
            Chrome mobile has a known bug where overflow:hidden + position:relative
            fails to clip absolute descendants — the panels bled off-screen.
            Using flex avoids that entirely.
        ──────────────────────────────────────────────────────────────────── */}
        <div
          className="w-full rounded-2xl overflow-hidden flex"
          style={{
            minHeight: 170,
            /*
              The base background shows through the clip-path transparent zone
              on the right panel, keeping a seamless dark-to-cyan appearance.
            */
            background: "#04111d",
            boxShadow: "0 8px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.35)",
          }}>

          {/* Left: spend stats — flex-1 + min-w-0 prevents this from growing
              beyond its flex allocation */}
          <div
            className="flex-1 min-w-0 flex flex-col justify-between"
            style={{ padding: "20px 16px 20px 20px" }}>

            <div>
              <p style={{
                color: "rgba(255,255,255,0.38)",
                fontSize: 9, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.1em",
              }}>
                Insight Global
              </p>
              <p style={{
                color: "rgba(255,255,255,0.4)",
                fontSize: 9, fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "0.08em",
                marginTop: 16,
              }}>
                Total Spend
              </p>
              <p className="font-bold text-white leading-none mt-1"
                style={{ fontSize: 30, letterSpacing: "-0.02em" }}>
                ${Number(dollars).toLocaleString()}
                <span style={{ fontSize: 20, color: "rgba(0,214,242,0.85)" }}>.{cents}</span>
              </p>
            </div>

            <div>
              <p style={{
                color: "rgba(255,255,255,0.38)",
                fontSize: 9, fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "0.08em",
              }}>
                Receipts Submitted
              </p>
              <p className="font-bold text-white mt-0.5" style={{ fontSize: 16 }}>
                {monthReceipts.length}
                <span className="ml-1.5 font-medium"
                  style={{ fontSize: 10, color: "rgba(255,255,255,0.38)" }}>
                  {now.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </span>
              </p>
            </div>
          </div>

          {/* Right: cyan accent panel.
              flex-shrink-0 keeps it at exactly 42% — it will never compress.
              clip-path slants the left edge for the diagonal cut.
              No position:absolute → no Chrome mobile clipping bug. */}
          <div
            className="flex-shrink-0 flex flex-col items-center justify-center gap-3"
            style={{
              width: "42%",
              background: "linear-gradient(155deg, #005870 0%, #0097b8 100%)",
              clipPath: "polygon(20% 0%, 100% 0%, 100% 100%, 0% 100%)",
            }}>

            {/* Receipt icon */}
            <svg width="44" height="44" viewBox="0 0 46 46" fill="none">
              <rect x="9" y="3" width="28" height="34" rx="4"
                stroke="rgba(255,255,255,0.9)" strokeWidth="1.8"/>
              <path d="M15 13h16M15 19h16M15 25h10"
                stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round"/>
              <path d="M9 41l4-4 4 4 4-4 4 4 4-4"
                stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>

            {/* Decorative arc rings */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M4 12 a8 8 0 0 1 8-8"
                stroke="rgba(255,255,255,0.3)" strokeWidth="1.4" strokeLinecap="round"/>
              <path d="M7 12 a5 5 0 0 1 5-5"
                stroke="rgba(255,255,255,0.5)" strokeWidth="1.4" strokeLinecap="round"/>
              <path d="M10 12a2 2 0 0 1 2-2"
                stroke="rgba(255,255,255,0.7)" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </div>

        </div>
        {/* ── end hero card ─────────────────────────────────────────────── */}

        {/* Alert banners */}
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

        {/* Recent Activity */}
        {recent.length > 0 && (
          <div className="w-full pt-1">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-white">Recent Activity</p>
              <Link href="/packets" className="text-[11px] font-semibold"
                style={{ color: "#00D6F2" }}>
                See all →
              </Link>
            </div>
            <RecentActivity receipts={recent} country={typedProfile?.country ?? "US"} />
          </div>
        )}

        {/* Empty state */}
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
    </div>
  );
}
