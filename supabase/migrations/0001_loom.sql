-- LOOM initial schema. Review against your Supabase/Postgres version before production.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (char_length(username) between 3 and 30),
  display_name text not null default 'Reader' check (char_length(display_name) between 1 and 80),
  bio text not null default '' check (char_length(bio) <= 1600),
  avatar_url text,
  banner_url text,
  role text not null default 'reader' check (role in ('reader','author','moderator','admin')),
  privacy_settings jsonb not null default '{"reading_history":"private","currently_reading":"private"}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  paid_essence bigint not null default 0 check (paid_essence >= 0),
  rewarded_essence bigint not null default 0 check (rewarded_essence >= 0),
  resonance_balance integer not null default 3 check (resonance_balance between 0 and 3),
  resonance_reset_at date not null default (timezone('utc', now())::date),
  standing bigint not null default 0 check (standing >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.series (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  slug text not null unique check (char_length(slug) between 3 and 100),
  description text not null default '' check (char_length(description) <= 5000),
  cover_url text,
  genre text not null default 'Fantasy',
  tags text[] not null default '{}',
  content_warnings text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft','published','hidden')),
  completed boolean not null default false,
  comments_enabled boolean not null default true,
  inline_reactions_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists series_status_updated_idx on public.series(status, updated_at desc);
create index if not exists series_author_idx on public.series(author_id, updated_at desc);
create index if not exists series_genre_idx on public.series(genre);
create index if not exists series_tags_gin_idx on public.series using gin(tags);

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.series(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  content text not null default '',
  order_index integer not null check (order_index >= 1),
  status text not null default 'draft' check (status in ('draft','scheduled','published')),
  scheduled_at timestamptz,
  published_at timestamptz,
  paywall_type text not null default 'free' check (paywall_type in ('free','embers','subscriber')),
  price_essence integer not null default 0 check (price_essence >= 0 and price_essence <= 100000),
  word_count integer generated always as (array_length(regexp_split_to_array(trim(content), '\s+'), 1)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(series_id, order_index)
);
create index if not exists chapters_series_order_idx on public.chapters(series_id, order_index);
create index if not exists chapters_status_published_idx on public.chapters(status, published_at desc);

create table if not exists public.chapter_revisions (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists chapter_revisions_created_idx on public.chapter_revisions(chapter_id, created_at desc);

-- Draft text is stored separately from live chapters. Autosave never mutates public text.
create table if not exists public.drafts (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.series(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default '',
  content text not null default '',
  paywall_type text not null default 'free' check (paywall_type in ('free','embers','subscriber')),
  price_essence integer not null default 0 check (price_essence >= 0 and price_essence <= 100000),
  autosaved_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index if not exists drafts_one_per_chapter_idx on public.drafts(chapter_id) where chapter_id is not null;
create index if not exists drafts_author_series_idx on public.drafts(author_id,series_id,autosaved_at desc);

create table if not exists public.chapter_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  essence_paid integer not null default 0 check (essence_paid >= 0),
  essence_rewarded integer not null default 0 check (essence_rewarded >= 0),
  created_at timestamptz not null default now(),
  unique(user_id, chapter_id)
);

create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  series_id uuid not null references public.series(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, series_id)
);
create index if not exists follows_series_idx on public.follows(series_id, created_at desc);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  series_id uuid not null references public.series(id) on delete cascade, created_at timestamptz not null default now(), unique(user_id, series_id)
);
create table if not exists public.library_entries (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  series_id uuid not null references public.series(id) on delete cascade,
  shelf text not null default 'currently-reading' check (shelf in ('currently-reading','want-to-read','finished','dropped')),
  note text check (char_length(coalesce(note,'')) <= 1000), added_at timestamptz not null default now(), unique(user_id, series_id)
);

create table if not exists public.reading_progress (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  scroll_pct numeric(5,2) not null default 0 check (scroll_pct between 0 and 100),
  last_position integer not null default 0 check (last_position >= 0),
  completed_at timestamptz, updated_at timestamptz not null default now(), unique(user_id, chapter_id)
);
create table if not exists public.chapter_bookmarks (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade, note text not null default '',
  created_at timestamptz not null default now(), unique(user_id, chapter_id)
);
create index if not exists chapter_bookmarks_user_created_idx on public.chapter_bookmarks(user_id, created_at desc);

create table if not exists public.reading_sessions (
  id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles(id) on delete set null,
  series_id uuid references public.series(id) on delete cascade, chapter_id uuid references public.chapters(id) on delete cascade,
  started_at timestamptz not null default now(), ended_at timestamptz, source text not null default 'organic'
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(), series_id uuid not null references public.series(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade, rating integer not null check (rating between 1 and 5),
  body text not null default '' check (char_length(body) <= 3000), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id, series_id)
);
create index if not exists reviews_series_created_idx on public.reviews(series_id, created_at desc);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(), chapter_id uuid not null references public.chapters(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade, parent_id uuid references public.comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000), is_pinned boolean not null default false,
  author_highlighted boolean not null default false, deleted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists comments_chapter_created_idx on public.comments(chapter_id, created_at desc) where deleted_at is null;
create table if not exists public.comment_reactions (
  id uuid primary key default gen_random_uuid(), comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade, reaction text not null check (reaction in ('helpful','funny','heart')),
  created_at timestamptz not null default now(), unique(comment_id, user_id, reaction)
);

create table if not exists public.quests (
  id text primary key, name text not null, description text not null, reward_essence integer not null check (reward_essence > 0),
  quest_type text not null check (quest_type in ('rewarded_ad','check_in','reading_goal','community')),
  active boolean not null default true, daily_limit integer not null default 1 check (daily_limit between 1 and 100),
  starts_at timestamptz, ends_at timestamptz, created_at timestamptz not null default now()
);
insert into public.quests(id,name,description,reward_essence,quest_type,active,daily_limit)
values ('rewarded-video-daily','Watch a rewarded ad','Watch a registered partner ad all the way through. Rewards are credited only after verification.',5,'rewarded_ad',true,5)
on conflict (id) do update set name=excluded.name, description=excluded.description, reward_essence=excluded.reward_essence, active=excluded.active, daily_limit=excluded.daily_limit;

create table if not exists public.ad_sessions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  quest_id text not null references public.quests(id), provider text not null, status text not null default 'pending' check (status in ('pending','completed','rejected','expired')),
  reward_essence integer not null check (reward_essence > 0), provider_event_id text,
  created_at timestamptz not null default now(), expires_at timestamptz not null default (now() + interval '15 minutes'), completed_at timestamptz,
  unique(provider, provider_event_id)
);
create index if not exists ad_sessions_user_created_idx on public.ad_sessions(user_id, created_at desc);

create table if not exists public.wallet_ledger (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  bucket text not null check (bucket in ('paid','rewarded','resonance')),
  event_type text not null, direction text not null check (direction in ('credit','debit')),
  amount bigint not null check (amount > 0), source text not null,
  external_ref text unique, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists wallet_ledger_user_created_idx on public.wallet_ledger(user_id, created_at desc);

create table if not exists public.platform_settings (key text primary key, value text not null, updated_at timestamptz not null default now());
insert into public.platform_settings(key,value) values ('author_usd_per_paid_essence','0.00693'), ('author_subscription_share','0.90') on conflict (key) do nothing;
create table if not exists public.author_earnings (
  id uuid primary key default gen_random_uuid(), author_id uuid not null references public.profiles(id) on delete cascade,
  series_id uuid references public.series(id) on delete set null, chapter_id uuid references public.chapters(id) on delete set null,
  amount_usd numeric(12,4) not null check (amount_usd >= 0), currency text not null default 'USD', status text not null default 'accrued' check (status in ('accrued','on_hold','paid','reversed')),
  source text not null, external_ref text unique, created_at timestamptz not null default now()
);
alter table public.author_earnings add column if not exists external_ref text;
create unique index if not exists author_earnings_external_ref_uidx on public.author_earnings(external_ref) where external_ref is not null;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(), reader_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade, tier_id uuid, status text not null check (status in ('active','canceled','past_due','expired')),
  current_period_end timestamptz, provider_customer_id text, provider_subscription_id text, created_at timestamptz not null default now(), unique(reader_id, author_id)
);
create table if not exists public.subscription_tiers (
  id uuid primary key default gen_random_uuid(), author_id uuid not null references public.profiles(id) on delete cascade,
  name text not null, description text not null default '', price_monthly numeric(10,2) not null check (price_monthly >= 0), benefits jsonb not null default '[]'::jsonb,
  active boolean not null default true, stripe_product_id text, stripe_price_id text unique, created_at timestamptz not null default now()
);

create table if not exists public.payout_requests (
  id uuid primary key default gen_random_uuid(), author_id uuid not null references public.profiles(id) on delete cascade,
  amount_usd numeric(12,2) not null check (amount_usd >= 20), currency text not null default 'USD',
  status text not null default 'requested' check (status in ('requested','approved','processing','paid','rejected')),
  provider_reference text, admin_note text, reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), reviewed_at timestamptz
);
create index if not exists payout_requests_author_idx on public.payout_requests(author_id,created_at desc);

create table if not exists public.resonance_grants (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  series_id uuid not null references public.series(id) on delete cascade, chapter_id uuid references public.chapters(id) on delete cascade,
  day date not null default (timezone('utc', now())::date), created_at timestamptz not null default now(), unique(user_id, series_id, day)
);
create table if not exists public.standing_events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  delta integer not null, reason text not null, target_id uuid, created_at timestamptz not null default now()
);
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(), key text not null unique, name text not null, description text not null, criteria jsonb not null default '{}'::jsonb
);
create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade, earned_at timestamptz not null default now(), unique(user_id, achievement_id)
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(), event_type text not null, series_id uuid references public.series(id) on delete set null,
  chapter_id uuid references public.chapters(id) on delete set null, user_id uuid references public.profiles(id) on delete set null,
  source text not null default 'organic', meta jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists analytics_series_created_idx on public.analytics_events(series_id, created_at desc);
