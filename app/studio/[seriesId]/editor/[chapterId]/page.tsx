import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import Editor from "@/components/Editor";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Chapter editor" };
export default async function ChapterEditorPage({params}:{params:Promise<{seriesId:string;chapterId:string}>}) {
  const {seriesId,chapterId}=await params;const supabase=await supabaseServer();if(!supabase)redirect("/signup?next=%2Fstudio");const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login?next=%2Fstudio");
  const {data:series}=await supabase.from("series").select("id,title,author_id").eq("id",seriesId).maybeSingle();if(!series||series.author_id!==user.id)notFound();
  let title="";let content="";let paywallType="free";let priceEssence=10;if(chapterId.startsWith("draft-")){const draftId=chapterId.slice("draft-".length);const {data:draft}=await supabase.from("drafts").select("id,title,content,series_id,author_id,paywall_type,price_essence").eq("id",draftId).eq("series_id",seriesId).maybeSingle();if(!draft||draft.author_id!==user.id)notFound();title=draft.title;content=draft.content;paywallType=draft.paywall_type||"free";priceEssence=Number(draft.price_essence||10);}else if(chapterId!=="new"){const {data:chapter}=await supabase.from("chapters").select("id,title,content,series_id,author_id,paywall_type,price_essence").eq("id",chapterId).eq("series_id",seriesId).maybeSingle();if(!chapter||chapter.author_id!==user.id)notFound();title=chapter.title;content=chapter.content;paywallType=chapter.paywall_type||"free";priceEssence=Number(chapter.price_essence||10);}
  return <section className="section-wrap editor-page"><Link className="back-link" href={`/studio/${seriesId}`}><ArrowLeft size={16}/> {series.title}</Link><div className="editor-page-heading"><div className="page-kicker"><FileText size={17}/> MANUSCRIPT EDITOR</div><h1>{chapterId==="new"?"A new chapter.":title||"Untitled chapter"}</h1><p>Autosaves every 10 seconds. Publishing makes the chapter visible according to your story's access settings.</p></div><Editor seriesId={seriesId} chapterId={chapterId} initialTitle={title} initialContent={content} initialPaywallType={paywallType} initialPriceEssence={priceEssence}/></section>;
}
