import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: true, anonymous: true });
  try {
    const body = await request.json() as { chapterId?: string; scrollPct?: number; lastPosition?: number };
    if (!body.chapterId || !Number.isFinite(body.scrollPct)) return NextResponse.json({ error: "Invalid progress." }, { status: 400 });
    const scrollPct = Math.max(0, Math.min(100, Number(body.scrollPct)));
    const lastPosition = Math.max(0, Math.floor(Number(body.lastPosition || 0)));
    const { error } = await supabase.from("reading_progress").upsert({
      user_id: user.id, chapter_id: body.chapterId, scroll_pct: scrollPct, last_position: lastPosition,
      ...(scrollPct >= 98 ? { completed_at: new Date().toISOString() } : {}), updated_at: new Date().toISOString()
    }, { onConflict: "user_id,chapter_id" });
    if (error) return NextResponse.json({ error: "Progress could not be saved." }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Invalid progress request." }, { status: 400 }); }
}
