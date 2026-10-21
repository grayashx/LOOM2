import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, LockKeyhole, MessageCircle, Send } from "lucide-react";
import { notFound } from "next/navigation";
import Reader from "@/components/Reader";
import UnlockChapter from "@/components/UnlockChapter";
import { getStoryBySlug } from "@/lib/data";
import { DEMO_CHAPTER_CONTENT, DEMO_CHAPTERS } from "@/lib/demo-data";
import { supabaseServer } from "@/lib/supabase/server";
import { addComment } from "@/app/actions";

export async function generateMetadata({params}:{params:Promise<{slug:string;chapterId:string}>}):Promise<Metadata>{const {slug,chapterId}=await params;const story=await getStoryBySlug(slug);return{title:story?`${story.title} — Chapter`:"Chapter not found"};}

export default async function ChapterPage({params}:{params:Promise<{slug:string;chapterId:string}>}) {
  const {slug,chapterId}=await params; const story=await getStoryBySlug(slug); if(!story)notFound();
  const supabase=await supabaseServer();
  if(String(story.id).startsWith("demo-")){
    const index=DEMO_CHAPTERS.findIndex(c=>c.id===chapterId); if(index<0)notFound();
    const chapter=DEMO_CHAPTERS[index];
    return <section className="reader-page"><Reader chapterId={chapter.id} title={chapter.title} content={DEMO_CHAPTER_CONTENT} storyHref={`/story/${slug}`} prevHref={index>0?`/story/${slug}/chapter/${DEMO_CHAPTERS[index-1].id}`:undefined} nextHref={index<DEMO_CHAPTERS.length-1?`/story/${slug}/chapter/${DEMO_CHAPTERS[index+1].id}`:undefined}/><section className="section-wrap comments-panel" id="chapter-comments"><div className="eyebrow">THE COMMON ROOM</div><h2>Chapter conversation</h2><p>This is sample content in preview mode. Connect Supabase to enable real comments and reader progress.</p><div className="comment-preview"><MessageCircle size={18}/><span>Good stories are even better when we talk about them.</span></div><Link className="button button-secondary" href="/signup">Join the conversation</Link></section></section>;
  }
  if(!supabase)notFound();
  const {data:chapter}=await supabase.from("chapters").select("id,title,content,order_index,status,paywall_type,price_essence,series_id,author_id,published_at").eq("id",chapterId).eq("series_id",story.id).maybeSingle();
  let directory:any=null;
  if(!chapter){const {data}=await supabase.from("chapter_directory").select("id,title,order_index,paywall_type,price_essence,word_count,published_at,series_id").eq("id",chapterId).maybeSingle();directory=data;}
  const visibleChapter=chapter||directory;
  if(!visibleChapter)notFound();
  const {data:directoryRows}=await supabase.from("chapter_directory").select("id,title,order_index").eq("series_id",story.id).order("order_index",{ascending:true});
  const ordered=directoryRows||[];const index=ordered.findIndex((c:any)=>c.id===chapterId);
  const prev=index>0?`/story/${slug}/chapter/${ordered[index-1].id}`:undefined;
  const next=index>=0&&index<ordered.length-1?`/story/${slug}/chapter/${ordered[index+1].id}`:undefined;
  const {data:comments}=chapter?.status==="published"?await supabase.from("comments").select("id,body,created_at,profiles!comments_user_id_fkey(username,display_name)").eq("chapter_id",chapterId).is("deleted_at",null).order("created_at",{ascending:true}).limit(100):{data:[] as any[]};
  const {data:{user:readerUser}}=await supabase.auth.getUser();
  const {data:bookmarkRow}=readerUser&&chapter?.status==="published"?await supabase.from("chapter_bookmarks").select("id").eq("chapter_id",chapterId).eq("user_id",readerUser.id).maybeSingle():{data:null as any};
  const {data:progressRow}=readerUser&&chapter?.status==="published"?await supabase.from("reading_progress").select("last_position").eq("chapter_id",chapterId).eq("user_id",readerUser.id).maybeSingle():{data:null as any};
  const locked=!chapter?.content && chapter?.status!=="draft" && chapter?.status!=="scheduled";
  return <section className="reader-page">
    {locked?<div className="section-wrap locked-reading-page"><Link href={`/story/${slug}`} className="back-link"><ArrowLeft size={16}/> Back to story</Link><div className="locked-chapter-title"><div className="eyebrow">{story.title}</div><h1>{visibleChapter.title}</h1><span><LockKeyhole size={14}/> Locked chapter</span></div>{visibleChapter.paywall_type==="subscriber"?<div className="locked-panel"><div className="locked-icon"><LockKeyhole size={24}/></div><h2>Members-only chapter</h2><p>This chapter is available to active subscribers of this author. Choose a membership from the author’s story page to access subscriber-only chapters.</p><Link className="button button-secondary" href={`/story/${slug}`}>View story and author</Link></div>:<UnlockChapter chapterId={chapterId} cost={Number(visibleChapter.price_essence)||0}/>}</div>:<>
      <Reader chapterId={chapterId} title={chapter.title} content={chapter.content||""} storyHref={`/story/${slug}`} prevHref={prev} nextHref={next} persistBookmarks={true} initialBookmarked={Boolean(bookmarkRow)} initialPosition={Number(progressRow?.last_position)||0}/>
      <section className="section-wrap comments-panel" id="chapter-comments"><div className="comments-heading"><div><div className="eyebrow">THE COMMON ROOM</div><h2>Chapter conversation <span className="count-badge">{comments?.length||0}</span></h2><p>Talk about the text, not the reader. Keep spoilers considerate.</p></div></div>
        <form action={addComment} className="comment-compose"><input type="hidden" name="chapterId" value={chapterId}/><input type="hidden" name="slug" value={slug}/><textarea name="body" required maxLength={2000} minLength={2} placeholder="What stayed with you after this chapter?" rows={3}/><div className="comment-compose-foot"><span>Be kind. Comments may be reported for review.</span><button className="button button-primary button-small" type="submit"><Send size={14}/> Post comment</button></div></form>
        <div className="comment-list">{(comments||[]).map((comment:any)=><article className="comment-item" key={comment.id}><div className="comment-avatar">{(comment.profiles?.display_name||comment.profiles?.username||"R").slice(0,1).toUpperCase()}</div><div><div className="comment-meta"><strong>{comment.profiles?.display_name||comment.profiles?.username||"Reader"}</strong><time>{new Date(comment.created_at).toLocaleDateString()}</time></div><p>{comment.body}</p></div></article>)}{!comments?.length&&<div className="empty-comments"><MessageCircle size={22}/><p>No comments yet. Be the first to share what you noticed.</p></div>}</div>
      </section>
    </>}
  </section>;
}
