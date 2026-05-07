import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const admin = createAdminClient();

  const [
    { data: profile },
    { data: receipts },
    { data: events },
    { data: feedbackItems },
  ] = await Promise.all([
    admin.from("users").select("*").eq("id", id).single(),
    admin.from("receipts").select("*").eq("user_id", id).order("transaction_date", { ascending: false }),
    admin.from("events").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(50),
    admin.from("feedback").select("*").eq("user_id", id).order("created_at", { ascending: false }),
  ]);

  return NextResponse.json({ profile, receipts, events, feedback: feedbackItems });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  // Prevent admins from removing their own admin access
  if (id === user.id) {
    return NextResponse.json({ error: "You cannot change your own admin status." }, { status: 400 });
  }

  const body = await req.json();
  const allowed = ["is_admin"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) { if (key in body) updates[key] = body[key]; }

  const admin = createAdminClient();
  const { error } = await admin.from("users").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
