import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { AD_DAILY_LIMIT } from "@/lib/economy";

export const runtime = "nodejs";

export async function POST() {
  try {
    const supabase = await supabaseServer();
    if (!supabase) return NextResponse.json({ error: "Connect Supabase before earning rewards." }, { status: 503 });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in to start a quest." }, { status: 401 });

    const providerName = process.env.AD_PROVIDER_NAME || "";
    const startUrl = process.env.AD_PROVIDER_START_URL || "";
    const production = process.env.NODE_ENV === "production";
    if (production && (!providerName || !startUrl || !process.env.AD_PROVIDER_CALLBACK_SECRET)) {
      return NextResponse.json({ error: "Rewarded ads are not configured yet. No reward was issued." }, { status: 503 });
    }

    const admin = supabaseAdmin();
    const { data: quest, error: questError } = await admin.from("quests").select("id,reward_essence,daily_limit,active,ends_at,starts_at").eq("id", "rewarded-video-daily").eq("active", true).maybeSingle();
    if (questError || !quest) return NextResponse.json({ error: "This quest is unavailable." }, { status: 404 });
    const now = new Date();
    if ((quest.starts_at && new Date(quest.starts_at) > now) || (quest.ends_at && new Date(quest.ends_at) <= now)) {
      return NextResponse.json({ error: "This quest is not active right now." }, { status: 410 });
    }

    const startOfUtcDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
    const { count, error: countError } = await admin.from("ad_sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", startOfUtcDay).or(`status.eq.completed,and(status.eq.pending,expires_at.gt.${now.toISOString()})`);
    if (countError) throw countError;
    const limit = Math.min(AD_DAILY_LIMIT, Number(quest.daily_limit || AD_DAILY_LIMIT));
    if ((count || 0) >= limit) return NextResponse.json({ error: `Daily quest limit reached (${limit} per UTC day).` }, { status: 429 });

    const provider = startUrl ? providerName : "development-simulator";
    const { data: session, error: sessionError } = await admin.from("ad_sessions").insert({
      user_id: user.id, quest_id: quest.id, provider, reward_essence: Number(quest.reward_essence), status: "pending"
    }).select("id,expires_at,reward_essence").single();
    if (sessionError || !session) throw sessionError || new Error("Could not create ad session");

    if (!startUrl) {
      if (production) return NextResponse.json({ error: "Ad provider is unavailable." }, { status: 503 });
      return NextResponse.json({ mode: "development", sessionId: session.id, rewardEssence: session.reward_essence, expiresAt: session.expires_at });
    }
    const adUrl = new URL(startUrl);
    adUrl.searchParams.set("session_id", session.id);
    adUrl.searchParams.set("callback_url", `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/ads/callback`);
    return NextResponse.json({ mode: "provider", sessionId: session.id, adUrl: adUrl.toString(), rewardEssence: session.reward_essence, expiresAt: session.expires_at });
  } catch (error) {
    console.error("ad session error", error);
    return NextResponse.json({ error: "Could not start this quest." }, { status: 500 });
  }
}