create index if not exists analytics_type_created_idx on public.analytics_events(event_type, created_at desc);
create table if not exists public.ranking_snapshots (
  id uuid primary key default gen_random_uuid(), list_key text not null check (list_key in ('trending','rising','reader-favorite','fast-growing','most-discussed','hidden-gem','staff-pick','new-voices')),
  series_id uuid not null references public.series(id) on delete cascade, position integer not null check (position > 0), computed_at timestamptz not null default now(),
  unique(list_key, series_id)
);
create index if not exists ranking_list_position_idx on public.ranking_snapshots(list_key, position);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null, title text not null, body text not null default '', href text, read_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
create table if not exists public.moderation_cases (
  id uuid primary key default gen_random_uuid(), reporter_id uuid references public.profiles(id) on delete set null,
  target_type text not null check (target_type in ('account','series','chapter','comment','review')), target_id uuid not null,
  reason text not null, details text not null default '', evidence jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open','in_review','action_taken','no_action','appealed','closed')),
  assigned_to uuid references public.profiles(id) on delete set null, resolution text, created_at timestamptz not null default now(), resolved_at timestamptz
);
create table if not exists public.appeals (
  id uuid primary key default gen_random_uuid(), case_id uuid not null references public.moderation_cases(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id) on delete cascade, details text not null,
  assigned_to uuid references public.profiles(id) on delete set null, resolution text, created_at timestamptz not null default now(), resolved_at timestamptz
);
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(), actor_id uuid references public.profiles(id) on delete set null,
  action text not null, target_type text not null, target_id text, reason text not null,
  before_state jsonb, after_state jsonb, created_at timestamptz not null default now()
);
create table if not exists public.ab_experiments (
  id uuid primary key default gen_random_uuid(), series_id uuid not null references public.series(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade, field text not null check (field in ('title','cover_url','description','hook')),
  variants jsonb not null, status text not null default 'draft' check (status in ('draft','running','paused','completed')),
  success_metric text not null default 'story_page_click', minimum_impressions integer not null default 200, created_at timestamptz not null default now(), ended_at timestamptz
);

-- A public, metadata-only directory lets readers see paid chapter titles without exposing locked manuscript text.
create or replace view public.chapter_directory with (security_invoker = false) as
select c.id, c.series_id, s.slug as series_slug, c.title, c.order_index, c.paywall_type,
       c.price_essence, c.word_count, c.published_at
from public.chapters c join public.series s on s.id = c.series_id
where c.status = 'published' and c.deleted_at is null and s.status = 'published';

create or replace function public.loom_touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.loom_touch_updated_at();
create trigger series_touch before update on public.series for each row execute function public.loom_touch_updated_at();
create trigger chapters_touch before update on public.chapters for each row execute function public.loom_touch_updated_at();

create or replace function public.loom_guard_profile_role() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Profile roles can only be changed by trusted server operations';
  end if;
  return new;
end; $$;
create trigger profile_role_guard before update on public.profiles for each row execute function public.loom_guard_profile_role();

create or replace function public.loom_new_auth_user() returns trigger language plpgsql security definer set search_path = public as $$
declare
  chosen_username text;
  base_username text;
begin
  base_username := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(coalesce(new.email,'reader'), '@', 1)), '[^a-zA-Z0-9_]', '', 'g'));
  if char_length(base_username) < 3 then base_username := 'reader'; end if;
  base_username := left(base_username, 22);
  chosen_username := base_username;
  if exists(select 1 from public.profiles p where p.username = chosen_username) then chosen_username := base_username || '_' || left(new.id::text, 6); end if;
  insert into public.profiles(id, username, display_name)
  values (new.id, chosen_username, left(coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username', base_username),80))
  on conflict (id) do nothing;
  insert into public.wallets(user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.loom_new_auth_user();

create or replace function public.loom_can_read_chapter(target_chapter uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.chapters c join public.series s on s.id = c.series_id
    where c.id = target_chapter and c.status = 'published' and c.deleted_at is null and s.status = 'published'
      and (
        c.paywall_type = 'free'
        or (auth.uid() is not null and s.author_id = auth.uid())
        or (auth.uid() is not null and exists(select 1 from public.chapter_unlocks u where u.user_id = auth.uid() and u.chapter_id = c.id))
        or (auth.uid() is not null and c.paywall_type = 'subscriber' and exists(select 1 from public.subscriptions sub where sub.reader_id = auth.uid() and sub.author_id = s.author_id and sub.status = 'active' and (sub.current_period_end is null or sub.current_period_end > now())))
      )
  );
$$;

-- Credit only from a trusted, verified Stripe Checkout webhook. A session can be credited once.
create or replace function public.credit_purchased_essence(p_user_id uuid, p_amount integer, p_stripe_session_id text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_wallet public.wallets%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Service role required'; end if;
  if p_amount not in (100,550,1200) then raise exception 'Unsupported Essence pack'; end if;
  if p_stripe_session_id is null or p_stripe_session_id = '' then raise exception 'Missing Stripe session id'; end if;
  if exists(select 1 from public.wallet_ledger where external_ref = p_stripe_session_id) then return false; end if;
  select * into v_wallet from public.wallets where user_id = p_user_id for update;
  if not found then raise exception 'Wallet not found'; end if;
  update public.wallets set paid_essence = paid_essence + p_amount, updated_at = now() where user_id = p_user_id;
  insert into public.wallet_ledger(user_id,bucket,event_type,direction,amount,source,external_ref,metadata)
    values(p_user_id,'paid','purchase','credit',p_amount,'stripe',p_stripe_session_id,jsonb_build_object('pack_essence',p_amount));
  return true;
end; $$;

-- Serialize payout requests under the author's profile row so two concurrent requests cannot over-reserve funds.
create or replace function public.request_author_payout(p_amount_usd numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_author uuid := auth.uid();
  v_earned numeric(12,2);
  v_reserved numeric(12,2);
  v_available numeric(12,2);
  v_amount numeric(12,2) := round(p_amount_usd,2);
  v_request public.payout_requests%rowtype;
begin
  if v_author is null then raise exception 'Sign in before requesting a payout'; end if;
  if v_amount is null or v_amount < 20 then raise exception 'Minimum payout request is $20'; end if;
  perform 1 from public.profiles where id=v_author for update;
  select coalesce(sum(amount_usd),0) into v_earned from public.author_earnings where author_id=v_author and status='accrued';
  select coalesce(sum(amount_usd),0) into v_reserved from public.payout_requests where author_id=v_author and status in ('requested','approved','processing','paid');
  v_available := greatest(0, floor((v_earned-v_reserved)*100)/100);
  if v_amount > v_available then raise exception 'Payout amount exceeds available balance of $%', to_char(v_available,'FM999999990.00'); end if;
  insert into public.payout_requests(author_id,amount_usd,status) values(v_author,v_amount,'requested') returning * into v_request;
  return jsonb_build_object('ok',true,'request_id',v_request.id,'amount_usd',v_request.amount_usd,'status',v_request.status,'available_after',v_available-v_amount);
end; $$;

-- The authenticated user's identity comes from auth.uid(); clients cannot pass another user id or arbitrary cost.
create or replace function public.unlock_chapter(p_chapter_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_chapter public.chapters%rowtype;
  v_wallet public.wallets%rowtype;
  v_rewarded integer;
  v_paid integer;
  v_author uuid;
  v_series uuid;
  v_rate numeric(12,6);
begin
  if v_user is null then raise exception 'Sign in to unlock this chapter'; end if;
  select c.* into v_chapter
  from public.chapters c join public.series s on s.id = c.series_id
  where c.id = p_chapter_id and c.status='published' and s.status='published' and c.deleted_at is null;
  if not found then raise exception 'Chapter is unavailable'; end if;
  select s.author_id, s.id into v_author, v_series from public.series s where s.id = v_chapter.series_id;
  if v_chapter.paywall_type = 'free' or v_chapter.author_id = v_user then return jsonb_build_object('ok',true,'already_unlocked',true,'cost',0); end if;
  if v_chapter.paywall_type = 'subscriber' and exists(select 1 from public.subscriptions sub where sub.reader_id=v_user and sub.author_id=v_author and sub.status='active' and (sub.current_period_end is null or sub.current_period_end>now())) then
    return jsonb_build_object('ok',true,'already_unlocked',true,'cost',0);
  end if;
  if v_chapter.paywall_type = 'subscriber' then raise exception 'This chapter requires an active author subscription'; end if;
  if exists(select 1 from public.chapter_unlocks where user_id=v_user and chapter_id=p_chapter_id) then return jsonb_build_object('ok',true,'already_unlocked',true,'cost',0); end if;
  select * into v_wallet from public.wallets where user_id=v_user for update;
  if not found then raise exception 'Wallet not found'; end if;
  if (v_wallet.paid_essence + v_wallet.rewarded_essence) < v_chapter.price_essence then raise exception 'Not enough Essence'; end if;
  v_rewarded := least(v_wallet.rewarded_essence, v_chapter.price_essence);
  v_paid := v_chapter.price_essence - v_rewarded;
  update public.wallets set rewarded_essence=rewarded_essence-v_rewarded, paid_essence=paid_essence-v_paid, updated_at=now() where user_id=v_user;
  insert into public.chapter_unlocks(user_id,chapter_id,essence_paid,essence_rewarded) values(v_user,p_chapter_id,v_paid,v_rewarded);
  if v_rewarded > 0 then insert into public.wallet_ledger(user_id,bucket,event_type,direction,amount,source,metadata) values(v_user,'rewarded','chapter_unlock','debit',v_rewarded,'chapter',jsonb_build_object('chapter_id',p_chapter_id)); end if;
  if v_paid > 0 then
    insert into public.wallet_ledger(user_id,bucket,event_type,direction,amount,source,metadata) values(v_user,'paid','chapter_unlock','debit',v_paid,'chapter',jsonb_build_object('chapter_id',p_chapter_id));
    select value::numeric into v_rate from public.platform_settings where key='author_usd_per_paid_essence';
    insert into public.author_earnings(author_id,series_id,chapter_id,amount_usd,source)
      values(v_author,v_series,p_chapter_id,round(v_paid * coalesce(v_rate,0.00693),4),'paid_essence_unlock');
  end if;
  return jsonb_build_object('ok',true,'already_unlocked',false,'cost',v_chapter.price_essence,'paid_spent',v_paid,'rewarded_spent',v_rewarded);
end; $$;

-- Trusted provider callbacks only. Rewards go to the rewarded bucket and cannot be forged by a browser request.
create or replace function public.complete_ad_quest(p_session_id uuid, p_provider_event_id text, p_user_id uuid, p_reward_essence integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_session public.ad_sessions%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Service role required'; end if;
  if p_provider_event_id is null or length(p_provider_event_id) < 3 then raise exception 'Invalid provider event ID'; end if;
  select * into v_session from public.ad_sessions where id=p_session_id and user_id=p_user_id for update;
  if not found then raise exception 'Quest session not found'; end if;
  if v_session.status <> 'pending' then raise exception 'Quest session already finalized'; end if;
  if v_session.expires_at <= now() then update public.ad_sessions set status='expired' where id=v_session.id; raise exception 'Quest session expired'; end if;
  if v_session.reward_essence <> p_reward_essence then raise exception 'Reward amount mismatch'; end if;
  if exists(select 1 from public.ad_sessions where provider=v_session.provider and provider_event_id=p_provider_event_id) then raise exception 'Duplicate provider event'; end if;
  update public.ad_sessions set status='completed', provider_event_id=p_provider_event_id, completed_at=now() where id=v_session.id;
  update public.wallets set rewarded_essence=rewarded_essence+p_reward_essence, updated_at=now() where user_id=p_user_id;
  insert into public.wallet_ledger(user_id,bucket,event_type,direction,amount,source,external_ref,metadata)
    values(p_user_id,'rewarded','rewarded_ad','credit',p_reward_essence,v_session.provider,'ad:'||v_session.id::text,jsonb_build_object('quest_id',v_session.quest_id,'provider_event_id',p_provider_event_id));
  return jsonb_build_object('ok',true,'essence',p_reward_essence);
end; $$;

create or replace function public.tip_author(p_author_id uuid, p_amount integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_wallet public.wallets%rowtype; v_rewarded integer; v_paid integer; v_rate numeric(12,6);
begin
  if v_user is null then raise exception 'Sign in to support an author'; end if;
  if p_author_id = v_user then raise exception 'You cannot tip your own account'; end if;
  if p_amount < 1 or p_amount > 100000 then raise exception 'Tip amount is invalid'; end if;
  if not exists(select 1 from public.profiles where id=p_author_id) then raise exception 'Author not found'; end if;
  select * into v_wallet from public.wallets where user_id=v_user for update;
  if not found then raise exception 'Wallet not found'; end if;
  if (v_wallet.paid_essence + v_wallet.rewarded_essence) < p_amount then raise exception 'Not enough Essence'; end if;
  v_rewarded := least(v_wallet.rewarded_essence,p_amount); v_paid := p_amount-v_rewarded;
  update public.wallets set rewarded_essence=rewarded_essence-v_rewarded, paid_essence=paid_essence-v_paid, updated_at=now() where user_id=v_user;
  if v_rewarded > 0 then insert into public.wallet_ledger(user_id,bucket,event_type,direction,amount,source,metadata) values(v_user,'rewarded','author_tip','debit',v_rewarded,'tip',jsonb_build_object('author_id',p_author_id)); end if;
  if v_paid > 0 then
    insert into public.wallet_ledger(user_id,bucket,event_type,direction,amount,source,metadata) values(v_user,'paid','author_tip','debit',v_paid,'tip',jsonb_build_object('author_id',p_author_id));
    select value::numeric into v_rate from public.platform_settings where key='author_usd_per_paid_essence';
    insert into public.author_earnings(author_id,amount_usd,source) values(p_author_id,round(v_paid*coalesce(v_rate,0.00693),4),'paid_essence_tip');
  end if;
  insert into public.notifications(user_id,category,title,body,href) values(p_author_id,'support','You received author support',p_amount::text||' Essence was sent to support your work.','/studio/payouts');
  return jsonb_build_object('ok',true,'amount',p_amount,'paid_source_spent',v_paid,'rewarded_source_spent',v_rewarded);
end; $$;

create or replace function public.claim_resonance(p_series_id uuid, p_chapter_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_wallet public.wallets%rowtype; v_today date := timezone('utc',now())::date;
begin
  if v_user is null then raise exception 'Sign in to give Resonance'; end if;
  if not exists(select 1 from public.series where id=p_series_id and status='published') then raise exception 'Story unavailable'; end if;
  if p_chapter_id is not null and not exists(select 1 from public.chapters where id=p_chapter_id and series_id=p_series_id and status='published') then raise exception 'Chapter unavailable'; end if;
  select * into v_wallet from public.wallets where user_id=v_user for update;
  if v_wallet.resonance_reset_at < v_today then update public.wallets set resonance_balance=3,resonance_reset_at=v_today where user_id=v_user returning * into v_wallet; end if;
  if v_wallet.resonance_balance < 1 then raise exception 'Your daily Resonance has been used'; end if;
  if exists(select 1 from public.resonance_grants where user_id=v_user and series_id=p_series_id and day=v_today) then raise exception 'You already supported this story today'; end if;
  update public.wallets set resonance_balance=resonance_balance-1, updated_at=now() where user_id=v_user;
  insert into public.resonance_grants(user_id,series_id,chapter_id,day) values(v_user,p_series_id,p_chapter_id,v_today);
  insert into public.wallet_ledger(user_id,bucket,event_type,direction,amount,source,metadata) values(v_user,'resonance','daily_support','debit',1,'story',jsonb_build_object('series_id',p_series_id));
  return jsonb_build_object('ok',true,'remaining',v_wallet.resonance_balance-1);
end; $$;

-- Immutable balance history.
create or replace function public.loom_prevent_ledger_mutation() returns trigger language plpgsql as $$
begin raise exception 'wallet_ledger is append-only'; end; $$;
create trigger wallet_ledger_immutable before update or delete on public.wallet_ledger for each row execute function public.loom_prevent_ledger_mutation();

-- RLS on every private/money/content-bearing table.
alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.series enable row level security;
alter table public.chapters enable row level security;
alter table public.chapter_revisions enable row level security;
alter table public.drafts enable row level security;
alter table public.chapter_unlocks enable row level security;
alter table public.follows enable row level security;
alter table public.favorites enable row level security;
alter table public.library_entries enable row level security;
alter table public.reading_progress enable row level security;
alter table public.chapter_bookmarks enable row level security;
alter table public.reading_sessions enable row level security;
alter table public.reviews enable row level security;
alter table public.comments enable row level security;
alter table public.comment_reactions enable row level security;
alter table public.quests enable row level security;
alter table public.ad_sessions enable row level security;
alter table public.wallet_ledger enable row level security;
alter table public.author_earnings enable row level security;
alter table public.payout_requests enable row level security;
alter table public.subscriptions enable row level security;
alter table public.subscription_tiers enable row level security;
alter table public.resonance_grants enable row level security;
alter table public.standing_events enable row level security;
alter table public.user_achievements enable row level security;
alter table public.analytics_events enable row level security;
alter table public.ranking_snapshots enable row level security;
alter table public.notifications enable row level security;
alter table public.moderation_cases enable row level security;
alter table public.appeals enable row level security;
alter table public.audit_log enable row level security;
alter table public.ab_experiments enable row level security;

create policy "profiles are publicly readable" on public.profiles for select using (true);
create policy "users update own profile" on public.profiles for update using (auth.uid()=id) with check (auth.uid()=id);
create policy "wallet owner can read balance" on public.wallets for select using (auth.uid()=user_id);
create policy "public can read published series" on public.series for select using (status='published' or auth.uid()=author_id);
create policy "authors create own series" on public.series for insert with check (auth.uid()=author_id);
create policy "authors update own series" on public.series for update using (auth.uid()=author_id) with check (auth.uid()=author_id);
create policy "authors delete own series" on public.series for delete using (auth.uid()=author_id);
create policy "read only accessible chapters or own drafts" on public.chapters for select using ((status='published' and public.loom_can_read_chapter(id)) or auth.uid()=author_id);
create policy "authors create chapters for own series" on public.chapters for insert with check (auth.uid()=author_id and exists(select 1 from public.series s where s.id=series_id and s.author_id=auth.uid()));
create policy "authors update own chapters" on public.chapters for update using (auth.uid()=author_id) with check (auth.uid()=author_id and exists(select 1 from public.series s where s.id=series_id and s.author_id=auth.uid()));
create policy "authors delete own chapters" on public.chapters for delete using (auth.uid()=author_id and exists(select 1 from public.series s where s.id=series_id and s.author_id=auth.uid()));
create policy "authors read revisions for own chapters" on public.chapter_revisions for select using (auth.uid()=author_id);
create policy "authors read own drafts" on public.drafts for select using (auth.uid()=author_id and exists(select 1 from public.series s where s.id=series_id and s.author_id=auth.uid()));
create policy "authors create own drafts" on public.drafts for insert with check (auth.uid()=author_id and exists(select 1 from public.series s where s.id=series_id and s.author_id=auth.uid()) and (chapter_id is null or exists(select 1 from public.chapters c where c.id=chapter_id and c.author_id=auth.uid())));
create policy "authors update own drafts" on public.drafts for update using (auth.uid()=author_id) with check (auth.uid()=author_id and exists(select 1 from public.series s where s.id=series_id and s.author_id=auth.uid()));
create policy "authors delete own drafts" on public.drafts for delete using (auth.uid()=author_id and exists(select 1 from public.series s where s.id=series_id and s.author_id=auth.uid()));
create policy "authors add revisions for own chapters" on public.chapter_revisions for insert with check (auth.uid()=author_id and exists(select 1 from public.chapters c where c.id=chapter_id and c.author_id=auth.uid()));
create policy "users read own unlocks" on public.chapter_unlocks for select using (auth.uid()=user_id);
create policy "users manage own follows" on public.follows for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "users manage own favorites" on public.favorites for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "users manage own library" on public.library_entries for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "users manage own progress" on public.reading_progress for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "users manage own reading sessions" on public.reading_sessions for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "users read own chapter bookmarks" on public.chapter_bookmarks for select using (auth.uid()=user_id);
create policy "users create own chapter bookmarks" on public.chapter_bookmarks for insert with check (auth.uid()=user_id and exists(select 1 from public.chapters c where c.id=chapter_id and c.status='published'));
create policy "users delete own chapter bookmarks" on public.chapter_bookmarks for delete using (auth.uid()=user_id);
create policy "published series reviews are public" on public.reviews for select using (exists(select 1 from public.series s where s.id=series_id and s.status='published'));
create policy "users manage own series reviews" on public.reviews for all using (auth.uid()=user_id) with check (auth.uid()=user_id and exists(select 1 from public.series s where s.id=series_id and s.status='published'));
create policy "read comments on readable chapters" on public.comments for select using (deleted_at is null and public.loom_can_read_chapter(chapter_id));
create policy "signed in users comment on readable chapters" on public.comments for insert with check (auth.uid()=user_id and public.loom_can_read_chapter(chapter_id));
create policy "authors can moderate own chapter comments" on public.comments for update using (auth.uid()=user_id or exists(select 1 from public.chapters c join public.series s on s.id=c.series_id where c.id=chapter_id and s.author_id=auth.uid())) with check (auth.uid()=user_id or exists(select 1 from public.chapters c join public.series s on s.id=c.series_id where c.id=chapter_id and s.author_id=auth.uid()));
create policy "users react as themselves" on public.comment_reactions for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "active quests are public" on public.quests for select using (active=true and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now()));
create policy "users can read own ad sessions" on public.ad_sessions for select using (auth.uid()=user_id);
create policy "users read own ledger" on public.wallet_ledger for select using (auth.uid()=user_id);
create policy "authors read their earnings" on public.author_earnings for select using (auth.uid()=author_id);
create policy "authors read own payout requests" on public.payout_requests for select using (auth.uid()=author_id);
drop policy if exists "authors request own payout" on public.payout_requests;
create policy "subscription parties can read subscription" on public.subscriptions for select using (auth.uid()=reader_id or auth.uid()=author_id);
create policy "tiers are public when active" on public.subscription_tiers for select using (active=true or auth.uid()=author_id);
create policy "authors manage own tiers" on public.subscription_tiers for insert with check (auth.uid()=author_id);
create policy "authors update own tiers" on public.subscription_tiers for update using (auth.uid()=author_id) with check (auth.uid()=author_id);
create policy "authors delete own tiers" on public.subscription_tiers for delete using (auth.uid()=author_id);
create policy "users read their resonance grants" on public.resonance_grants for select using (auth.uid()=user_id);
create policy "users read their standing" on public.standing_events for select using (auth.uid()=user_id);
create policy "users read their achievements" on public.user_achievements for select using (auth.uid()=user_id);
create policy "achievement catalog public" on public.achievements for select using (true);
create policy "analytics insert own or anonymous events" on public.analytics_events for insert with check (user_id is null or auth.uid()=user_id);
create policy "authors read own series analytics" on public.analytics_events for select using (exists(select 1 from public.series s where s.id=series_id and s.author_id=auth.uid()));
create policy "ranking positions are public" on public.ranking_snapshots for select using (true);
create policy "users manage own notifications" on public.notifications for select using (auth.uid()=user_id);
create policy "users update own notifications" on public.notifications for update using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "reporters and moderators can read cases" on public.moderation_cases for select using (auth.uid()=reporter_id or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('moderator','admin')));
create policy "signed in users can report" on public.moderation_cases for insert with check (auth.uid()=reporter_id);
create policy "appeal owner and moderators can read" on public.appeals for select using (auth.uid()=submitted_by or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('moderator','admin')));
create policy "users submit own appeals" on public.appeals for insert with check (auth.uid()=submitted_by);
create policy "authors manage their experiments" on public.ab_experiments for all using (auth.uid()=author_id) with check (auth.uid()=author_id and exists(select 1 from public.series s where s.id=series_id and s.author_id=auth.uid()));

-- Service-only wallet functions. Authenticated clients may call only the unlock and Resonance functions.
revoke all on function public.request_author_payout(numeric) from public, anon;
grant execute on function public.request_author_payout(numeric) to authenticated;
revoke all on function public.credit_purchased_essence(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.credit_purchased_essence(uuid, integer, text) to service_role;
revoke all on function public.complete_ad_quest(uuid, text, uuid, integer) from public, anon, authenticated;
grant execute on function public.complete_ad_quest(uuid, text, uuid, integer) to service_role;
revoke all on function public.unlock_chapter(uuid) from public, anon;
grant execute on function public.unlock_chapter(uuid) to authenticated;
revoke all on function public.claim_resonance(uuid, uuid) from public, anon;
revoke all on function public.tip_author(uuid, integer) from public, anon;
grant execute on function public.tip_author(uuid, integer) to authenticated;
grant execute on function public.claim_resonance(uuid, uuid) to authenticated;

-- Explicit table grants commonly needed by Supabase REST; RLS remains the access boundary.
grant select on public.chapter_directory to anon, authenticated;
grant select on public.quests, public.ranking_snapshots, public.achievements to anon, authenticated;
grant select on public.profiles to anon, authenticated;
revoke update on public.profiles from anon, authenticated;
grant update(username, display_name, bio, avatar_url, banner_url, privacy_settings) on public.profiles to authenticated;
grant select on public.series, public.chapters to anon, authenticated;
grant select on public.wallets, public.wallet_ledger, public.ad_sessions, public.chapter_unlocks, public.author_earnings, public.payout_requests to authenticated;
revoke insert, update, delete on public.payout_requests from anon, authenticated;
grant select, insert, update, delete on public.series, public.chapters, public.follows, public.favorites, public.library_entries, public.reading_progress, public.chapter_bookmarks, public.reading_sessions, public.reviews, public.comments, public.comment_reactions, public.subscription_tiers, public.ab_experiments to authenticated;
grant select, insert on public.chapter_revisions to authenticated;
grant select, insert, update, delete on public.drafts to authenticated;
grant select, insert on public.analytics_events to anon, authenticated;
grant select, insert on public.moderation_cases, public.appeals to authenticated;
grant select, update on public.notifications to authenticated;
