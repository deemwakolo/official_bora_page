-- ============================================================
-- BORA ENGINE — idempotent coverage reconciliation
-- ============================================================
-- Fixes the non-idempotent revision churn in hourly vote/seed coverage
-- reconciliation, while preserving the existing mismatch detection and invalidation
-- flow.

create or replace function public.bora_engine_reconcile_hour_coverage(
  p_closed_hour bigint,
  p_cutover_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_head public.bora_engine_hourly_state_head%rowtype;
  v_active_count bigint;
  v_mismatch_count bigint;
  v_vote_event_count bigint;
  v_now timestamptz := clock_timestamp();
  v_state_revision_changed boolean := false;
  v_song public.bora_engine_song_state%rowtype;
  v_vote_existing public.bora_engine_hourly_input_coverage%rowtype;
  v_vote_event_count_for_song bigint;
  v_vote_evidence_hash text;
  v_vote_last_invalidated_revision bigint := -1;
  v_vote_next_revision bigint;
  v_seed_existing public.bora_engine_hourly_input_coverage%rowtype;
  v_seed_source_identity text;
  v_seed_evidence_hash text;
  v_seed_detail text;
  v_seed_last_invalidated_revision bigint := -1;
  v_seed_next_revision bigint;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'BORA_ENGINE_WORKER_REQUIRED';
  end if;
  if p_closed_hour is null
    or p_closed_hour < 0
    or p_cutover_at is null
    or p_cutover_at > v_now
    or p_closed_hour >= floor(extract(epoch from v_now) / 3600)::bigint then
    raise exception 'BORA_ENGINE_INVALID_COVERAGE_RECONCILIATION_REQUEST';
  end if;

  select *
    into v_head
  from public.bora_engine_hourly_state_head
  where singleton = true
  for update;

  if not found then
    return jsonb_build_object('status', 'not-ready', 'reason', 'no-active-songs');
  end if;

  if v_head.reference_hour <> p_closed_hour then
    return jsonb_build_object(
      'status', 'not-ready',
      'reason', 'reference-hour-mismatch',
      'referenceHour', v_head.reference_hour
    );
  end if;

  lock table public.vote_events in share mode;
  lock table public.bora_engine_vote_events in share mode;
  lock table public.bora_engine_song_state in share mode;
  lock table public.bora_engine_vote_buckets in share mode;
  lock table public.bora_engine_seed_hours in share mode;
  lock table public.bora_engine_hourly_input_coverage in share mode;

  select count(*)
    into v_active_count
  from public.bora_engine_song_state
  where lifecycle = 'ACTIVE';

  if v_active_count = 0 then
    return jsonb_build_object('status', 'not-ready', 'reason', 'no-active-songs');
  end if;

  select count(*)
    into v_mismatch_count
  from public.vote_events s
  left join public.bora_engine_vote_events e
    on e.source_system = 'secure_vote_events'
    and e.source_event_id = s.id::text
  where s.created_at >= p_cutover_at
    and floor(extract(epoch from s.created_at) / 3600)::bigint = p_closed_hour
    and (
      e.id is null
      or e.song_id is distinct from s.song_id
      or e.vote_type is distinct from s.vote_type
      or e.occurred_at is distinct from s.created_at
      or e.voter_ref is distinct from s.voter_ref
      or e.identity_method is distinct from s.identity_method
      or e.identity_version is distinct from s.identity_version
      or e.idempotency_key is distinct from s.idempotency_key
      or e.hour_index is distinct from p_closed_hour
    );

  select v_mismatch_count + count(*)
    into v_mismatch_count
  from public.bora_engine_vote_events e
  where e.source_system = 'secure_vote_events'
    and e.occurred_at >= p_cutover_at
    and e.hour_index = p_closed_hour
    and not exists (
      select 1
      from public.vote_events s
      where s.id::text = e.source_event_id
        and s.song_id = e.song_id
        and s.vote_type = e.vote_type
        and s.created_at = e.occurred_at
        and s.voter_ref = e.voter_ref
        and s.identity_method = e.identity_method
        and s.identity_version = e.identity_version
        and s.idempotency_key = e.idempotency_key
    );

  if v_mismatch_count > 0 then
    return jsonb_build_object(
      'status', 'not-ready',
      'reason', 'unreconciled-votes',
      'mismatchCount', v_mismatch_count
    );
  end if;

  with ledger_counts as (
    select
      song_id,
      count(*) filter (where vote_type = 'up') as upvotes,
      count(*) filter (where vote_type = 'down') as downvotes
    from public.bora_engine_vote_events
    where source_system = 'secure_vote_events'
      and hour_index = p_closed_hour
    group by song_id
  )
  select count(*)
    into v_mismatch_count
  from public.bora_engine_song_state s
  left join ledger_counts e on e.song_id = s.song_id
  left join public.bora_engine_vote_buckets b
    on b.song_id = s.song_id
    and b.hour_index = p_closed_hour
  where s.lifecycle = 'ACTIVE'
    and (
      coalesce(e.upvotes, 0) <> coalesce(b.upvotes, 0)
      or coalesce(e.downvotes, 0) <> coalesce(b.downvotes, 0)
    );

  if v_mismatch_count > 0 then
    return jsonb_build_object(
      'status', 'not-ready',
      'reason', 'vote-bucket-mismatch',
      'mismatchCount', v_mismatch_count
    );
  end if;

  select count(*)
    into v_vote_event_count
  from public.vote_events
  where created_at >= p_cutover_at
    and floor(extract(epoch from created_at) / 3600)::bigint = p_closed_hour;

  for v_song in
    select *
    from public.bora_engine_song_state
    where lifecycle = 'ACTIVE'
    order by song_id
  loop
    if to_regclass('public.bora_engine_vote_coverage_invalidation') is not null then
      select max(i.invalidates_revision)
        into v_vote_last_invalidated_revision
      from public.bora_engine_vote_coverage_invalidation i
      where i.song_id = v_song.song_id
        and i.hour_index = p_closed_hour;
    end if;

    select count(*)::bigint,
           md5(coalesce(
             string_agg(
               concat_ws(
                 ':',
                 e.id::text,
                 e.song_id::text,
                 e.vote_type,
                 e.created_at::text,
                 e.voter_ref::text,
                 e.identity_method,
                 e.identity_version::text,
                 e.idempotency_key
               ),
               '|' order by e.id::text
             ),
             ''
           ))
      into v_vote_event_count_for_song, v_vote_evidence_hash
    from public.vote_events e
    where e.song_id = v_song.song_id
      and e.created_at >= p_cutover_at
      and floor(extract(epoch from e.created_at) / 3600)::bigint = p_closed_hour;

    select *
      into v_vote_existing
    from public.bora_engine_hourly_input_coverage
    where song_id = v_song.song_id
      and input_type = 'VOTES'
      and hour_index = p_closed_hour;

    v_vote_next_revision := greatest(
      coalesce(v_vote_existing.revision, 0),
      coalesce(v_vote_last_invalidated_revision, -1)
    ) + 1;

    if v_vote_existing is null then
      insert into public.bora_engine_hourly_input_coverage (
        song_id, input_type, hour_index, status, detail, checked_at, updated_at,
        revision, currentness, source_identity, evidence_id, assessed_at,
        invalidated_reason, derived_delta, raw_value, source, source_system,
        expected_source_identity, evidence_reason
      )
      values (
        v_song.song_id,
        'VOTES',
        p_closed_hour,
        'COMPLETE',
        case when v_vote_event_count_for_song = 0
          then 'Verified no accepted votes in the canonical source for this UTC hour.'
          else 'Verified canonical accepted votes match the immutable Engine ledger.'
        end,
        v_now,
        v_now,
        v_vote_next_revision,
        'current',
        'secure_vote_events',
        'secure-vote-ledger:' || v_vote_evidence_hash,
        v_now,
        null,
        v_vote_event_count_for_song,
        v_vote_event_count_for_song,
        'secure_vote_events',
        'secure_vote_events',
        'secure_vote_events',
        null
      );
      v_state_revision_changed := true;
    elsif
      v_vote_existing.status is distinct from 'COMPLETE'
      or v_vote_existing.detail is distinct from (
        case when v_vote_event_count_for_song = 0
          then 'Verified no accepted votes in the canonical source for this UTC hour.'
          else 'Verified canonical accepted votes match the immutable Engine ledger.'
        end
      )
      or v_vote_existing.currentness is distinct from 'current'
      or v_vote_existing.source_identity is distinct from 'secure_vote_events'
      or v_vote_existing.evidence_id is distinct from 'secure-vote-ledger:' || v_vote_evidence_hash
      or v_vote_existing.invalidated_reason is not null
      or v_vote_existing.derived_delta is distinct from v_vote_event_count_for_song
      or v_vote_existing.raw_value is distinct from v_vote_event_count_for_song
      or v_vote_existing.source is distinct from 'secure_vote_events'
      or v_vote_existing.source_system is distinct from 'secure_vote_events'
      or v_vote_existing.expected_source_identity is distinct from 'secure_vote_events'
    then
      update public.bora_engine_hourly_input_coverage
      set status = 'COMPLETE',
          detail = case when v_vote_event_count_for_song = 0
            then 'Verified no accepted votes in the canonical source for this UTC hour.'
            else 'Verified canonical accepted votes match the immutable Engine ledger.'
          end,
          checked_at = v_now,
          updated_at = v_now,
          revision = v_vote_next_revision,
          currentness = 'current',
          source_identity = 'secure_vote_events',
          evidence_id = 'secure-vote-ledger:' || v_vote_evidence_hash,
          assessed_at = v_now,
          invalidated_reason = null,
          derived_delta = v_vote_event_count_for_song,
          raw_value = v_vote_event_count_for_song,
          source = 'secure_vote_events',
          source_system = 'secure_vote_events',
          expected_source_identity = 'secure_vote_events',
          evidence_reason = null
      where song_id = v_song.song_id
        and input_type = 'VOTES'
        and hour_index = p_closed_hour;
      v_state_revision_changed := true;
    end if;

    select *
      into v_seed_existing
    from public.bora_engine_hourly_input_coverage
    where song_id = v_song.song_id
      and input_type = 'SEED'
      and hour_index = p_closed_hour;

    if to_regclass('public.bora_engine_seed_coverage_invalidation') is not null then
      select max(i.invalidates_revision)
        into v_seed_last_invalidated_revision
      from public.bora_engine_seed_coverage_invalidation i
      where i.song_id = v_song.song_id
        and i.hour_index = p_closed_hour;
    end if;

    select
      case
        when sh.song_id is null then 'seed-none'
        when sh.origin_event_id like 'synthetic-demo%' then 'synthetic-demo-v1'
        else 'bora_engine_seed_hours'
      end,
      case
        when sh.song_id is null then 'Verified no seed record in the Engine seed-hour source.'
        when sh.origin_event_id like 'synthetic-demo%' then 'Verified synthetic seed record; retained as explicitly synthetic input.'
        else 'Verified seed record in the Engine seed-hour source.'
      end,
      md5(concat_ws(
        ':',
        v_song.song_id::text,
        p_closed_hour::text,
        coalesce(sh.c::text, 'empty'),
        coalesce(sh.lifecycle, 'empty'),
        coalesce(sh.version::text, 'empty'),
        coalesce(sh.origin_event_id, 'empty')
      ))
      into v_seed_source_identity, v_seed_detail, v_seed_evidence_hash
    from public.bora_engine_seed_hours sh
    where sh.song_id = v_song.song_id
      and sh.hour_index = p_closed_hour;

    v_seed_next_revision := greatest(
      coalesce(v_seed_existing.revision, 0),
      coalesce(v_seed_last_invalidated_revision, -1)
    ) + 1;

    if v_seed_existing is null then
      insert into public.bora_engine_hourly_input_coverage (
        song_id, input_type, hour_index, status, detail, checked_at, updated_at,
        revision, currentness, source_identity, evidence_id, assessed_at,
        invalidated_reason, derived_delta, raw_value, source, source_system,
        expected_source_identity, evidence_reason
      )
      values (
        v_song.song_id,
        'SEED',
        p_closed_hour,
        'COMPLETE',
        coalesce(v_seed_detail, 'Verified no seed record in the Engine seed-hour source.'),
        v_now,
        v_now,
        v_seed_next_revision,
        'current',
        coalesce(v_seed_source_identity, 'seed-none'),
        'engine-seed-hour:' || coalesce(v_seed_evidence_hash, md5(concat_ws(':', v_song.song_id::text, p_closed_hour::text, 'empty', 'empty', 'empty', 'empty'))),
        v_now,
        null,
        0,
        0,
        coalesce(v_seed_source_identity, 'seed-none'),
        coalesce(v_seed_source_identity, 'seed-none'),
        coalesce(v_seed_source_identity, 'seed-none'),
        null
      );
      v_state_revision_changed := true;
    elsif
      v_seed_existing.status is distinct from 'COMPLETE'
      or v_seed_existing.detail is distinct from coalesce(v_seed_detail, 'Verified no seed record in the Engine seed-hour source.')
      or v_seed_existing.currentness is distinct from 'current'
      or v_seed_existing.source_identity is distinct from coalesce(v_seed_source_identity, 'seed-none')
      or v_seed_existing.evidence_id is distinct from 'engine-seed-hour:' || coalesce(v_seed_evidence_hash, md5(concat_ws(':', v_song.song_id::text, p_closed_hour::text, 'empty', 'empty', 'empty', 'empty')))
      or v_seed_existing.invalidated_reason is not null
      or v_seed_existing.derived_delta is distinct from 0
      or v_seed_existing.raw_value is distinct from 0
      or v_seed_existing.source is distinct from coalesce(v_seed_source_identity, 'seed-none')
      or v_seed_existing.source_system is distinct from coalesce(v_seed_source_identity, 'seed-none')
      or v_seed_existing.expected_source_identity is distinct from coalesce(v_seed_source_identity, 'seed-none')
    then
      update public.bora_engine_hourly_input_coverage
      set status = 'COMPLETE',
          detail = coalesce(v_seed_detail, 'Verified no seed record in the Engine seed-hour source.'),
          checked_at = v_now,
          updated_at = v_now,
          revision = v_seed_next_revision,
          currentness = 'current',
          source_identity = coalesce(v_seed_source_identity, 'seed-none'),
          evidence_id = 'engine-seed-hour:' || coalesce(v_seed_evidence_hash, md5(concat_ws(':', v_song.song_id::text, p_closed_hour::text, 'empty', 'empty', 'empty', 'empty'))),
          assessed_at = v_now,
          invalidated_reason = null,
          derived_delta = 0,
          raw_value = 0,
          source = coalesce(v_seed_source_identity, 'seed-none'),
          source_system = coalesce(v_seed_source_identity, 'seed-none'),
          expected_source_identity = coalesce(v_seed_source_identity, 'seed-none'),
          evidence_reason = null
      where song_id = v_song.song_id
        and input_type = 'SEED'
        and hour_index = p_closed_hour;
      v_state_revision_changed := true;
    end if;
  end loop;

  if v_state_revision_changed then
    update public.bora_engine_hourly_state_head
    set revision = revision + 1,
        updated_at = v_now
    where singleton = true
      and reference_hour = p_closed_hour;
  end if;

  return jsonb_build_object(
    'status', 'ready',
    'closedHour', p_closed_hour,
    'processedActiveSongCount', v_active_count,
    'reconciledVoteEventCount', v_vote_event_count
  );
end;
$$;

revoke all on function public.bora_engine_reconcile_hour_coverage(bigint, timestamptz)
  from public, anon, authenticated;

grant execute on function public.bora_engine_reconcile_hour_coverage(bigint, timestamptz)
  to service_role;
