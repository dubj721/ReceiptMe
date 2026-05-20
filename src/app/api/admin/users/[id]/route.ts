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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  // Prevent self-deletion
  if (id === user.id) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Step 1: Stamp deleted_at on public.users — preserves all metadata and analytics
  const { error: stampError } = await admin
    .from("users")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (stampError) return NextResponse.json({ error: stampError.message }, { status: 500 });

  // Step 2: Hard-delete from auth.users — removes login credentials entirely
  const { error: authError } = await admin.auth.admin.deleteUser(id);
  if (authError) {
    // Roll back the soft-delete stamp so the record doesn't appear deleted
    await admin.from("users").update({ deleted_at: null }).eq("id", id);
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
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

  // Validate beta_status value if provided
  if ("beta_status" in body && !["pending", "approved", "denied"].includes(body.beta_status)) {
    return NextResponse.json({ error: "Invalid beta_status value." }, { status: 400 });
  }

  const allowed = ["is_admin", "beta_status"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) { if (key in body) updates[key] = body[key]; }

  const admin = createAdminClient();
  const { error } = await admin.from("users").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
