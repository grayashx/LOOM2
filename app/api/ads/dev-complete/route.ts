import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "The development simulator is disabled in production." }, { status: 404 });
  try {
    const supabase = await supabaseServer();
    if (!supabase) return NextResponse.json({ error: "Supabase is required for reward testing." }, { status: 503 });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const body = await request.json() as { sessionId?: string };
    if (!body.sessionId) return NextResponse.json({ error: "Missing session ID." }, { status: 400 });
    const admin = supabaseAdmin();
    const { data: session, error } = await admin.from("ad_sessions").select("id,user_id,provider,reward_essence").eq("id", body.sessionId).maybeSingle();
    if (error || !session || session.user_id !== user.id || session.provider !== "development-simulator") return NextResponse.json({ error: "Invalid development session." }, { status: 403 });
    const { data, error: rpcError } = await admin.rpc("complete_ad_quest", {
      p_session_id: session.id, p_provider_event_id: `dev-${randomUUID()}`, p_user_id: user.id, p_reward_essence: session.reward_essence
    });
    if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 409 });
    return NextResponse.json({ ...(data as object), essence: session.reward_essence });
  } catch {
    return NextResponse.json({ error: "Could not complete the test reward." }, { status: 400 });
  }
}
