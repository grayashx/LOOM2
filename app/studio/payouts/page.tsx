import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BadgeDollarSign, CheckCircle2, CircleDollarSign, Clock3, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { requestPayout } from "@/app/actions";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Creator earnings" };
const money=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n);

export default async function StudioPayoutsPage({searchParams}:{searchParams:Promise<{error?:string;requested?:string}>}) {
  const params=await searchParams;
  const supabase=await supabaseServer();if(!supabase)redirect("/signup?next=%2Fstudio%2Fpayouts");
  const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login?next=%2Fstudio%2Fpayouts");
  const [{data:earnings},{data:requests}]=await Promise.all([
    supabase.from("author_earnings").select("id,amount_usd,status,source,created_at").eq("author_id",user.id).order("created_at",{ascending:false}).limit(100),
    supabase.from("payout_requests").select("id,amount_usd,status,created_at,updated_at,admin_note").eq("author_id",user.id).order("created_at",{ascending:false}).limit(50)
  ]);
  const earned=(earnings||[]).filter((row:any)=>row.status==="accrued").reduce((sum:number,row:any)=>sum+Number(row.amount_usd||0),0);
  const held=(earnings||[]).filter((row:any)=>row.status==="on_hold").reduce((sum:number,row:any)=>sum+Number(row.amount_usd||0),0);
  const reserved=(requests||[]).filter((row:any)=>["requested","approved","processing","paid"].includes(row.status)).reduce((sum:number,row:any)=>sum+Number(row.amount_usd||0),0);
  const available=Math.max(0,Math.floor((earned-reserved)*100)/100);
  return <section className="section-wrap page-section creator-finance-page">
    <Link className="back-link" href="/studio"><ArrowLeft size={16}/> Author Studio</Link>
    <div className="page-title-row"><div><div className="page-kicker"><CircleDollarSign size={16}/> CREATOR FINANCES</div><h1>Your work has <em>value.</em></h1><p>Review creator earnings and submit payout requests. Requests are reviewed manually; this starter does not automatically transfer money to a bank account.</p></div><div className="page-title-art"><BadgeDollarSign size={28}/></div></div>
    {params.error&&<div className="form-alert error">{params.error}</div>}{params.requested&&<div className="form-alert success"><CheckCircle2 size={17}/> Payout request submitted for review.</div>}
    <div className="studio-metric-grid payout-metrics"><div className="studio-metric"><span className="metric-icon"><CircleDollarSign size={18}/></span><small>AVAILABLE TO REQUEST</small><strong>{money(available)}</strong><span>Accrued earnings after pending requests</span></div><div className="studio-metric"><span className="metric-icon"><Clock3 size={18}/></span><small>ON HOLD</small><strong>{money(held)}</strong><span>Revenue temporarily held for review</span></div><div className="studio-metric"><span className="metric-icon"><ShieldCheck size={18}/></span><small>MINIMUM REQUEST</small><strong>$20.00</strong><span>Requests remain subject to review</span></div></div>
    <div className="creator-finance-grid">
      <section className="creator-panel"><div className="section-heading"><div><div className="eyebrow">REQUEST A WITHDRAWAL</div><h2>Submit payout request</h2></div></div>
        <form action={requestPayout} className="creation-form finance-form"><label>Amount (USD)<input type="number" name="amountUsd" required min="20" max={available.toFixed(2)} step="0.01" defaultValue={available>=20?Math.floor(available*100)/100:"20.00"}/><small>Current maximum available: {money(available)}</small></label><button className="button button-primary button-large" type="submit" disabled={available<20}>Request payout review</button><p className="muted-help">Please submit only if you can complete any identity, tax, or payout-provider checks required for your region. Payment details are collected separately during the platform's payout onboarding.</p></form>
        <div className="form-guidance"><ShieldCheck size={18}/><div><strong>Requesting isn't the same as paid.</strong><p>Admins need to approve and fulfil the transfer using a configured payout provider. Statuses and admin notes are visible in your history.</p></div></div>
      </section>
      <section className="creator-panel"><div className="section-heading"><div><div className="eyebrow">REQUEST HISTORY</div><h2>Recent payouts</h2></div></div>
        {requests?.length?<div className="finance-list">{requests.map((row:any)=><article className="finance-list-row" key={row.id}><div className="finance-list-icon"><Clock3 size={18}/></div><div className="finance-list-main"><strong>{new Date(row.created_at).toLocaleDateString()}</strong><p>{row.admin_note||"Awaiting review or processing."}</p><span className={`status-pill ${row.status}`}>{row.status}</span></div><div className="finance-list-amount"><strong>{money(Number(row.amount_usd))}</strong></div></article>)}</div>:<div className="empty-state compact-empty"><CircleDollarSign size={27}/><h3>No payout requests</h3><p>When you have at least $20 of available earnings, you can request a review.</p></div>}
      </section>
    </div>
    <section className="creator-panel finance-history-panel"><div className="section-heading"><div><div className="eyebrow">EARNINGS LEDGER</div><h2>Creator activity</h2></div></div>{earnings?.length?<div className="finance-list">{earnings.map((row:any)=><article className="finance-list-row" key={row.id}><div className="finance-list-icon"><BadgeDollarSign size={18}/></div><div className="finance-list-main"><strong>{String(row.source).replaceAll("_"," ")}</strong><p>{new Date(row.created_at).toLocaleString()}</p><span className={`status-pill ${row.status}`}>{row.status}</span></div><div className="finance-list-amount"><strong>{money(Number(row.amount_usd))}</strong></div></article>)}</div>:<div className="empty-state compact-empty"><BadgeDollarSign size={27}/><h3>No earnings recorded yet</h3><p>When readers support your work with eligible paid Essence, earning events will appear here.</p></div>}</section>
  </section>;
}
