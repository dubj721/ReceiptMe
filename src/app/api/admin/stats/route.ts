import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  // Verify the requester is a logged-in admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Use service role for the actual data reads
  const admin = createAdminClient();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalUsers },
    { count: newThisMonth },
    { count: totalReceipts },
    { count: totalExports },
    { count: weekReceipts },
    { data: feedbackRows },
  ] = await Promise.all([
    admin.from("users").select("*", { count: "exact", head: true }),
    admin.from("users").select("*", { count: "exact", head: true }).gte("created_at", monthAgo),
    admin.from("receipts").select("*", { count: "exact", head: true }),
    admin.from("events").select("*", { count: "exact", head: true }).eq("event_type", "pdf_exported"),
    admin.from("receipts").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
    admin.from("feedback").select("rating"),
  ]);

  const avgRating = feedbackRows?.length
    ? (feedbackRows.reduce((s: number, r: any) => s + r.rating, 0) / feedbackRows.length).toFixed(1)
    : null;

  return NextResponse.json({
    totalUsers: totalUsers ?? 0,
    newThisMonth: newThisMonth ?? 0,
    totalReceipts: totalReceipts ?? 0,
    totalExports: totalExports ?? 0,
    weekReceipts: weekReceipts ?? 0,
    avgRating,
    feedbackCount: feedbackRows?.length ?? 0,
  });
}
