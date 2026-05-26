import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/packets/:id/export
 * Marks the packet as exported and stamps exported_at on the specified receipts
 * (or all receipts in the packet if receipt_ids is omitted).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: packetId } = await params;

  // Verify ownership
  const { data: packet } = await supabase
    .from("packets")
    .select("id")
    .eq("id", packetId)
    .eq("user_id", user.id)
    .single();

  if (!packet) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const receiptIds: string[] | null = body.receipt_ids ?? null;

  const now = new Date().toISOString();

  // Mark packet as exported
  await supabase
    .from("packets")
    .update({ status: "exported", exported_at: now })
    .eq("id", packetId);

  // Determine which receipts to stamp
  if (receiptIds && receiptIds.length > 0) {
    // Only stamp the specific receipts that were exported (e.g. date-filtered subset)
    await supabase
      .from("receipts")
      .update({ exported_at: now })
      .in("id", receiptIds)
      .eq("user_id", user.id);
  } else {
    // Stamp all receipts in this packet
    const { data: pr } = await supabase
      .from("packet_receipts")
      .select("receipt_id")
      .eq("packet_id", packetId);

    if (pr && pr.length > 0) {
      await supabase
        .from("receipts")
        .update({ exported_at: now })
        .in("id", pr.map(r => r.receipt_id))
        .eq("user_id", user.id);
    }
  }

  return NextResponse.json({ ok: true, exported_at: now });
}
