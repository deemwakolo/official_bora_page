-- ============================================================
-- BORA ENGINE — STAGE 03: PUBLICATION READINESS RPC
-- ============================================================
-- Additive, forward-only SQL. Requires migrations 0012–0020.
--
-- This RPC is the final gate that the publication pipeline consults
-- to decide whether a closed hour's vote data may be published.
-- It delegates to bora_engine_readiness (which already enforces the
-- full 648-slot per-song window) and adds publication-specific checks:
--   1. No active song may have invalidated vote events in the window.
--   2. The readiness predicate must report status = 'ready'.
--   3. The reference hour must match the requested closed hour.
--
-- No state is mutated. The function is idempotent and deterministic.
-- ============================================================

create or replace function public.bora_engine_publish_eligibility(
  p_closed_hour bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_readiness jsonb;
  v_has_invalidation boolean;
  v_reference_hour bigint;
  v_state_status text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'BORA_ENGINE_WORKER_REQUIRED';
  end if;

  -- 1. Gate on the full-window readiness predicate (648 slots per active song).
  v_readiness := public.bora_engine_readiness(p_closed_hour);

  v_state_status := v_readiness->'checks'->'initialState'->>'status';

  -- 2. The reference hour must match the requested closed hour.
  if v_state_status = 'missing' then
    -- No state head yet — readiness returns 'not-ready' with empty checks.
    return jsonb_build_object(
      'status', 'not-eligible',
      'reason', 'no-reference-hour',
      'closedHour', p_closed_hour
    );
  end if;

  select reference_hour
    into v_reference_hour
  from public.bora_engine_hourly_state_head
  where singleton = true;

  if not found or v_reference_hour <> p_closed_hour then
    return jsonb_build_object(
      'status', 'not-eligible',
      'reason', 'reference-hour-mismatch',
      'closedHour', p_closed_hour,
      'referenceHour', v_reference_hour
    );
  end if;

  -- 3. No invalidated vote events may fall within the publication window.
  --    The publication window spans [closed_hour - 71, closed_hour] (72 hours).
  select exists (
    select 1
    from public.bora_engine_vote_event_invalidations inv
    where inv.source_event_id in (
      select source_event_id
      from public.bora_engine_vote_events
      where hour_index between p_closed_hour - 71 and p_closed_hour
    )
    limit 1
  )
  into v_has_invalidation;

  if v_has_invalidation then
    return jsonb_build_object(
      'status', 'not-eligible',
      'reason', 'vote-events-invalidated-in-window',
      'closedHour', p_closed_hour
    );
  end if;

  -- 4. Readiness must be fully satisfied.
  if v_readiness->>'status' = 'ready' then
    return jsonb_build_object(
      'status', 'eligible',
      'closedHour', p_closed_hour,
      'readiness', v_readiness
    );
  end if;

  return jsonb_build_object(
    'status', 'not-eligible',
    'reason', 'readiness-incomplete',
    'closedHour', p_closed_hour,
    'readiness', v_readiness
  );
end;
$$;

revoke all on function public.bora_engine_publish_eligibility(bigint)
  from public, anon, authenticated;

grant execute on function public.bora_engine_publish_eligibility(bigint)
  to service_role;