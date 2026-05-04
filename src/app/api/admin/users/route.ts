import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: users } = await supabase.from("users").select("*").order("created_at", { ascending: false });

  // For each user fetch receipt count + last event
  const enriched = await Promise.all((users ?? []).map(async (u: any) => {
    const [
      { count: receiptCount },
      { data: lastEvent },
      { count: overdueCount },
      { count: exportCount },
    ] = await Promise.all([
      supabase.from("receipts").select("*", { count: "exact", head: true }).eq("user_id", u.id),
      supabase.from("events").select("created_at").eq("user_id", u.id)
        .order("created_at", { ascending: false }).limit(1),
      supabase.from("receipts").select("*", { count: "exact", head: true })
        .eq("user_id", u.id).eq("status", "overdue_flagged"),
      supabase.from("events").select("*", { count: "exact", head: true })
        .eq("user_id", u.id).eq("event_type", "pdf_exported"),
    ]);
    return {
      ...u,
      receipt_count: receiptCount ?? 0,
      overdue_count: overdueCount ?? 0,
      export_count: exportCount ?? 0,
      last_active: lastEvent?.[0]?.created_at ?? u.created_at,
    };
  }));

  return NextResponse.json(enriched);
}
