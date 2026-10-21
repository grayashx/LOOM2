"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Sparkles } from "lucide-react";

export default function UnlockChapter({ chapterId, cost }: { chapterId: string; cost: number }) {
  const [busy,setBusy]=useState(false); const [error,setError]=useState(""); const router=useRouter();
  async function unlock(){setBusy(true);setError("");try{const response=await fetch("/api/chapters/unlock",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chapterId})});const result=await response.json();if(!response.ok)throw new Error(result.error||"Unlock failed.");router.refresh();}catch(e){setError(e instanceof Error?e.message:"Unlock failed.");}setBusy(false);}
  return <div className="locked-panel"><div className="locked-icon"><LockKeyhole size={24}/></div><div className="eyebrow">CHAPTER ACCESS</div><h2>This chapter is waiting for you.</h2><p>Unlock it with Essence, or support the author with a subscription when one is available. Rewarded Essence and purchased Essence both work here; the source stays separately recorded.</p><div className="unlock-cost"><Sparkles size={20}/><strong>{cost.toLocaleString()}</strong><span>Essence</span></div>{error&&<div className="form-alert error">{error}</div>}<button className="button button-primary button-large" onClick={unlock} disabled={busy}>{busy?"Unlocking…":"Unlock chapter"}</button><p className="microcopy">If your balance is low, <a href="/quests">earn Essence in Quests</a> or <a href="/wallet">visit the wallet</a>.</p></div>;
}
