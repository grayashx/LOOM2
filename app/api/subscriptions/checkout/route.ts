import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  if (!supabase) return NextResponse.json({ error: "Connect Supabase first." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to subscribe." }, { status: 401 });
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "Subscription billing is not configured." }, { status: 503 });
  try {
    const body = await request.json() as { tierId?: string };
    if (!body.tierId) return NextResponse.json({ error: "Missing subscription tier." }, { status: 400 });
    const admin = supabaseAdmin();
    const { data: tier, error } = await admin.from("subscription_tiers").select("id,author_id,name,description,price_monthly,stripe_price_id,stripe_product_id,active").eq("id", body.tierId).eq("active", true).maybeSingle();
    if (error || !tier) return NextResponse.json({ error: "This tier is unavailable." }, { status: 404 });
    if (tier.author_id === user.id) return NextResponse.json({ error: "You cannot subscribe to your own tier." }, { status: 400 });
    const amountCents = Math.round(Number(tier.price_monthly) * 100);
    if (!Number.isInteger(amountCents) || amountCents < 100 || amountCents > 50000) return NextResponse.json({ error: "Subscription price must be between $1 and $500 per month." }, { status: 400 });
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    let priceId = tier.stripe_price_id;
    if (!priceId) {
      const product = tier.stripe_product_id ? { id: tier.stripe_product_id } : await stripe.products.create({ name: `LOOM · ${tier.name}`, description: tier.description || `Monthly author support tier` });
      const price = await stripe.prices.create({ product: product.id, unit_amount: amountCents, currency: "usd", recurring: { interval: "month" }, metadata: { loom_tier_id: tier.id } });
      priceId = price.id;
      await admin.from("subscription_tiers").update({ stripe_product_id: product.id, stripe_price_id: priceId }).eq("id", tier.id);
    }
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription", line_items: [{ price: priceId, quantity: 1 }], customer_email: user.email || undefined,
      client_reference_id: user.id,
      metadata: { reader_id: user.id, author_id: tier.author_id, tier_id: tier.id },
      subscription_data: { metadata: { reader_id: user.id, author_id: tier.author_id, tier_id: tier.id } },
      success_url: `${siteUrl}/wallet?subscription=success`, cancel_url: `${siteUrl}/wallet?subscription=cancelled`
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("subscription checkout error", error);
    return NextResponse.json({ error: "Could not create subscription checkout." }, { status: 500 });
  }
}
