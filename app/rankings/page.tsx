import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Compass, Flame, Heart, MessageCircle, Sprout, TrendingUp, WandSparkles } from "lucide-react";
import { getPublishedStories } from "@/lib/data";
import { supabaseServer } from "@/lib/supabase/server";
import StoryCard from "@/components/StoryCard";

export const metadata: Metadata = { title: "Story rankings" };
const LISTS = [
  { key: "trending", title: "Trending", description: "Recent organic reader activity, with time decay so yesterday's hit doesn't own the list forever.", icon: Flame },
  { key: "rising", title: "Rising", description: "Stories gaining readership quickly, not just stories with the biggest totals.", icon: TrendingUp },
  { key: "reader-favorite", title: "Reader Favorite", description: "Consistent appreciation with a minimum-sample guard against one-rating spikes.", icon: Heart },
  { key: "most-discussed", title: "Most Discussed", description: "Stories sparking chapter conversations—not paid-currency spending.", icon: MessageCircle },
  { key: "hidden-gem", title: "Hidden Gem", description: "Strong reader signals from stories outside the usual front-page crowd.", icon: WandSparkles },
  { key: "new-voices", title: "New Voices", description: "Protected rotation for new and smaller authors, refreshed to share discovery.", icon: Sprout }
];

export default async function RankingsPage() {
  const stories = await getPublishedStories();
  const supabase = await supabaseServer();
  let snapshots: any[] = [];
  if (supabase) {
    const { data } = await supabase.from("ranking_snapshots").select("list_key,position,series:series_id(id,title,slug,description,genre,tags,cover_url,completed,updated_at,profiles!series_author_id_fkey(display_name,username))").order("position", { ascending: true }).limit(300);
    snapshots = data || [];
  }
  const demoLabels = ["New Voices", "Trending", "Reader Favorite", "Rising"];
  return <section className="section-wrap page-section"><div className="page-kicker"><Flame size={18}/> RANKINGS WITH THE LIGHTS ON</div><div className="page-title-row"><div><h1>Every list has a <em>reason.</em></h1><p>Popularity, craft, conversation, and financial support are separate signals. Spending Essence never buys a higher public rank.</p></div><div className="page-title-art"><Compass size={28}/></div></div>
    <div className="ranking-principle"><ShieldIcon/><div><strong>No paid-currency boost.</strong><p>Ranking lists use organic engagement and time-adjusted signals. Their labels explain what each list is meant to reward.</p></div></div>
    <div className="ranking-list-grid">{LISTS.map((list) => {
      const Icon = list.icon;
      const matched = snapshots.filter((s) => s.list_key === list.key).map((s) => {
        const value = Array.isArray(s.series) ? s.series[0] : s.series;
        if (!value) return null;
        return { ...value, author_name: value.profiles?.display_name || value.profiles?.username || "LOOM Author", chapters_count: 0 };
      }).filter(Boolean);
      const visible = matched.length ? matched.slice(0,3) : stories.slice((LISTS.findIndex((x)=>x.key===list.key))%Math.max(1, stories.length), ((LISTS.findIndex((x)=>x.key===list.key))%Math.max(1,stories.length))+3);
      return <article className="ranking-card" key={list.key}><div className="ranking-card-head"><span className="ranking-icon"><Icon size={18}/></span><div><h2>{list.title}</h2><p>{list.description}</p></div></div><ol className="ranking-mini-list">{visible.map((story: any, index: number)=><li key={story.id}><span className="rank-number">{index+1}</span><span className="rank-story"><Link href={`/story/${story.slug}`}>{story.title}</Link><small>{story.genre} · {story.author_name}</small></span><ArrowUpRight size={15}/></li>)}{visible.length===0 && <li className="rank-empty">Not enough activity yet. This list refreshes as stories find readers.</li>}</ol><span className="ranking-footnote">{matched.length ? "From latest scheduled snapshot" : "Sample preview · rankings await live data"}</span></article>;
    })}</div>
    <p className="ranking-transparency">Methodology note: exact anti-abuse weights are kept private, but each list's signal family is visible. New Voices rotation is not a popularity contest; Resonance and purchased Essence are excluded from public list scoring.</p>
  </section>;
}
function ShieldIcon() { return <span className="ranking-icon"><Flame size={18}/></span>; }
