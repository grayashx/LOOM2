import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen, Feather, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import StoryCard from "@/components/StoryCard";
import { supabaseServer } from "@/lib/supabase/server";
import type { Story } from "@/lib/demo-data";

export async function generateMetadata({params}:{params:Promise<{username:string}>}):Promise<Metadata>{
  const {username}=await params;return{title:`${username} · Author profile`,description:`Discover stories written by ${username} on LOOM.`};
}

export default async function PublicAuthorPage({params}:{params:Promise<{username:string}>}) {
  const {username}=await params;const supabase=await supabaseServer();if(!supabase)notFound();
  const {data:profile}=await supabase.from("profiles").select("id,username,display_name,bio,avatar_url,banner_url,created_at").eq("username",username).maybeSingle();
  if(!profile)notFound();
  const {data:series}=await supabase.from("series").select("id,title,slug,description,genre,tags,cover_url,status,completed,updated_at").eq("author_id",profile.id).eq("status","published").order("updated_at",{ascending:false});
  const ids=(series||[]).map((item:any)=>item.id);
  const {data:chapters}=ids.length?await supabase.from("chapters").select("series_id,id").in("series_id",ids).eq("status","published"):({data:[]} as any);
  const chapterCounts=new Map<string,number>();(chapters||[]).forEach((chapter:any)=>chapterCounts.set(chapter.series_id,(chapterCounts.get(chapter.series_id)||0)+1));
  const cards=((series||[]) as any[]).map(item=>({...item,author_name:profile.display_name||profile.username,chapters_count:chapterCounts.get(item.id)||0})) as Story[];
  return <section className="section-wrap page-section author-profile-page">
    <Link className="back-link" href="/explore"><ArrowLeft size={16}/> Explore stories</Link>
    <div className="author-profile-hero">
      <div className="author-profile-avatar">{profile.avatar_url?<img src={profile.avatar_url} alt={`${profile.display_name}'s avatar`}/>:<Feather size={31}/>}</div>
      <div className="author-profile-copy"><div className="page-kicker"><ShieldCheck size={15}/> AUTHOR PROFILE</div><h1>{profile.display_name||profile.username}</h1><p className="author-handle">@{profile.username}</p>{profile.bio&&<p className="author-profile-bio">{profile.bio}</p>}<div className="author-profile-stats"><span><BookOpen size={15}/>{cards.length} published {cards.length===1?"story":"stories"}</span><span>On LOOM since {new Date(profile.created_at).toLocaleDateString(undefined,{month:"short",year:"numeric"})}</span></div></div>
    </div>
    <div className="section-heading"><div><div className="eyebrow">FROM THE AUTHOR</div><h2>Published stories</h2></div></div>
    {cards.length?<div className="story-grid">{cards.map((story:any)=><StoryCard key={story.id} story={story}/>)}</div>:<div className="empty-state"><BookOpen size={28}/><h3>No public stories yet</h3><p>When this author publishes a series, it will appear here.</p></div>}
  </section>;
}
