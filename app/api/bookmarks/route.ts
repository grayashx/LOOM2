import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  if (!supabase) return NextResponse.json({ error: "Connect an account to sync bookmarks." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to sync bookmarks across devices." }, { status: 401 });
  try {
    const body = await request.json() as { chapterId?: string };
    if (!body.chapterId) return NextResponse.json({ error: "Missing chapter ID." }, { status: 400 });
    const { data: chapter } = await supabase.from("chapters").select("id,status").eq("id", body.chapterId).eq("status", "published").maybeSingle();
    if (!chapter) return NextResponse.json({ error: "Only published chapters can be bookmarked." }, { status: 404 });
    const { data: existing, error: lookupError } = await supabase.from("chapter_bookmarks").select("id").eq("user_id", user.id).eq("chapter_id", body.chapterId).maybeSingle();
    if (lookupError) return NextResponse.json({ error: "Could not check bookmark status." }, { status: 400 });
    if (existing) {
      const { error } = await supabase.from("chapter_bookmarks").delete().eq("id", existing.id).eq("user_id", user.id);
      if (error) return NextResponse.json({ error: "Could not remove bookmark." }, { status: 400 });
      return NextResponse.json({ ok: true, bookmarked: false });
    }
    const { error } = await supabase.from("chapter_bookmarks").insert({ user_id: user.id, chapter_id: body.chapterId });
    if (error) return NextResponse.json({ error: "Could not save bookmark." }, { status: 400 });
    return NextResponse.json({ ok: true, bookmarked: true });
  } catch {
    return NextResponse.json({ error: "Invalid bookmark request." }, { status: 400 });
  }
}
