-- ============================================================
-- BORA SECURITY PHASE 2 — HARDENED GUEST VOTING BACKEND
-- ============================================================
--
-- GOAL: a secure, transactional, idempotent replacement vote path that
-- preserves guest voting and is designed so account-based voting can be
-- introduced later WITHOUT redesigning the vote-event model.
--
-- This migration is ADDITIVE ONLY. It does NOT replace or modify:
--   - public.handle_song_vote(uuid, text)  (live production path, untouched)
--   - public.songs policies / grants / data
--   - any other function, table, policy, or grant
-- The new RPC (public.cast_vote_secure) sits ALONGSIDE the live path and is
-- independently verifiable before any caller is switched (cutover is a
-- separate, approved step).
--
-- SECURITY MODEL (mirrors 0003 / 0005 conventions):
--   1. vote_events is the durable source of vote history going forward.
--      No anon/authenticated table grants; RLS enabled with NO policies, so
--      direct table access is denied to every non-definer role.
--   2. public.cast_vote_secure is the ONLY write boundary. It is
--      SECURITY DEFINER with a fixed search_path, fully-qualified table
--      references, fully validated inputs, and no dynamic SQL.
--   3. Voter identity is SERVER-VERIFIED (auth.uid()), never a raw
--      client-supplied id. A caller cannot impersonate another voter.
--   4. EXECUTE is granted to `authenticated` only (Supabase anonymous
--      sign-in users ARE role `authenticated` with is_anonymous=true, so
--      guests are covered). PUBLIC and anon are explicitly revoked.
--   5. Counters are computed server-side (+1 / -1). No client counter,
--      momentum, or rank value is ever accepted.
--
-- IDENTITY MODEL:
--   voter_ref         = auth.uid()  (stable per guest session / per account)
--   identity_method   = 'guest'  when the JWT is an anonymous sign-in
--                       'account' when it is a real authenticated user
--                       (reserved for future; no auth/account-linking built here)
--   identity_version  = 1  (schema version of the identity scheme)
--   No PII (email/phone/IP) is stored. Only the opaque uid + method + version.
--
-- IDEMPOTENCY (database-enforced):
--   UNIQUE (voter_ref, idempotency_key) -> an exact retry collides and is
--   returned as status='duplicate' with NO counter change. The same key
--   reused for a DIFFERENT song/vote_type is rejected (never a 2nd vote).
--   Concurrent identical requests are serialized by the unique index: one
--   inserts (accepted), the loser reads the committed row (duplicate).
--
-- COUNTER SEMANTICS (identical to the live handle_song_vote, preserved):
--   up   -> upvotes + 1, momentum_score + 1
--   down -> downvotes + 1, momentum_score - 1
--   momentum_score is NOT reinterpreted as Engine c / K / Kura here.
--
-- RATE LIMIT (honest, per server-verified identity): at most 60 accepted
--   votes per uid per rolling hour, counted from vote_events in the same
--   transaction. This is a SOFT velocity cap: it cannot stop a determined
--   user from creating many anonymous identities (documented limitation);
--   it raises the cost of abuse without storing IPs. A hard sybil defence
--   (proof-of-work / captcha / trusted-edge IP reputation) needs approval.
--
-- REVERSAL: DROP FUNCTION public.cast_vote_secure(uuid,text,text);
--           DROP TABLE public.vote_events;  (no other object touched)
-- ============================================================

-- 1. Durable vote-event log (new table; live `votes` legacy table untouched).
create table if not exists public.vote_events (
  id                uuid primary key default gen_random_uuid(),
  song_id           uuid not null references public.songs(id) on delete cascade,
  vote_type         text not null check (vote_type in ('up','down')),
  voter_ref         uuid not null,
  identity_method   text not null check (identity_method in ('guest','account')),
  identity_version  integer not null default 1,
  idempotency_key   text not null,
  created_at        timestamptz not null default now()
);

-- Idempotency is per voter + key (transaction-safe conflict handling).
create unique index if not exists vote_events_voter_idem_uk
  on public.vote_events (voter_ref, idempotency_key);

-- Rate-limit window query: recent accepted votes for one identity.
create index if not exists vote_events_voter_time_idx
  on public.vote_events (voter_ref, created_at);

-- Future per-song / hourly reconstruction (Engine) and auditing.
create index if not exists vote_events_song_idx
  on public.vote_events (song_id);
create index if not exists vote_events_created_idx
  on public.vote_events (created_at);

-- Lock the table: RLS on, no policies => no direct access for any role.
alter table public.vote_events enable row level security;
revoke all on table public.vote_events from anon;
revoke all on table public.vote_events from authenticated;

