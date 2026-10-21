import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  if (!supabase) return NextResponse.json({ error: "Connect Supabase first." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "Billing is not configured." }, { status: 503 });
  try {
    const body = await request.json() as { subscriptionId?: string };
    if (!body.subscriptionId) return NextResponse.json({ error: "Missing subscription." }, { status: 400 });
    const { data: sub } = await supabase.from("subscriptions").select("id,provider_subscription_id,status").eq("id", body.subscriptionId).eq("reader_id", user.id).maybeSingle();
    if (!sub || !sub.provider_subscription_id || sub.status !== "active") return NextResponse.json({ error: "Active subscription not found." }, { status: 404 });
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    await stripe.subscriptions.update(sub.provider_subscription_id, { cancel_at_period_end: true });
    return NextResponse.json({ ok: true, message: "Cancellation is scheduled. Access remains until the end of the current paid period." });
  } catch (error) {
    console.error("subscription cancel error", error);
    return NextResponse.json({ error: "Could not cancel this subscription." }, { status: 500 });
  }
}
