import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { packById } from "@/lib/economy";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !stripeKey || !signature) return NextResponse.json({ error: "Webhook is not configured." }, { status: 400 });
  const rawBody = await request.text();
  let event: Stripe.Event;
  try { event = new Stripe(stripeKey).webhooks.constructEvent(rawBody, signature, secret); }
  catch (error) { return NextResponse.json({ error: `Invalid Stripe signature: ${error instanceof Error ? error.message : "unknown error"}` }, { status: 400 }); }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null };
    const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
    if (!subscriptionId || Number(invoice.amount_paid || 0) <= 0) return NextResponse.json({ received: true, skipped: "invoice-without-subscription-or-payment" });
    try {
      const stripe = new Stripe(stripeKey);
      const subscription = typeof invoice.subscription === "object" && invoice.subscription
        ? invoice.subscription
        : await stripe.subscriptions.retrieve(subscriptionId);
      const authorId = subscription.metadata?.author_id;
      const readerId = subscription.metadata?.reader_id;
      const tierId = subscription.metadata?.tier_id;
      if (!authorId || !readerId || !tierId) return NextResponse.json({ received: true, skipped: "not-a-loom-subscription" });
      const admin = supabaseAdmin();
      const externalRef = `stripe-invoice:${invoice.id}`;
      const { data: prior } = await admin.from("author_earnings").select("id").eq("external_ref", externalRef).maybeSingle();
      if (prior) return NextResponse.json({ received: true, duplicate: true });
      const { data: setting } = await admin.from("platform_settings").select("value").eq("key", "author_subscription_share").maybeSingle();
      const configuredShare = Number(setting?.value ?? 0.9);
      const share = Number.isFinite(configuredShare) ? Math.min(1, Math.max(0, configuredShare)) : 0.9;
      const grossUsd = Number(invoice.amount_paid) / 100;
      const authorAmount = Number((grossUsd * share).toFixed(4));
      if (authorAmount <= 0) return NextResponse.json({ received: true, skipped: "no-author-share" });
      const { error } = await admin.from("author_earnings").insert({ author_id: authorId, amount_usd: authorAmount, source: "author_subscription", external_ref: externalRef, status: "accrued" });
      if (error) {
        const { data: duplicate } = await admin.from("author_earnings").select("id").eq("external_ref", externalRef).maybeSingle();
        if (duplicate) return NextResponse.json({ received: true, duplicate: true });
        console.error("subscription earnings webhook DB error", error);
        return NextResponse.json({ error: "Subscription earnings sync failed." }, { status: 500 });
      }
      return NextResponse.json({ received: true, subscription_earnings: true });
    } catch (error) {
      console.error("subscription invoice webhook error", error);
      return NextResponse.json({ error: "Subscription earnings sync failed." }, { status: 500 });
    }
  }

  if (event.type.startsWith("customer.subscription.")) {
    const sub = event.data.object as Stripe.Subscription;
    const readerId = sub.metadata?.reader_id;
    const authorId = sub.metadata?.author_id;
    const tierId = sub.metadata?.tier_id;
    if (!readerId || !authorId || !tierId) return NextResponse.json({ received: true, skipped: "not-a-loom-subscription" });
    const status = sub.status === "active" || sub.status === "trialing" ? "active" : sub.status === "past_due" || sub.status === "unpaid" ? "past_due" : sub.status === "canceled" || event.type === "customer.subscription.deleted" ? "canceled" : "expired";
    // Stripe API 2025-03-31.basil (used by stripe-node v18+) moved billing
    // periods from Subscription to SubscriptionItem. Use the latest item end
    // date so multi-item subscriptions remain valid too.
    const itemPeriodEnds = sub.items.data
      .map((item) => item.current_period_end)
      .filter((value): value is number => typeof value === "number");
    const currentPeriodEnd = itemPeriodEnds.length > 0 ? Math.max(...itemPeriodEnds) : null;
    try {
      const admin = supabaseAdmin();
      const { error } = await admin.from("subscriptions").upsert({
        reader_id: readerId, author_id: authorId, tier_id: tierId, status,
        current_period_end: currentPeriodEnd !== null ? new Date(currentPeriodEnd * 1000).toISOString() : null,
        provider_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
        provider_subscription_id: sub.id
      }, { onConflict: "reader_id,author_id" });
      if (error) { console.error("subscription webhook DB error", error); return NextResponse.json({ error: "Subscription sync failed." }, { status: 500 }); }
      return NextResponse.json({ received: true });
    } catch (error) { console.error("subscription webhook error", error); return NextResponse.json({ error: "Subscription sync failed." }, { status: 500 }); }
  }
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") return NextResponse.json({ received: true });
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.mode === "subscription") return NextResponse.json({ received: true, subscription: true });
  if (session.payment_status !== "paid") return NextResponse.json({ received: true, skipped: "payment-not-paid" });
  const userId = session.metadata?.user_id || session.client_reference_id;
  const packId = session.metadata?.pack_id;
  const amountFromMetadata = Number(session.metadata?.essence_amount);
  const pack = packById(packId || "");
  if (!userId || !pack || amountFromMetadata !== pack.essence || !session.id) {
    console.error("Stripe session metadata did not match a known Essence pack", session.id);
    return NextResponse.json({ error: "Invalid purchase metadata." }, { status: 400 });
  }
  try {
    const admin = supabaseAdmin();
    const { error } = await admin.rpc("credit_purchased_essence", { p_user_id: userId, p_amount: pack.essence, p_stripe_session_id: session.id });
    if (error) {
      // Idempotency is enforced in the database. An already-credited session is safely acknowledged.
      const { data: prior } = await admin.from("wallet_ledger").select("id").eq("external_ref", session.id).maybeSingle();
      if (prior) return NextResponse.json({ received: true, duplicate: true });
      console.error("Essence credit failed", error);
      return NextResponse.json({ error: "Wallet credit failed." }, { status: 500 });
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("stripe webhook credit error", error);
    return NextResponse.json({ error: "Wallet credit failed." }, { status: 500 });
  }
}
