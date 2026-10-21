import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

// Invoke hourly from Supabase Cron / an external scheduler. Never include paid Essence spend.
Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const expected = Deno.env.get("RANKING_CRON_SECRET");
  if (!expected || req.headers.get("x-ranking-secret") !== expected) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return Response.json({ error: "Missing Supabase environment" }, { status: 500 });
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: seriesRows, error } = await supabase.from("series").select("id,title,created_at,updated_at").eq("status", "published").limit(5000);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const rows = seriesRows || [];
  const [follows, comments, reads, ratings] = await Promise.all([
    supabase.from("follows").select("series_id,created_at").gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()).limit(20000),
    supabase.from("comments").select("chapter_id,created_at,chapters!inner(series_id)").is("deleted_at", null).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()).limit(20000),
    supabase.from("analytics_events").select("series_id,event_type,created_at,source").in("event_type", ["chapter_start", "chapter_complete", "story_view"]).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()).limit(50000),
    supabase.from("reviews").select("series_id,rating,created_at").limit(50000)
  ]);
  const followerCounts = new Map<string, number>();
  for (const item of follows.data || []) followerCounts.set(item.series_id, (followerCounts.get(item.series_id) || 0) + 1);
  const commentCounts = new Map<string, number>();
  for (const item of comments.data || []) { const chapter = item.chapters as unknown as { series_id?: string }; if (chapter?.series_id) commentCounts.set(chapter.series_id, (commentCounts.get(chapter.series_id) || 0) + 1); }
  const organicReads = new Map<string, number>();
  for (const item of reads.data || []) { if (!item.series_id || item.source === "ad-driven") continue; organicReads.set(item.series_id, (organicReads.get(item.series_id) || 0) + (item.event_type === "chapter_complete" ? 3 : item.event_type === "chapter_start" ? 1.5 : 1)); }
  const ratingSums = new Map<string, { sum: number; count: number }>();
  for (const item of ratings.data || []) { const old = ratingSums.get(item.series_id) || { sum: 0, count: 0 }; old.sum += item.rating; old.count += 1; ratingSums.set(item.series_id, old); }
  const now = Date.now();
  const ageDays = (date: string) => Math.max(0, (now - new Date(date).getTime()) / 86400000);
  const definitions: Record<string, (row: typeof rows[number]) => number> = {
    trending: (row) => ((organicReads.get(row.id) || 0) * 1.0 + (commentCounts.get(row.id) || 0) * 1.6 + (followerCounts.get(row.id) || 0) * 0.8) * Math.exp(-ageDays(row.updated_at) / 3.5),
    rising: (row) => ((followerCounts.get(row.id) || 0) * 2.2 + (organicReads.get(row.id) || 0)) / Math.max(1, ageDays(row.created_at) + 1) ** 0.25,
    "reader-favorite": (row) => { const rating = ratingSums.get(row.id) || { sum: 0, count: 0 }; return rating.count >= 20 ? (rating.sum + 4 * 3.8) / (rating.count + 4) : 0; },
    "most-discussed": (row) => commentCounts.get(row.id) || 0,
    "fast-growing": (row) => (followerCounts.get(row.id) || 0) * 1.5 + (organicReads.get(row.id) || 0),
    "hidden-gem": (row) => { const follows = followerCounts.get(row.id) || 0; const reads = organicReads.get(row.id) || 0; return (reads + (commentCounts.get(row.id) || 0) * 2) / Math.sqrt(follows + 5); },
    "new-voices": (row) => ageDays(row.created_at) <= 30 ? Math.random() + 1 / (1 + ageDays(row.created_at)) : 0,
    "staff-pick": (row) => 0
  };
  const allRows: { list_key: string; series_id: string; position: number; computed_at: string }[] = [];
  for (const [key, score] of Object.entries(definitions)) {
    const sorted = [...rows].map((row) => ({ row, score: score(row) })).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 100);
    sorted.forEach((item, index) => allRows.push({ list_key: key, series_id: item.row.id, position: index + 1, computed_at: new Date().toISOString() }));
  }
  // Replace each list's snapshot in one service-only maintenance pass; these values are positions, never public scores.
  for (const key of Object.keys(definitions)) {
    const { error: deleteError } = await supabase.from("ranking_snapshots").delete().eq("list_key", key);
    if (deleteError) return Response.json({ error: deleteError.message }, { status: 500 });
    const batch = allRows.filter((row) => row.list_key === key);
    if (batch.length) { const { error: insertError } = await supabase.from("ranking_snapshots").insert(batch); if (insertError) return Response.json({ error: insertError.message }, { status: 500 }); }
  }
  return Response.json({ ok: true, stories: rows.length, positionsWritten: allRows.length, rankings: Object.keys(definitions) });
});
