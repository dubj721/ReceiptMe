import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: receipt_id } = await params;
  const body = await req.json();
  const { business_purpose, reason, signature, completed_at } = body;
  const { data: receipt, error: receiptError } = await supabase
    .from("receipts").select("id").eq("id", receipt_id).eq("user_id", user.id).single();
  if (receiptError || !receipt) return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  const signature_url = signature ? `sig:${signature}` : null;
  const { error } = await supabase.from("missing_receipt_forms").upsert(
    { receipt_id, business_purpose: business_purpose ?? null, reason: reason ?? null, signature_url, completed_at: completed_at ?? null },
    { onConflict: "receipt_id" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { data, error } = await supabase
    .from("missing_receipt_forms").select("*, receipts!inner(user_id)")
    .eq("receipt_id", id).eq("receipts.user_id", user.id).single();
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}
