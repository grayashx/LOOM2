import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabase/server";
import { packById } from "@/lib/economy";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    if (!supabase) return NextResponse.json({ error: "Connect Supabase before purchasing Essence." }, { status: 503 });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in before purchasing Essence." }, { status: 401 });
    if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "Stripe Checkout is not configured yet." }, { status: 503 });
    const body = await request.json() as { packId?: string };
    const pack = packById(body.packId || "");
    if (!pack) return NextResponse.json({ error: "Unknown Essence pack." }, { status: 400 });
    if (!pack.stripePriceId) return NextResponse.json({ error: `Set Stripe Price ID for the ${pack.name} pack in your server environment.` }, { status: 503 });
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: pack.stripePriceId, quantity: 1 }],
      customer_email: user.email || undefined,
      client_reference_id: user.id,
      metadata: { user_id: user.id, pack_id: pack.id, essence_amount: String(pack.essence) },
      payment_intent_data: { metadata: { user_id: user.id, pack_id: pack.id } },
      success_url: `${siteUrl}/wallet?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/wallet?purchase=cancelled`
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("checkout error", error);
    return NextResponse.json({ error: "Could not create checkout session." }, { status: 500 });
  }
}
