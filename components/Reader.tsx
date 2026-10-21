"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronLeft, ChevronRight, List, Minus, Plus, Sun, Moon, Bookmark, MessageCircle } from "lucide-react";

export default function Reader({ chapterId, title, content, prevHref, nextHref, storyHref, commentsEnabled=true, persistBookmarks=false, initialBookmarked=false, initialPosition=0 }: { chapterId: string; title: string; content: string; prevHref?: string; nextHref?: string; storyHref: string; commentsEnabled?: boolean; persistBookmarks?: boolean; initialBookmarked?: boolean; initialPosition?: number }) {
  const [fontSize,setFontSize]=useState(19); const [lineHeight,setLineHeight]=useState(1.75); const [theme,setTheme]=useState("paper"); const [saved,setSaved]=useState(initialBookmarked); const [bookmarkMessage,setBookmarkMessage]=useState("");
  const paragraphs = useMemo(()=>content.split(/\n\s*\n/).map((s)=>s.trim()).filter(Boolean),[content]);
  const saveProgress = useCallback(async () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max <= 0 ? 100 : Math.min(100, Math.max(0, window.scrollY / max * 100));
    const bar = document.querySelector<HTMLElement>(".reader-progress-fill"); if (bar) bar.style.width = `${pct}%`;
    try { localStorage.setItem(`loom-progress-${chapterId}`, JSON.stringify({ pct, y: window.scrollY, at: Date.now() })); } catch {}
    await fetch("/api/reading-progress", { method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chapterId,scrollPct:pct,lastPosition:Math.floor(window.scrollY)}) }).catch(()=>{});
  },[chapterId]);
  const toggleBookmark = useCallback(async () => {
    setBookmarkMessage("");
    if (!persistBookmarks) {
      const next = !saved;
      setSaved(next);
      try { localStorage.setItem(`loom-bookmark-${chapterId}`, next ? "1" : "0"); } catch {}
      setBookmarkMessage(next ? "Saved on this device." : "Removed from this device.");
      return;
    }
    try {
      const response = await fetch("/api/bookmarks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chapterId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Sign in to sync your bookmark.");
      setSaved(Boolean(result.bookmarked));
      setBookmarkMessage(result.bookmarked ? "Bookmark synced." : "Bookmark removed.");
    } catch (error) { setBookmarkMessage(error instanceof Error ? error.message : "Bookmark could not be saved."); }
  }, [chapterId, persistBookmarks, saved]);
  useEffect(()=>{
    let restoredLocalPosition=false;
    try { const raw=localStorage.getItem(`loom-reader-settings`); if(raw){const data=JSON.parse(raw);if(data.fontSize)setFontSize(data.fontSize);if(data.lineHeight)setLineHeight(data.lineHeight);if(data.theme)setTheme(data.theme);} const progress=localStorage.getItem(`loom-progress-${chapterId}`);if(progress){const p=JSON.parse(progress);if(Date.now()-p.at<1000*60*60*24*90&&Number.isFinite(p.y)){window.scrollTo({top:p.y,behavior:"instant" as ScrollBehavior});restoredLocalPosition=true;}} if(!persistBookmarks){setSaved(localStorage.getItem(`loom-bookmark-${chapterId}`)==="1");} } catch {}
    if(!restoredLocalPosition && Number.isFinite(initialPosition) && initialPosition>0) window.scrollTo({top:initialPosition,behavior:"instant" as ScrollBehavior});
    const interval=window.setInterval(()=>{void saveProgress();},5000); const handleHide=()=>{void saveProgress();}; window.addEventListener("pagehide",handleHide); return()=>{window.clearInterval(interval);window.removeEventListener("pagehide",handleHide);};
  },[chapterId,saveProgress,persistBookmarks,initialPosition]);
  useEffect(()=>{try{localStorage.setItem("loom-reader-settings",JSON.stringify({fontSize,lineHeight,theme}));}catch{}},[fontSize,lineHeight,theme]);
  useEffect(()=>{const handleKey=(e:KeyboardEvent)=>{if((e.target as HTMLElement)?.tagName==="INPUT"||(e.target as HTMLElement)?.tagName==="TEXTAREA")return;if(e.key==="ArrowLeft"&&prevHref)window.location.href=prevHref;if(e.key==="ArrowRight"&&nextHref)window.location.href=nextHref;if(e.key.toLowerCase()==="b")void toggleBookmark();if(e.key.toLowerCase()==="c"&&commentsEnabled)document.getElementById("chapter-comments")?.scrollIntoView({behavior:"smooth"});};window.addEventListener("keydown",handleKey);return()=>window.removeEventListener("keydown",handleKey);},[prevHref,nextHref,commentsEnabled,toggleBookmark]);
  return <div className={`reader-theme reader-${theme}`}>
    <div className="reader-progress-track"><div className="reader-progress-fill" style={{width: "0%"}}/></div>
    <div className="reader-topline"><Link href={storyHref} className="reader-back"><ChevronLeft size={17}/> Story page</Link><div className="reader-controls"><button title="Smaller text" aria-label="Smaller text" onClick={()=>setFontSize(n=>Math.max(14,n-1))}><Minus size={15}/></button><span>{fontSize}px</span><button title="Larger text" aria-label="Larger text" onClick={()=>setFontSize(n=>Math.min(28,n+1))}><Plus size={15}/></button><span className="reader-divider"/><button className={theme==="night"?"active":""} onClick={()=>setTheme(t=>t==="night"?"paper":"night")} aria-label="Toggle dark theme">{theme==="night"?<Sun size={16}/>:<Moon size={16}/>}</button><button className={saved?"active":""} title="Bookmark chapter (B)" aria-label="Bookmark chapter" onClick={()=>void toggleBookmark()}><Bookmark size={16} fill={saved?"currentColor":"none"}/></button></div></div>
    {bookmarkMessage && <div className="reader-bookmark-message" role="status">{bookmarkMessage}</div>}
    <article className="reading-article" style={{fontSize:`${fontSize}px`,lineHeight}}><div className="reader-chapter-label">LOOM ORIGINAL · CHAPTER</div><h1>{title}</h1><div className="reader-byline"><BookOpen size={14}/> Take your time. Stay awhile.</div><div className="reader-body">{paragraphs.map((paragraph,index)=><p key={index}>{paragraph}</p>)}</div><div className="reader-end-mark">✦ · ✦ · ✦</div><div className="reader-end-note">You've reached the end of this chapter.</div></article>
    <div className="reader-bottom-nav"><Link className={`reader-nav-button ${!prevHref?"disabled":""}`} href={prevHref||"#"}><ChevronLeft size={17}/><span><small>PREVIOUS</small>Chapter</span></Link><Link className="reader-toc" href={storyHref}><List size={17}/> Contents</Link><Link className={`reader-nav-button next ${!nextHref?"disabled":""}`} href={nextHref||"#"}><span><small>NEXT</small>Chapter</span><ChevronRight size={17}/></Link></div>
    {commentsEnabled && <div className="reader-comment-jump"><MessageCircle size={16}/> <a href="#chapter-comments">Join the conversation</a> <span>Press C to jump to comments</span></div>}
  </div>;
}
