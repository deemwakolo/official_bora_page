-- ============================================================
-- BORA ENGINE — APPROVED INITIAL STATE BOOTSTRAP
-- ============================================================
--
-- Additive, unapplied proposal. Requires migrations 0012–0014.
-- This operation never derives or fabricates state/history. The operator must
-- first prepare the complete authoritative rows and coverage, then explicitly
-- approve a payload which must exactly match those persisted rows.
-- ============================================================

create table public.bora_engine_bootstrap_approvals (
  approval_id uuid primary key,
  approved_by text not null check (btrim(approved_by) <> ''),
  approval_reason text not null check (btrim(approval_reason) <> ''),
  reference_hour bigint not null,
  approved_state jsonb not null,
  approved_coverage jsonb not null,
  initialized_at timestamptz not null default now()
);

alter table public.bora_engine_bootstrap_approvals
  enable row level security;

revoke all on table public.bora_engine_bootstrap_approvals
  from anon, authenticated;

create function public.bora_engine_reject_bootstrap_approval_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception
    'BORA_BOOTSTRAP_APPROVAL_IMMUTABLE: approvals are append-only';
end;
$$;

create trigger bora_engine_bootstrap_approvals_immutable
before update or delete
on public.bora_engine_bootstrap_approvals
for each row
execute function public.bora_engine_reject_bootstrap_approval_mutation();

revoke execute on function public.bora_engine_reject_bootstrap_approval_mutation()
from public, anon, authenticated;

