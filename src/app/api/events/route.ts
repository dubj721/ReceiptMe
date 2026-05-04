import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { event_type, metadata } = await req.json();
  if (!event_type) return NextResponse.json({ error: "event_type required" }, { status: 400 });

  const { error } = await supabase.from("events").insert({
    user_id: user.id,
    event_type,
    metadata: metadata ?? {},
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
