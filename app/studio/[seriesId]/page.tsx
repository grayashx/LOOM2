import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BarChart3, FileText, Plus, Send } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Manage story" };
export default async function SeriesStudioPage({params}:{params:Promise<{seriesId:string}>}) {
  const {seriesId}=await params;const supabase=await supabaseServer();if(!supabase)redirect("/signup?next=%2Fstudio");const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login?next=%2Fstudio");
  const {data:series}=await supabase.from("series").select("id,title,slug,description,status,genre,updated_at,author_id").eq("id",seriesId).maybeSingle();if(!series||series.author_id!==user.id)notFound();
  const {data:chapters}=await supabase.from("chapters").select("id,title,order_index,status,word_count,updated_at,published_at").eq("series_id",seriesId).order("order_index",{ascending:true});
  return <section className="section-wrap page-section series-studio-page"><Link className="back-link" href="/studio"><ArrowLeft size={16}/> Author Studio</Link><div className="series-studio-heading"><div><div className="page-kicker">{series.genre} · SERIES WORKSPACE</div><h1>{series.title}</h1><p>{series.description}</p><span className={`status-pill ${series.status}`}>{series.status}</span></div><Link className="button button-primary" href={`/studio/${seriesId}/editor/new`}><Plus size={17}/> New chapter</Link></div><div className="series-studio-tabs"><Link className="active" href={`/studio/${seriesId}`}><FileText size={15}/> Chapters</Link><Link href={`/studio/${seriesId}/analytics`}><BarChart3 size={15}/> Story Health</Link></div>
    <div className="section-heading"><div><div className="eyebrow">MANUSCRIPT</div><h2>Chapter list <span className="count-badge">{chapters?.length||0}</span></h2></div><span className="sort-note">Ordered by publication order</span></div>
    {chapters?.length?<div className="chapter-list studio-chapter-list">{chapters.map((chapter:any)=><div className="chapter-row studio-chapter-row" key={chapter.id}><span className="chapter-index">{String(chapter.order_index).padStart(2,"0")}</span><span className="chapter-row-copy"><strong>{chapter.title}</strong><small>{Number(chapter.word_count||0).toLocaleString()} words · Updated {formatDate(chapter.updated_at)}</small></span><span className={`status-pill ${chapter.status}`}>{chapter.status}</span><Link className="icon-link" href={`/studio/${seriesId}/editor/${chapter.id}`} aria-label={`Edit ${chapter.title}`}><ArrowRight size={17}/></Link></div>)}</div>:<div className="empty-state studio-empty"><FileText size={28}/><h3>First chapter, first step.</h3><p>Your draft is private until you're ready to publish it. Every edit is autosaved and existing text gets a revision snapshot.</p><Link className="button button-primary" href={`/studio/${seriesId}/editor/new`}>Write chapter one <ArrowRight size={16}/></Link></div>}
    <div className="series-tip"><Send size={18}/><div><strong>A sustainable publishing rhythm beats a launch blitz.</strong><p>Build a release cadence you can keep. LOOM's New Voices rotation is intended to provide new and small stories a fair visibility floor once ranking snapshots are configured.</p></div></div>
  </section>;
}
