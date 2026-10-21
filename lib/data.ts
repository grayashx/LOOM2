import { DEMO_STORIES, type Story } from "@/lib/demo-data";
import { supabaseServer } from "@/lib/supabase/server";

export async function getPublishedStories(): Promise<Story[]> {
  const supabase = await supabaseServer();
  if (!supabase) return DEMO_STORIES;
  const { data, error } = await supabase
    .from("series")
    .select("id,title,slug,description,genre,tags,cover_url,status,completed,updated_at,profiles!series_author_id_fkey(display_name,username)")
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(24);
  if (error || !data) return DEMO_STORIES;
  return data.map((item: any) => ({
    ...item,
    author_name: item.profiles?.display_name || item.profiles?.username || "LOOM Author",
    chapters_count: 0
  })) as Story[];
}

export async function getStoryBySlug(slug: string) {
  const supabase = await supabaseServer();
  if (!supabase) return DEMO_STORIES.find((s) => s.slug === slug) || null;
  const { data, error } = await supabase
    .from("series")
    .select("*,profiles!series_author_id_fkey(display_name,username)")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return DEMO_STORIES.find((s) => s.slug === slug) || null;
  return { ...data, author_name: (data as any).profiles?.display_name || (data as any).profiles?.username || "LOOM Author" };
}
