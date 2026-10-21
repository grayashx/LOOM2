# LOOM — Serialized Fiction Platform

A GitHub-ready foundation for a webnovel reading and writing platform inspired by the supplied LOOM product brief. Includes responsive discovery, a chapter reader, author studio/drafts, reader library actions, comments, rankings, the Quest tab, separate rewarded/purchased Essence balances, Stripe Checkout wiring, Supabase RLS, and an audited wallet ledger.

> **Deployment honesty:** this repository is a functioning MVP foundation, not a claim that a one-shot generated codebase equals Webnovel's production scale or moderation/payment operations. Accounts and durable features require a Supabase project; purchases require a Stripe account/webhook; real rewarded ads require a supported ad provider account and adapting its signed server-to-server postback to the documented callback contract. The app deliberately does not grant real production currency just because a browser says an ad was watched.

## Stack

- Next.js App Router + TypeScript + React
- Supabase Auth + Postgres + Row-Level Security
- Stripe Checkout + signed webhook for purchased Essence
- Server-verified ad postback contract for Quest rewards

## Run locally

1. Install Node.js 20.9+.
2. Copy `.env.example` to `.env.local`.
3. Create a Supabase project and run `supabase/migrations/0001_loom.sql` in the Supabase SQL editor (or use the Supabase CLI).
4. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
5. Install/run (Next.js is pinned to 15.5.28, the patched 15.x version for current October 2026 App Router advisories):

   ```bash
   npm install
   npm run dev
   ```

6. Open `http://localhost:3000`.
7. For payments, set Stripe test keys, then configure the webhook endpoint `https://YOUR_DOMAIN/api/stripe/webhook` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, and `invoice.paid`.

Without Supabase configured, public pages use clearly marked local demo data. Authentication, persistence, currency, and production quests require Supabase.

## Important setup steps

### Supabase

- Apply `supabase/migrations/0001_loom.sql`.
- Enable email/password auth in Supabase Auth.
- Configure the Auth site's Site URL and allowed redirect URLs.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. Never add it to a `NEXT_PUBLIC_` variable.
- Review the RLS policies and have a security-minded engineer audit them before real money or private manuscripts go live.

### Rewarded ads / Quest tab

The server issues a pending ad session, then only a valid, timely, unique provider callback can credit **rewarded Essence**. The Quest screen reads the reward amount and daily limit from the active database quest so the UI matches the server authority. Callback contract (adapt your provider's macros/signature format to it):

```json
{
  "session_id": "UUID issued by /api/ads/session",
  "event_id": "provider-unique-event-id",
  "status": "completed",
  "reward_essence": 5
}
```

The provider sends this JSON to `POST /api/ads/callback` with header `x-loom-signature: sha256=<hex HMAC-SHA256 of the exact raw request body using AD_PROVIDER_CALLBACK_SECRET>`. This is a generic adapter contract, not a claim that every ad provider speaks this protocol out of the box. Integrate the chosen provider's verified postback / rewarded callback and obtain approval for incentivized inventory. Configure `AD_PROVIDER_START_URL` to the provider's ad-start URL; LOOM appends `session_id` and `callback_url` parameters. If not configured in production, the app refuses to start a real ad reward. In development, the Quest page offers a visibly labeled simulator only.

### Essence rules

- **Rewarded Essence** is funded by completed, provider-verified quests and kept separate from paid Essence.
- **Purchased Essence** is credited only from a verified Stripe webhook, never a client request.
- Both may be used for eligible chapter unlocks. The source is tracked in an append-only ledger; earnings accrued from paid-source spends only are kept separate from reward currency.
- Resonance is a separate daily, free-support signal and never enters paid earnings or public ranking scores.
- A finance professional must review pricing, taxes, chargebacks, payouts, and consumer disclosures before enabling monetization for real users.

### Stripe product packs

Edit `lib/economy.ts` and set `STRIPE_PRICE_ESSENCE_SMALL`, `STRIPE_PRICE_ESSENCE_MEDIUM`, and `STRIPE_PRICE_ESSENCE_LARGE` to the matching Price IDs (also listed in `.env.example`). Checkout metadata is signed and checked by Stripe's webhook. Products are fixed server-side; the client cannot pick the amount to credit.

### Deploy to GitHub / Vercel

1. Create a GitHub repository and push this folder.
2. Import it into Vercel (or another Node.js host).
3. Add all environment variables from `.env.example` in the hosting dashboard.
4. Deploy and set `NEXT_PUBLIC_SITE_URL` to the production URL.
5. Configure Supabase URLs and Stripe's production webhook.
6. Before public launch: test auth/RLS, abuse rate limits, chapter lock leakage, payments/refunds, backups, privacy policy, terms, takedown process, moderation staffing, and local tax/payout obligations.

## Implemented routes

- `/` — home / recommended stories
- `/explore`, `/rankings` — discovery and labeled ranking lists
- `/story/[slug]` and `/story/[slug]/chapter/[chapterId]` — story page and reader
- `/quests` — watch-ad quests and claim status
- `/api/ads/session`, `/api/ads/callback` — provider-backed rewarded ad sessions and verified postbacks
- `/api/checkout`, `/api/stripe/webhook` — paid Essence checkout and signed payment fulfillment
- `/api/subscriptions/checkout`, `/api/subscriptions/cancel` — recurring creator memberships
- `/wallet` — Essence balance and purchase packs
- `/studio` — author dashboard
- `/studio/new` — create a series
- `/studio/[seriesId]` — chapter list and editor entry
- `/studio/[seriesId]/analytics` — Story Health with saved progress and event samples
- `/studio/subscriptions` — author-defined monthly membership tiers
- `/studio/payouts` — creator earnings ledger and manual payout requests
- `/author/[username]` — public author profile
- `/studio/[seriesId]/editor/[chapterId]` — autosaving editor; use `new` for a fresh chapter
- `/login`, `/signup` — Supabase email/password auth

## Before calling it production-ready

This code is intentionally a strong starting point, but a Webnovel-scale launch still needs provider-specific ad integration, payment dispute/refund automation, payout onboarding and KYC where required, subscription billing, content scanning/plagiarism review, staffed human moderation and appeals, email delivery, analytics aggregation, load testing, backups/restore drills, observability, accessibility QA, and a penetration test. Do not claim those are active until you configure, implement, and test them.

## Troubleshooting

- **Render build error in `supabase/functions/compute-rankings/index.ts` about `https://esm.sh/@supabase/supabase-js`:** Supabase Edge Functions are Deno programs, not Next.js/Node application files. The root `tsconfig.json` now excludes `supabase/functions/**` from the Next.js TypeScript build. Deploy the updated repository so Render uses this `tsconfig.json`. The Edge Function remains in the repo for deployment with the Supabase CLI; it is intentionally not compiled by `next build`.

- **Stripe webhook TypeScript error for `Subscription.current_period_end`:** this project uses `stripe` v18, aligned to Stripe API `2025-03-31.basil`, where billing-period timestamps moved from the Subscription object to its Subscription Items. The webhook now reads `sub.items.data[*].current_period_end` and persists the latest item period end. Redeploy the updated project instead of editing the dependency types. See the [official Stripe changelog](https://docs.stripe.com/changelog/basil/2025-03-31/deprecate-subscription-current-period-start-and-end).
- **Supabase `GenericSchema` / `SupabaseClient` TypeScript error in `lib/supabase/server.ts`:** the server helper now uses the concrete return type inferred by `createServerClient()` rather than annotating it with the default `SupabaseClient` generic. If deploying from a stale checkout, pull the latest project files and rebuild; do not cast the client or loosen type checking globally.
