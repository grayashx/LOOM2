import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyHmacSha256 } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const secret = process.env.AD_PROVIDER_CALLBACK_SECRET;
  if (!secret) return NextResponse.json({ error: "Ad callback is not configured." }, { status: 503 });
  const rawBody = await request.text();
  if (!verifyHmacSha256(rawBody, request.headers.get("x-loom-signature"), secret)) {
    return NextResponse.json({ error: "Invalid callback signature." }, { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody) as { session_id?: string; event_id?: string; status?: string; reward_essence?: number; provider?: string };
    if (!payload.session_id || !payload.event_id || payload.status !== "completed") {
      return NextResponse.json({ error: "Incomplete or non-completion callback." }, { status: 400 });
    }
    const admin = supabaseAdmin();
    const { data: session, error } = await admin.from("ad_sessions").select("id,user_id,provider,reward_essence,status,expires_at").eq("id", payload.session_id).maybeSingle();
    if (error || !session) return NextResponse.json({ error: "Unknown ad session." }, { status: 404 });
    if (payload.provider && payload.provider !== session.provider) return NextResponse.json({ error: "Provider mismatch." }, { status: 400 });
    if (session.provider === "development-simulator") return NextResponse.json({ error: "Development sessions cannot use the production callback." }, { status: 400 });
    const reward = Number(payload.reward_essence);
    if (!Number.isInteger(reward) || reward !== session.reward_essence) return NextResponse.json({ error: "Reward mismatch." }, { status: 400 });
    const { data: result, error: rpcError } = await admin.rpc("complete_ad_quest", {
      p_session_id: session.id, p_provider_event_id: payload.event_id, p_user_id: session.user_id, p_reward_essence: reward
    });
    if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 409 });
    return NextResponse.json(result || { ok: true });
  } catch (error) {
    console.error("ad callback error", error);
    return NextResponse.json({ error: "Could not process ad callback." }, { status: 400 });
  }
}
