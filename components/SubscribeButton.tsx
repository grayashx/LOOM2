"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, LoaderCircle } from "lucide-react";

export default function SubscribeButton({ tierId, name, price, active = false }: { tierId: string; name: string; price: string; active?: boolean }) {
  const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  async function subscribe(){setBusy(true);setError("");try{const response=await fetch("/api/subscriptions/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tierId})});const result=await response.json();if(!response.ok)throw new Error(result.error||"Could not open checkout.");if(result.url)window.location.href=result.url;}catch(e){setError(e instanceof Error?e.message:"Could not subscribe.");}setBusy(false);}
  return <div className="subscribe-action"><button className="button button-secondary button-small" onClick={subscribe} disabled={busy||active}>{active?<Crown size={14}/>:busy?<LoaderCircle size={14}/>:<Crown size={14}/>} {active?"Subscribed":busy?"Opening…":`Support · ${price}/mo`}</button>{error&&<small role="status">{error}</small>}</div>;
}