-- 2. Hardened replacement RPC (distinct name; does NOT replace the live fn).
create or replace function public.cast_vote_secure(
  p_song_id uuid,
  p_vote_type text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_voter_ref        uuid;
  v_is_anon          boolean;
  v_identity_method  text;
  v_event_id         uuid;
  v_existing_id      uuid;
  v_existing_song    uuid;
  v_existing_type    text;
  v_recent           integer;
  c_rate_limit       constant integer := 60;  -- accepted votes / uid / hour
begin
  -- (5) Identity: server-verified; cannot be forged by a request field.
  v_voter_ref := auth.uid();
  if v_voter_ref is null then
    raise exception 'BORA_AUTH_REQUIRED: a guest (anonymous sign-in) or account session is required to vote'
      using errcode = '28000';
  end if;

  -- (2) Vote-type validation: explicit; never silently accept invalid input.
  if p_vote_type is null or p_vote_type not in ('up','down') then
    raise exception 'BORA_INVALID_VOTE_TYPE: vote_type must be ''up'' or ''down'' (got %)',
      coalesce(p_vote_type, '<null>') using errcode = '22023';
  end if;

  -- (1) Song validation.
  if p_song_id is null then
    raise exception 'BORA_INVALID_SONG: song_id is required' using errcode = '22023';
  end if;
  if not exists (select 1 from public.songs where id = p_song_id) then
    raise exception 'BORA_SONG_NOT_FOUND: no song with id %', p_song_id using errcode = 'P0002';
  end if;

  -- (4) Idempotency-key validation (must be a non-empty UUID).
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    raise exception 'BORA_INVALID_IDEMPOTENCY_KEY: key is required' using errcode = '22023';
  end if;
  begin
    perform btrim(p_idempotency_key)::uuid;
  exception when others then
    raise exception 'BORA_INVALID_IDEMPOTENCY_KEY: key must be a valid UUID' using errcode = '22023';
  end;

  -- (6) Rate limit: accepted votes for this uid in the last hour.
  select count(*) into v_recent
  from public.vote_events
  where voter_ref = v_voter_ref
    and created_at > (now() - interval '1 hour');
  if v_recent >= c_rate_limit then
    raise exception 'BORA_RATE_LIMITED: too many votes from this identity in the last hour (limit %)',
      c_rate_limit using errcode = 'P0001';
  end if;

  -- Identity method derived from the verified JWT (guest vs future account).
  v_is_anon := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
  v_identity_method := case when v_is_anon then 'guest' else 'account' end;

  -- (7) Insert durable event. Idempotency enforced by UNIQUE(voter_ref, key).
  begin
    insert into public.vote_events
      (idempotency_key, song_id, vote_type, voter_ref, identity_method, identity_version)
    values
      (btrim(p_idempotency_key), p_song_id, p_vote_type, v_voter_ref, v_identity_method, 1)
    returning id into v_event_id;
  exception
    when unique_violation then
      select id, song_id, vote_type
        into v_existing_id, v_existing_song, v_existing_type
      from public.vote_events
      where voter_ref = v_voter_ref
        and idempotency_key = btrim(p_idempotency_key);
      if v_existing_song = p_song_id and v_existing_type = p_vote_type then
        -- Exact retry: deterministic duplicate, NO counter change.
        return jsonb_build_object(
          'status', 'duplicate',
          'event_id', v_existing_id,
          'song_id', p_song_id,
          'vote_type', p_vote_type,
          'identity_method', v_identity_method
        );
      else
        -- Key reused for a different request: reject, never a 2nd vote.
        raise exception 'BORA_IDEMPOTENCY_CONFLICT: key already used for a different request'
          using errcode = '23505';
      end if;
  end;

  -- (8) Update counters atomically (same transaction as the event insert).
  if p_vote_type = 'up' then
    update public.songs
      set upvotes = coalesce(upvotes, 0) + 1,
          momentum_score = coalesce(momentum_score, 0) + 1
      where id = p_song_id;
  else
    update public.songs
      set downvotes = coalesce(downvotes, 0) + 1,
          momentum_score = coalesce(momentum_score, 0) - 1
      where id = p_song_id;
  end if;

  -- (9) Explicit accepted result.
  return jsonb_build_object(
    'status', 'accepted',
    'event_id', v_event_id,
    'song_id', p_song_id,
    'vote_type', p_vote_type,
    'identity_method', v_identity_method
  );
end;
$$;

-- 3. Grants: only `authenticated` may execute. Guests use anonymous sign-in
--    (role authenticated, is_anonymous=true). PUBLIC/anon revoked explicitly.
revoke execute on function public.cast_vote_secure(uuid, text, text) from public;
revoke execute on function public.cast_vote_secure(uuid, text, text) from anon;
grant execute on function public.cast_vote_secure(uuid, text, text) to authenticated;
