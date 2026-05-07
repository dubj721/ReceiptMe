import { createClient } from "@/lib/supabase/server";
import type { Receipt, User, Packet } from "@/types";
import PacketList from "@/components/packets/PacketList";

export default async function PacketsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users").select("*").eq("id", user.id).single();

  const { data: packets } = await supabase
    .from("packets")
    .select(`*, packet_receipts(receipt:receipts(*, missing_receipt_form:missing_receipt_forms(*)))`)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const country = (profile as User)?.country ?? "US";

  // Flatten packet_receipts join into receipts array
  const typedPackets = (packets ?? []).map((p: any) => ({
    ...p,
    receipts: (p.packet_receipts ?? []).map((pr: any) => pr.receipt).filter(Boolean),
  })) as (Packet & { receipts: Receipt[] })[];

  return (
    <div className="px-4 pt-2 md:pt-0 pb-8">
      <PacketList packets={typedPackets} country={country} userName={(profile as any)?.name ?? "Employee"} />
    </div>
  );
}
