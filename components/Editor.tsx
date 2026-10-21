"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Cloud, FileText, Send, Save } from "lucide-react";
import { saveChapterDraft } from "@/app/actions";

export default function Editor({ seriesId, chapterId, initialTitle = "", initialContent = "", initialPaywallType = "free", initialPriceEssence = 10 }: { seriesId: string; chapterId: string; initialTitle?: string; initialContent?: string; initialPaywallType?: string; initialPriceEssence?: number }) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [paywallType, setPaywallType] = useState(initialPaywallType);
  const [priceEssence, setPriceEssence] = useState(initialPriceEssence);
  const [savedId, setSavedId] = useState(chapterId);
  const [status, setStatus] = useState("Changes are saved locally until the first autosave.");
  const [isPending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const save = useCallback((publish = false) => {
    if (!title.trim()) { setStatus("Add a chapter title to save."); return; }
    setStatus(publish ? "Publishing…" : "Saving draft…");
    startTransition(async () => {
      const result = await saveChapterDraft({ seriesId, chapterId: savedId, title, content, publish, paywallType, priceEssence });
      if (!result.ok) { setStatus(result.error || "Save failed."); return; }
      if (result.chapterId && result.chapterId !== savedId) {
        setSavedId(result.chapterId);
        window.history.replaceState(null, "", `/studio/${seriesId}/editor/${result.chapterId}`);
      }
      setStatus(publish ? "Published successfully." : `Saved at ${new Date().toLocaleTimeString()}`);
      router.refresh();
      if (publish && result.chapterId) router.push(`/studio/${seriesId}`);
    });
  }, [chapterId, content, paywallType, priceEssence, router, savedId, seriesId, title]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(false), 10_000);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [title, content, save]);

  return <div className="editor-shell">
    <div className="editor-toolbar"><div className="editor-status"><Cloud size={16}/><span>{isPending ? "Saving…" : status}</span></div><div className="editor-tools"><button className="button button-secondary button-small" onClick={() => save(false)} disabled={isPending}><Save size={15}/> Save draft</button><button className="button button-primary button-small" onClick={() => save(true)} disabled={isPending}><Send size={15}/> Publish chapter</button></div></div>
    <label className="editor-title-label">CHAPTER TITLE<input className="editor-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Chapter 1 — A Beginning" maxLength={160}/></label>
    <div className="editor-access-row"><label>CHAPTER ACCESS<select value={paywallType} onChange={(e)=>setPaywallType(e.target.value)}><option value="free">Free to read</option><option value="embers">Unlock with Essence</option><option value="subscriber">Subscriber-only</option></select></label>{paywallType==="embers"&&<label>UNLOCK PRICE<input type="number" min={1} max={100000} step={1} value={priceEssence} onChange={(e)=>setPriceEssence(Math.max(1,Math.floor(Number(e.target.value)||1)))}/></label>}{paywallType==="subscriber"&&<p>Readers need an active author subscription. Subscription checkout must be configured before using this option for a paid launch.</p>}</div>
    <div className="editor-writing-area"><div className="editor-gutter"><FileText size={16}/><span>MANUSCRIPT</span></div><textarea className="manuscript" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Every good story begins somewhere…\n\nWrite without fear. Your draft autosaves every 10 seconds." spellCheck /></div>
    <div className="editor-footer"><span>{content.trim() ? content.trim().split(/\s+/).length.toLocaleString() : 0} words</span><span>Revision snapshots are kept when saved text changes.</span></div>
  </div>;
}
