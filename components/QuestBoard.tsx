"use client";
import { useState } from "react";
import { CheckCircle2, CirclePlay, Clock3, Sparkles, ShieldCheck } from "lucide-react";

export default function QuestBoard({ demoMode, rewardEssence=5 }: { demoMode: boolean; rewardEssence?: number }) {
  const [sessionId, setSessionId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [claimed, setClaimed] = useState(false);

  async function start() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/ads/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questId: "rewarded-video-daily" }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not start quest.");
      setSessionId(result.sessionId);
      if (result.mode === "provider" && result.adUrl) {
        window.open(result.adUrl, "_blank", "noopener,noreferrer");
        setMessage("Ad session started. Finish the ad in the new tab; Essence appears after the provider verifies completion. Refresh the wallet after a moment.");
      } else if (result.mode === "development") {
        setMessage("Development simulator only — no real ad was shown. Use the test button below to exercise the callback flow.");
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Something went wrong."); }
    setBusy(false);
  }

  async function simulate() {
    if (!sessionId) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/ads/dev-complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The test reward failed.");
      setClaimed(true); setMessage(`Test reward credited: +${result.essence} Essence. This development-only simulator is disabled in production.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Something went wrong."); }
    setBusy(false);
  }

  return <section className="quest-card">
    <div className="quest-art"><div className="quest-orb"><Sparkles size={31}/></div><div className="quest-art-lines"/></div>
    <div className="quest-content">
      <div className="eyebrow">DAILY QUEST · REWARDED VIDEO</div>
      <h3>Watch an ad, support your next chapter</h3>
      <p>Complete a registered partner ad to earn bonus Essence. Rewards are credited only after a verified provider callback; purchased Essence and ad rewards stay separately tracked.</p>
      <div className="quest-details"><span><Clock3 size={15}/> Usually 15–30 sec</span><span><Sparkles size={15}/> +{rewardEssence} Essence</span><span><ShieldCheck size={15}/> Verified completion</span></div>
      {message && <div className={`form-alert ${claimed ? "success" : "info"}`} role="status">{message}</div>}
      <div className="quest-actions">
        <button className="button button-primary" onClick={start} disabled={busy || claimed}><CirclePlay size={17}/>{busy ? "Working…" : claimed ? "Completed in demo" : "Start quest"}</button>
        {demoMode && sessionId && !claimed && <button className="button button-secondary" onClick={simulate} disabled={busy}>Simulate completion</button>}
      </div>
      <p className="microcopy">Daily limit applies. No reward for an incomplete, duplicate, expired, or unverified ad session.</p>
    </div>
  </section>;
}
