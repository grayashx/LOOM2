import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  if (!supabase) return NextResponse.json({ error: "Connect Supabase first." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to support this author." }, { status: 401 });
  try {
    const body = await request.json() as { authorId?: string; amount?: number };
    const amount = Number(body.amount);
    if (!body.authorId || !Number.isInteger(amount) || ![10, 25, 50, 100].includes(amount)) return NextResponse.json({ error: "Choose one of the supported tip amounts." }, { status: 400 });
    const { data, error } = await supabase.rpc("tip_author", { p_author_id: body.authorId, p_amount: amount });
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json(data);
  } catch { return NextResponse.json({ error: "Could not send Essence." }, { status: 400 }); }
}
