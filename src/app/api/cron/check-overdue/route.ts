import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/cron/check-overdue
 *
 * Called daily by Vercel Cron (see vercel.json).
 * Protected by CRON_SECRET in Authorization header.
 *
 * Logic:
 *  1. Find all active receipts belonging to US users that are 55+ days old
 *  2. For day 55–60: create a day_55_warning notification (if not already sent today)
 *  3. For day 60:    create a day_60_overdue notification
 *  4. For day 61+:   update receipt status → 'overdue_flagged', create day_61_archived notification
 *
 * Canadian users are skipped entirely (isPolicyApplicable = false for CA).
 */
export async function GET(req: NextRequest) {
  // Auth check — Vercel sends the secret in the Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Pull all active US-user receipts with their transaction_date
  const { data: receipts, error } = await supabase
    .from("receipts")
    .select("id, user_id, transaction_date, status, users!inner(country)")
    .eq("status", "active")
    .eq("users.country", "US");   // only US employees

  if (error) {
    console.error("[cron] fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const updates = { warned55: 0, warned60: 0, archived61: 0 };

  for (const receipt of receipts ?? []) {
    const txDate = new Date(receipt.transaction_date);
    txDate.setHours(0, 0, 0, 0);
    const days = Math.floor((today.getTime() - txDate.getTime()) / 86_400_000);

    if (days < 55) continue;

    if (days >= 61) {
      // Archive the receipt
      await supabase
        .from("receipts")
        .update({ status: "overdue_flagged", archived_at: new Date().toISOString() })
        .eq("id", receipt.id);

      await supabase.from("notifications").upsert(
        { user_id: receipt.user_id, receipt_id: receipt.id, type: "day_61_archived", channel: "in_app" },
        { ignoreDuplicates: true }
      );

      updates.archived61++;
    } else if (days === 60) {
      await supabase.from("notifications").upsert(
        { user_id: receipt.user_id, receipt_id: receipt.id, type: "day_60_overdue", channel: "in_app" },
        { ignoreDuplicates: true }
      );
      updates.warned60++;
    } else {
      // days 55–59
      await supabase.from("notifications").upsert(
        { user_id: receipt.user_id, receipt_id: receipt.id, type: "day_55_warning", channel: "in_app" },
        { ignoreDuplicates: true }
      );
      updates.warned55++;
    }
  }

  console.log("[cron] check-overdue complete:", updates);
  return NextResponse.json({ ok: true, ...updates });
}
