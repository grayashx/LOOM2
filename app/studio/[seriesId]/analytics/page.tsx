import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BarChart3, BookOpen, Eye, MousePointerClick, Users } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Story Health" };
export default async function StoryAnalyticsPage({params}:{params:Promise<{seriesId:string}>}) {
  const {seriesId}=await params;const supabase=await supabaseServer();if(!supabase)redirect("/login?next=%2Fstudio");
  const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login?next=%2Fstudio");
  const {data:series}=await supabase.from("series").select("id,title,author_id").eq("id",seriesId).maybeSingle();if(!series||series.author_id!==user.id)notFound();
  const [{data:chapters},{data:progress},{data:events},{count:followers}]=await Promise.all([
    supabase.from("chapters").select("id,title,order_index,status,word_count,published_at").eq("series_id",seriesId).eq("status","published").order("order_index",{ascending:true}),
    supabase.from("reading_progress").select("chapter_id,scroll_pct,completed_at,updated_at").in("chapter_id",(await supabase.from("chapters").select("id").eq("series_id",seriesId).eq("status","published")).data?.map((c:any)=>c.id)||[]),
    supabase.from("analytics_events").select("id,event_type,created_at,source,chapter_id").eq("series_id",seriesId).order("created_at",{ascending:false}).limit(2000),
    supabase.from("follows").select("id",{count:"exact",head:true}).eq("series_id",seriesId)
  ]);
  const progressRows=progress||[];const eventRows=events||[];const starts=eventRows.filter((e:any)=>["chapter_start","chapter_view","story_start"].includes(e.event_type)).length;
  const uniqueReaders=new Set(progressRows.map((p:any)=>p.chapter_id+":"+p.updated_at?.slice(0,10))).size;
  const completions=progressRows.filter((p:any)=>p.completed_at||Number(p.scroll_pct)>=90).length;
  const chaptersWithProgress=(chapters||[]).map((chapter:any)=>{const rows=progressRows.filter((p:any)=>p.chapter_id===chapter.id);const completed=rows.filter((p:any)=>p.completed_at||Number(p.scroll_pct)>=90).length;const average=rows.length?rows.reduce((sum:number,p:any)=>sum+Number(p.scroll_pct||0),0)/rows.length:0;return{...chapter,starts:rows.length,completed,average};});
  const maxStarts=Math.max(1,...chaptersWithProgress.map((c:any)=>c.starts));
  return <section className="section-wrap page-section creator-finance-page analytics-page"><Link className="back-link" href={`/studio/${seriesId}`}><ArrowLeft size={16}/> {series.title}</Link>
    <div className="page-title-row"><div><div className="page-kicker"><BarChart3 size={16}/> STORY HEALTH</div><h1>Understand the <em>journey.</em></h1><p>A practical snapshot of reading progress and engagement. Counts are based on recorded LOOM activity, not estimates from an external analytics provider.</p></div><div className="page-title-art"><BarChart3 size={28}/></div></div>
    <div className="studio-metric-grid"><div className="studio-metric"><span className="metric-icon"><BookOpen size={18}/></span><small>PUBLISHED CHAPTERS</small><strong>{chapters?.length||0}</strong><span>Public chapters in order</span></div><div className="studio-metric"><span className="metric-icon"><Users size={18}/></span><small>FOLLOWERS</small><strong>{followers||0}</strong><span>Current story followers</span></div><div className="studio-metric"><span className="metric-icon"><Eye size={18}/></span><small>RECORDED STARTS</small><strong>{starts}</strong><span>Tracked chapter view/start events</span></div><div className="studio-metric"><span className="metric-icon"><MousePointerClick size={18}/></span><small>90%+ PROGRESS</small><strong>{completions}</strong><span>Tracked progress rows at 90% or complete</span></div></div>
    <section className="creator-panel analytics-chapter-panel"><div className="section-heading"><div><div className="eyebrow">CHAPTER RETENTION</div><h2>Where readers are reaching</h2></div><span className="sort-note">Relative progress sample</span></div>
      {chaptersWithProgress.length?<div className="retention-table">{chaptersWithProgress.map((chapter:any)=><div className="retention-row" key={chapter.id}><div className="retention-chapter"><span className="chapter-index">{String(chapter.order_index).padStart(2,"0")}</span><div><strong>{chapter.title}</strong><small>{Number(chapter.word_count||0).toLocaleString()} words</small></div></div><div className="retention-bar-wrap"><div className="retention-track"><span style={{width:`${Math.round(chapter.starts/maxStarts*100)}%`}}/></div><small>{chapter.starts} progress rows</small></div><div className="retention-value"><strong>{chapter.average.toFixed(0)}%</strong><small>avg. progress</small></div><div className="retention-value"><strong>{chapter.completed}</strong><small>90% / complete</small></div></div>)}</div>:<div className="empty-state compact-empty"><BarChart3 size={27}/><h3>Publish a chapter to start</h3><p>Retention charts will begin filling in as readers save their progress across published chapters.</p></div>}
    </section>
    <section className="creator-panel"><div className="section-heading"><div><div className="eyebrow">RECENT EVENTS</div><h2>Recent engagement</h2></div></div>{eventRows.length?<div className="finance-list">{eventRows.slice(0,40).map((event:any)=><article className="finance-list-row" key={event.id}><div className="finance-list-icon"><Eye size={18}/></div><div className="finance-list-main"><strong>{String(event.event_type).replaceAll("_"," ")}</strong><p>{new Date(event.created_at).toLocaleString()}</p></div><div className="finance-list-amount"><span className="status-pill">{event.source||"organic"}</span></div></article>)}</div>:<div className="empty-state compact-empty"><Eye size={27}/><h3>No tracked events yet</h3><p>Analytics events start to appear once reader surfaces record activity.</p></div>}</section>
    <p className="muted-help">Analytics note: this MVP shows progress/event samples and current followers. Cohort retention, source attribution, funnel conversion and scheduled aggregation require an event instrumentation/aggregation rollout before production decisions should rely on them.</p>
  </section>;
}
