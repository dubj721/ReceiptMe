import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    vendor_name,
    transaction_date,
    amount,
    currency = "USD",
    category,
    source,
    image_url = null,
    notes = null,
  } = body;

  if (!vendor_name || !transaction_date || amount == null || !category || !source) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("receipts")
    .insert({
      user_id: user.id,
      vendor_name,
      transaction_date,
      amount,
      currency,
      category,
      source,
      image_url,
      notes,
      status: "active",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Pre-create empty missing receipt form for bank transactions
  if (source === "bank_transaction") {
    await supabase.from("missing_receipt_forms").insert({
      receipt_id: data.id,
      business_purpose: null,
      reason: null,
      completed_at: null,
    });
  }

  // Auto-assign receipt to the current month's packet (create if needed)
  const now = new Date();
  const monthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const lastDay  = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

  let { data: packet } = await supabase
    .from("packets")
    .select("id")
    .eq("user_id", user.id)
    .eq("label", monthLabel)
    .maybeSingle();

  if (!packet) {
    const { data: newPacket } = await supabase
      .from("packets")
      .insert({ user_id: user.id, label: monthLabel, date_from: firstDay, date_to: lastDay })
      .select("id")
      .single();
    packet = newPacket;
  }

  if (packet) {
    await supabase.from("packet_receipts").insert({
      packet_id: packet.id,
      receipt_id: data.id,
    });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
