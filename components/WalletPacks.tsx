"use client";
import { useState } from "react";
import { Gem, LockKeyhole, Sparkles } from "lucide-react";
import type { EssencePack } from "@/lib/economy";

export default function WalletPacks({ packs, demoMode }: { packs: EssencePack[]; demoMode: boolean }) {
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  async function buy(packId: string) {
    setBusy(packId); setMessage("");
    try {
      const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ packId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Checkout unavailable.");
      if (result.url) window.location.href = result.url;
      else setMessage("Checkout is not configured. Set the Stripe secret and the three Stripe Price IDs to enable purchases.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Checkout failed."); }
    setBusy("");
  }
  return <>
    {message && <div className="form-alert info" role="status">{message}</div>}
    {demoMode && <div className="demo-banner">Demo preview: currency purchases stay disabled until Supabase and Stripe are configured.</div>}
    <div className="pack-grid">{packs.map((pack, index) => <article key={pack.id} className={`pack-card ${index === 1 ? "pack-featured" : ""}`}>
      {index === 1 && <div className="pack-ribbon">POPULAR</div>}
      <div className="pack-icon"><Gem size={22}/></div><div className="pack-name">{pack.name}</div><div className="pack-essence"><Sparkles size={22}/>{pack.essence.toLocaleString()}<span>Essence</span></div><p>{pack.description}</p><div className="pack-price">{pack.displayPrice}</div>
      <button className={index === 1 ? "button button-primary button-full" : "button button-secondary button-full"} onClick={() => buy(pack.id)} disabled={Boolean(busy)}>{busy === pack.id ? "Opening checkout…" : <><LockKeyhole size={15}/> Purchase securely</>}</button>
    </article>)}</div>
  </>;
}
