import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  if (!supabase) return NextResponse.json({ error: "Connect Supabase first." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to unlock chapters." }, { status: 401 });
  try {
    const body = await request.json() as { chapterId?: string };
    if (!body.chapterId) return NextResponse.json({ error: "Missing chapter ID." }, { status: 400 });
    const { data, error } = await supabase.rpc("unlock_chapter", { p_chapter_id: body.chapterId });
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Could not unlock this chapter." }, { status: 400 });
  }
}
