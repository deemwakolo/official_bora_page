-- ============================================================
-- BORA SECURITY PHASE 2D — SERIALIZE GUEST VOTE RATE LIMITING
-- ============================================================
--
-- GOAL: close the concurrent rate-limit race in public.cast_vote_secure.
--
-- THE RACE (verified in 0010): the rolling-hour cap does
--   SELECT count(*) ... WHERE voter_ref = ... created_at > now() - 1h
-- then inserts. Two concurrent requests carrying DIFFERENT idempotency
-- keys for the SAME voter can both read count < 60 and both insert,
-- briefly overshooting the 60/hour limit. The idempotency unique index
-- only dedupes IDENTICAL keys; it cannot cap distinct keys under
-- concurrency.
--
-- THE FIX (smallest safe change): acquire a transaction-scoped advisory
-- lock keyed by the voter identity BEFORE the rate-limit count query.
--   perform pg_advisory_xact_lock(hashtext(v_voter_ref::text));
-- This serializes ALL vote work for a given voter within the lock window.
-- Because it is an *xact* lock, it is released automatically at COMMIT or
-- ROLLBACK. Under PostgreSQL's default READ COMMITTED isolation, the
-- second waiter's count query runs with a fresh statement snapshot AFTER
-- the first transaction commits, so it sees the just-committed vote and
-- cannot overshoot. No new table, no change to the vote model.
--
-- WHAT IS PRESERVED (byte-for-byte from 0010 except the one lock line):
--   - RPC signature: cast_vote_secure(uuid, text, text) returns jsonb
--   - SECURITY DEFINER + fixed search_path = public, pg_temp
--   - Server-verified identity (auth.uid()); no client identity trusted
--   - Input validation (vote type / song / idempotency key) + error codes
--   - Idempotency semantics (accepted / duplicate / key-reuse conflict)
--   - Counter semantics (up: +1/+1, down: +1/-1 on upvotes/downvotes/momentum)
--   - Response contract and grants (authenticated only)
--
-- THIS IS A FORWARD-ONLY MIGRATION. It uses create-or-replace; it does NOT
-- edit 0010, does NOT touch handle_song_vote, songs policies/grants, or any
-- other object. Reversal: re-apply the 0010 body (without the lock line).
-- ============================================================

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

  -- >>> PHASE 2D FIX: serialize per voter BEFORE the rate-limit count. <<<
  -- Held until this transaction commits/rolls back; prevents concurrent
  -- different-key requests from both passing the count < 60 check.
  perform pg_advisory_xact_lock(hashtext(v_voter_ref::text));

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

-- Grants preserved exactly as 0010: only `authenticated` may execute.
revoke execute on function public.cast_vote_secure(uuid, text, text) from public;
revoke execute on function public.cast_vote_secure(uuid, text, text) from anon;
grant execute on function public.cast_vote_secure(uuid, text, text) to authenticated;

