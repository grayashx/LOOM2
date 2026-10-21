import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await supabaseServer();
  if (!supabase) return NextResponse.json({ error: "Connect Supabase before exporting." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to export your work." }, { status: 401 });

  const [{ data: profile }, { data: series, error: seriesError }] = await Promise.all([
    supabase.from("profiles").select("id,username,display_name,bio,created_at").eq("id", user.id).maybeSingle(),
    supabase.from("series").select("*").eq("author_id", user.id).order("created_at", { ascending: true })
  ]);
  if (seriesError) return NextResponse.json({ error: "Could not export your stories." }, { status: 500 });
  const seriesRows = series || [];
  const seriesIds = seriesRows.map((row: any) => row.id);
  const [{ data: chapters, error: chaptersError }, { data: drafts, error: draftsError }] = await Promise.all([
    seriesIds.length ? supabase.from("chapters").select("*").in("series_id", seriesIds).order("series_id").order("order_index") : Promise.resolve({ data: [], error: null } as any),
    seriesIds.length ? supabase.from("drafts").select("*").in("series_id", seriesIds).order("autosaved_at", { ascending: false }) : Promise.resolve({ data: [], error: null } as any)
  ]);
  if (chaptersError || draftsError) return NextResponse.json({ error: "Could not export manuscript text." }, { status: 500 });
  const chapterIds = (chapters || []).map((row: any) => row.id);
  const [{ data: revisions }, { data: analyticsEvents }] = await Promise.all([
    chapterIds.length ? supabase.from("chapter_revisions").select("id,chapter_id,title,content,created_at").in("chapter_id", chapterIds).order("created_at", { ascending: true }) : Promise.resolve({ data: [] } as any),
    seriesIds.length ? supabase.from("analytics_events").select("event_type,series_id,chapter_id,source,meta,created_at").in("series_id", seriesIds).order("created_at", { ascending: true }).limit(10000) : Promise.resolve({ data: [] } as any)
  ]);

  const exported = {
    platform: "LOOM", schema_version: 1, exported_at: new Date().toISOString(),
    note: "This export contains your series, chapter text, private drafts, revisions, and up to 10,000 available analytics events. It may contain unpublished copyrighted text; store it privately.",
    profile, series: seriesRows, chapters: chapters || [], drafts: drafts || [], revisions: revisions || [], analytics_events: analyticsEvents || []
  };
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(exported, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="loom-author-export-${day}.json"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
