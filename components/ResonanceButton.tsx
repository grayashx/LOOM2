"use client";
import { useState } from "react";
import { Sparkles } from "lucide-react";

export default function ResonanceButton({ seriesId, chapterId }: { seriesId: string; chapterId?: string }) {
  const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false); const [done,setDone]=useState(false);
  async function give(){setBusy(true);setMessage("");try{const response=await fetch("/api/resonance",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({seriesId,chapterId})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Could not send Resonance.");setDone(true);setMessage(`Resonance sent. ${data.remaining} left today.`);}catch(e){setMessage(e instanceof Error?e.message:"Could not send Resonance.");}setBusy(false);}
  return <div className="resonance-action"><button className="button button-secondary" onClick={give} disabled={busy||done}><Sparkles size={16}/>{busy?"Sending…":done?"Resonance sent":"Give daily Resonance"}</button>{message&&<small role="status">{message}</small>}</div>;
}
