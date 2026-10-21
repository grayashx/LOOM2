# Rewarded ad callback contract

The Next.js route `POST /api/ads/callback` is the canonical signed callback endpoint for the first deployment. If you choose to deploy a Supabase Edge Function adapter instead, keep these invariants:

- Verify the provider's own server signature/token using a secret stored only on the server.
- Resolve the session ID against `ad_sessions`; never trust the callback's user ID or reward amount by itself.
- Require status completed, matching provider/reward, unexpired pending session, and a unique provider event ID.
- Call only the `complete_ad_quest` RPC through the service role after validation.
- Do not return a credit result to a browser before the database confirms success.

Each ad network has its own callback schema and approval process; implement and test the chosen provider's native adapter before production use.
