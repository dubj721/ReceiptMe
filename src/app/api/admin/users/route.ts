import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
    return { ...u, receiptCount: receiptCount ?? 0, overdueCount: overdueCount ?? 0, exportCount: exportCount ?? 0, lastActive, daysSince };
  }));

  return NextResponse.json(enriched);
}
