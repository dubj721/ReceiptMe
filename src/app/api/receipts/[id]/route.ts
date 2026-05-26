import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { error } = await supabase
    .from("receipts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // Move receipt to a different packet
  if ("move_to_packet_id" in body) {
    const newPacketId = body.move_to_packet_id as string | null;

    // Verify the target packet belongs to this user
    if (newPacketId) {
      const { data: targetPacket } = await supabase
        .from("packets")
        .select("id")
        .eq("id", newPacketId)
        .eq("user_id", user.id)
        .single();
      if (!targetPacket) return NextResponse.json({ error: "Target packet not found" }, { status: 404 });
    }

    // Remove from current packet
    await supabase.from("packet_receipts").delete().eq("receipt_id", id);

    // Assign to new packet
    if (newPacketId) {
      await supabase.from("packet_receipts").insert({ packet_id: newPacketId, receipt_id: id });
    }

    return NextResponse.json({ ok: true });
  }

  const allowed = ["vendor_name", "transaction_date", "amount", "currency", "category", "notes", "expense_form_data"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  const { error } = await supabase
    .from("receipts")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