create function public.bora_engine_check_hour(
  p_closed_hour bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
  v_reference_hour bigint;
  v_active_count bigint;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'BORA_ENGINE_WORKER_REQUIRED';
  end if;

  select status
    into v_status
  from public.bora_engine_hourly_runs
  where closed_hour = p_closed_hour
  for share;

  if not found then
    return jsonb_build_object(
      'status', 'not-ready',
      'reason', 'missing-hourly-run'
    );
  end if;

  if v_status = 'completed' then
    return jsonb_build_object('status', 'already-completed');
  end if;

  if v_status not in ('pending', 'processing', 'failed') then
    return jsonb_build_object(
      'status', 'not-ready',
      'reason', 'ineligible-run-status'
    );
  end if;

  select reference_hour
    into v_reference_hour
  from public.bora_engine_hourly_state_head
  where singleton = true;

  if not found then
    return jsonb_build_object('status', 'bootstrap-required');
  end if;
  if v_reference_hour <> p_closed_hour then
    return jsonb_build_object('status', 'reference-hour-mismatch');
  end if;

  -- Zero active songs is a degenerate state: bootstrap explicitly rejects it
  -- (BORA_ENGINE_BOOTSTRAP_STATE_INCOMPLETE), readiness reports it as
  -- incomplete/missing, and snapshot/load/commit reject it with 'no-active-songs'.
  -- The pre-claim check must use the same gate so a worker cannot claim an hour
  -- that the atomic operations will refuse.
  select count(*)
    into v_active_count
  from public.bora_engine_song_state
  where lifecycle = 'ACTIVE';

  if v_active_count = 0 then
    return jsonb_build_object(
      'status', 'not-ready',
      'reason', 'no-active-songs'
    );
  end if;

  return jsonb_build_object('status', 'ready');
end;
$$;

create function public.bora_engine_bootstrap_state(
  p_approval_id uuid,
  p_approved_by text,
  p_approval_reason text,
  p_reference_hour bigint,
  p_initial_state jsonb,
  p_expected_coverage jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_snapshot jsonb;
  v_active_count bigint;
  v_complete_coverage_count bigint;
  v_inserted boolean;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'BORA_ENGINE_WORKER_REQUIRED';
  end if;

  if p_approval_id is null
    or p_approved_by is null
    or btrim(p_approved_by) = ''
    or p_approval_reason is null
    or btrim(p_approval_reason) = ''
    or p_reference_hour is null
    or jsonb_typeof(p_initial_state) is distinct from 'object'
    or jsonb_typeof(p_initial_state -> 'songs') is distinct from 'array'
    or jsonb_typeof(p_expected_coverage) is distinct from 'array'
    or p_initial_state ->> 'referenceHour' is null
    or (p_initial_state ->> 'referenceHour')::bigint <> p_reference_hour
    or jsonb_array_length(p_initial_state -> 'songs') = 0 then
    raise exception 'BORA_ENGINE_BOOTSTRAP_INVALID_INPUT';
  end if;

  lock table public.bora_engine_song_state in share mode;
  lock table public.bora_engine_vote_buckets in share mode;
  lock table public.bora_engine_seed_hours in share mode;
  lock table public.bora_engine_platform_observations in share mode;
  lock table public.bora_engine_hourly_input_coverage in share mode;
  lock table public.bora_engine_hourly_closures in share mode;

  if exists (
    select 1
    from public.bora_engine_hourly_state_head
    where singleton = true
  ) then
    return jsonb_build_object('status', 'already-initialized');
  end if;

  if exists (select 1 from public.bora_engine_hourly_closures)
    or exists (
      select 1
      from public.bora_engine_hourly_runs
      where status = 'completed'
    ) then
    raise exception 'BORA_ENGINE_BOOTSTRAP_EXISTING_ROLLOVER_HISTORY';
  end if;

  select count(*)
    into v_active_count
  from public.bora_engine_song_state
  where lifecycle = 'ACTIVE';

  if v_active_count = 0
    or (
      select count(*)
      from public.bora_engine_song_state
    ) <> (
      select count(distinct value ->> 'songId')
      from jsonb_array_elements(p_initial_state -> 'songs')
    ) then
    raise exception 'BORA_ENGINE_BOOTSTRAP_STATE_INCOMPLETE';
  end if;

  select count(*)
    into v_complete_coverage_count
  from public.bora_engine_hourly_input_coverage c
  join public.bora_engine_song_state s on s.song_id = c.song_id
  where s.lifecycle = 'ACTIVE'
    and c.status = 'COMPLETE'
    and (
      (c.input_type in ('VOTES', 'SEED')
        and c.hour_index = p_reference_hour)
      or
      (c.input_type in ('YOUTUBE', 'SPOTIFY', 'BOOMPLAY')
        and c.hour_index between p_reference_hour - 167 and p_reference_hour)
    );

  if v_complete_coverage_count <> v_active_count * 506 then
    return jsonb_build_object(
      'status', 'not-ready',
      'reason', 'required-history-coverage-incomplete'
    );
  end if;

  if exists (
    select 1
    from public.bora_engine_song_state
    where lifecycle = 'ACTIVE'
      and last_decay_hour is not null
      and last_decay_hour >= p_reference_hour
  ) then
    raise exception 'BORA_ENGINE_BOOTSTRAP_DECAY_STATE_CONFLICT';
  end if;

  insert into public.bora_engine_hourly_state_head (
    singleton,
    reference_hour,
    revision
  )
  values (true, p_reference_hour, 0)
  on conflict (singleton) do nothing
  returning true into v_inserted;

  if not coalesce(v_inserted, false) then
    return jsonb_build_object('status', 'already-initialized');
  end if;

  v_snapshot := public.bora_engine_hourly_snapshot(p_reference_hour);
  if v_snapshot ->> 'status' <> 'ready'
    or v_snapshot -> 'state' <> p_initial_state
    or v_snapshot -> 'coverage' <> p_expected_coverage then
    raise exception 'BORA_ENGINE_BOOTSTRAP_NOT_RECONCILED';
  end if;

  insert into public.bora_engine_bootstrap_approvals (
    approval_id,
    approved_by,
    approval_reason,
    reference_hour,
    approved_state,
    approved_coverage
  )
  values (
    p_approval_id,
    btrim(p_approved_by),
    btrim(p_approval_reason),
    p_reference_hour,
    p_initial_state,
    p_expected_coverage
  );

  return jsonb_build_object(
    'status', 'initialized',
    'referenceHour', p_reference_hour,
    'stateRevision', 0
  );
end;
$$;

revoke all on function public.bora_engine_check_hour(bigint)
  from public, anon, authenticated;

grant execute on function public.bora_engine_check_hour(bigint)
  to service_role;

revoke all on function public.bora_engine_bootstrap_state(
  uuid, text, text, bigint, jsonb, jsonb
) from public, anon, authenticated;

grant execute on function public.bora_engine_bootstrap_state(
  uuid, text, text, bigint, jsonb, jsonb
) to service_role;
