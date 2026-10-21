"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Gift, Sparkles } from "lucide-react";

export default function TipAuthorButton({ authorId }: { authorId: string }) {
  const [amount,setAmount]=useState(25);const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const [ok,setOk]=useState(false);const router=useRouter();
  async function tip(){setBusy(true);setMessage("");setOk(false);try{const response=await fetch("/api/tips",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({authorId,amount})});const result=await response.json();if(!response.ok)throw new Error(result.error||"Could not send tip.");setOk(true);setMessage(`Sent ${amount} Essence to the author. Thank you for supporting their work.`);router.refresh();}catch(e){setMessage(e instanceof Error?e.message:"Could not send tip.");}setBusy(false);}
  return <div className="tip-author-action"><div className="tip-amounts" role="group" aria-label="Tip amount">{[10,25,50,100].map((value)=><button className={amount===value?"selected":""} type="button" key={value} onClick={()=>setAmount(value)}>{value}</button>)}</div><button className="button button-secondary button-full" type="button" onClick={tip} disabled={busy||ok}><Gift size={15}/>{busy?"Sending…":ok?"Thank you!":`Tip author · ${amount} Essence`}</button>{message&&<small className={ok?"tip-success":"tip-error"} role="status">{message}</small>}<p className="microcopy"><Sparkles size={12}/> Quest-earned tips support author engagement; only paid-source Essence contributes to creator earnings.</p></div>;
}
