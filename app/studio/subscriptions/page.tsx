import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BadgeDollarSign, Check, Crown, Plus, ShieldCheck, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { createSubscriptionTier } from "@/app/actions";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Author memberships" };

export default async function StudioSubscriptionsPage({searchParams}:{searchParams:Promise<{error?:string;created?:string}>}) {
  const params=await searchParams;
  const supabase=await supabaseServer();
  if(!supabase) redirect("/signup?next=%2Fstudio%2Fsubscriptions");
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect("/login?next=%2Fstudio%2Fsubscriptions");
  const {data:tiers}=await supabase.from("subscription_tiers").select("id,name,description,price_monthly,benefits,active,created_at").eq("author_id",user.id).order("created_at",{ascending:false});
  const {data:subs}=await supabase.from("subscriptions").select("id,status,tier_id").eq("author_id",user.id).eq("status","active");
  const subscribers=subs?.length||0;
  return <section className="section-wrap page-section creator-finance-page">
    <Link className="back-link" href="/studio"><ArrowLeft size={16}/> Author Studio</Link>
    <div className="page-title-row"><div><div className="page-kicker"><Crown size={16}/> CREATOR MEMBERSHIPS</div><h1>Build your <em>inner circle.</em></h1><p>Offer monthly support with clearly described benefits. Readers subscribe voluntarily, and cancellation is handled through a simple account action.</p></div><div className="page-title-art"><Users size={28}/></div></div>
    {params.error&&<div className="form-alert error">{params.error}</div>}{params.created&&<div className="form-alert success"><Check size={17}/> Your membership tier was created.</div>}
    <div className="studio-metric-grid"><div className="studio-metric"><span className="metric-icon"><Crown size={18}/></span><small>ACTIVE SUPPORTERS</small><strong>{subscribers}</strong><span>Currently active subscriptions</span></div><div className="studio-metric"><span className="metric-icon"><BadgeDollarSign size={18}/></span><small>YOUR TIERS</small><strong>{tiers?.length||0}</strong><span>Monthly membership offers</span></div><div className="studio-metric"><span className="metric-icon"><ShieldCheck size={18}/></span><small>PAYMENT STATUS</small><strong>Stripe</strong><span>Configured when a reader subscribes</span></div></div>
    <div className="creator-finance-grid">
      <section className="creator-panel"><div className="section-heading"><div><div className="eyebrow">MEMBERSHIP EDITOR</div><h2>Create a tier</h2></div></div>
        <form action={createSubscriptionTier} className="creation-form finance-form">
          <label>Tier name<input name="name" required minLength={3} maxLength={60} placeholder="Early Reader, Supporter, Lore Keeper"/></label>
          <label>Monthly price (USD)<input name="priceMonthly" type="number" required min="1" max="500" step="0.01" defaultValue="4.99"/><small>Between $1 and $500 per month. This starter checkout supports USD.</small></label>
          <label>Short description<textarea name="description" rows={3} maxLength={500} placeholder="Tell readers what their support means and what this tier is for."/></label>
          <label>Benefits <span className="label-optional">one per line · up to 10</span><textarea name="benefits" rows={4} placeholder={"Early access to chapters\nBonus lore notes\nMonthly Q&A post"}/></label>
          <div className="form-guidance"><ShieldCheck size={18}/><div><strong>Be clear about what you promise.</strong><p>Only list benefits you can reliably deliver. Do not promise guaranteed publishing, investment returns, or outcomes beyond your control.</p></div></div>
          <button className="button button-primary button-large" type="submit"><Plus size={17}/> Create tier</button>
        </form>
      </section>
      <section className="creator-panel"><div className="section-heading"><div><div className="eyebrow">YOUR OFFERS</div><h2>Published tiers</h2></div></div>
        {tiers?.length?<div className="finance-list">{tiers.map((tier:any)=><article className="finance-list-row" key={tier.id}><div className="finance-list-icon"><Crown size={18}/></div><div className="finance-list-main"><strong>{tier.name}</strong><p>{tier.description||"Monthly author support"}</p><div className="tag-row">{Array.isArray(tier.benefits)&&tier.benefits.slice(0,4).map((item:string)=><span className="tag" key={item}>{item}</span>)}</div></div><div className="finance-list-amount"><strong>${Number(tier.price_monthly).toFixed(2)}</strong><small>/ month</small><span className={`status-pill ${tier.active?"published":"draft"}`}>{tier.active?"Active":"Paused"}</span></div></article>)}</div>:<div className="empty-state compact-empty"><Crown size={27}/><h3>No tiers yet</h3><p>Create your first optional monthly support tier. It will be displayed on your public author story pages.</p></div>}
        <div className="form-guidance"><ShieldCheck size={18}/><div><strong>Payments need setup.</strong><p>Readers pay through Stripe Checkout. Configure and test your Stripe keys and webhook before relying on subscription status or revenue reporting.</p></div></div>
      </section>
    </div>
  </section>;
}
