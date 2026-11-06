-- Ensure the chart-hold list is enforced on the real publication pipeline.
-- Songs in public.bora_chart_hold are excluded from the engine snapshot before
-- the daily-rank publication is evaluated and persisted.

create or replace function public.bora_engine_publication_input_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_eligibility jsonb;
  v_engine_snapshot jsonb;
  v_source_revision_before bigint;
  v_source_revision_after bigint;
  v_reference_hour bigint;
  v_state_reference_hour bigint;
  v_state_revision bigint;
  v_snapshot_date date;
  v_current_publication_id uuid;
  v_rank_snapshots jsonb;
  v_youtube jsonb;
  v_spotify jsonb;
  v_boomplay jsonb;
  v_held_song_ids uuid[];
  v_filtered_songs jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'BORA_ENGINE_WORKER_REQUIRED';
  end if;

  select reference_hour
    into v_reference_hour
  from public.bora_engine_hourly_state_head
  where singleton = true;
  if not found or v_reference_hour < 0 then
    return jsonb_build_object(
      'status', 'not-ready',
      'reason', 'engine-state-missing'
    );
  end if;

  select revision
    into v_source_revision_before
  from public.bora_engine_publication_source_head
  where singleton = true;
  if not found then
    raise exception 'BORA_ENGINE_PUBLICATION_SOURCE_HEAD_MISSING';
  end if;

  v_eligibility := public.bora_engine_publish_eligibility(v_reference_hour);
  if v_eligibility ->> 'status' is distinct from 'eligible' then
    return jsonb_build_object(
      'status', 'not-ready',
      'reason', 'publication-ineligible',
      'eligibility', v_eligibility
    );
  end if;

  v_engine_snapshot := public.bora_engine_hourly_snapshot(v_reference_hour);
  if v_engine_snapshot ->> 'status' is distinct from 'ready' then
    return jsonb_build_object(
      'status', 'not-ready',
      'reason', 'engine-snapshot-incomplete',
      'snapshot', v_engine_snapshot
    );
  end if;

  v_held_song_ids := array(
    select song_id
    from public.bora_chart_hold
  );
  if cardinality(v_held_song_ids) > 0 then
    v_filtered_songs := coalesce(
      (
        select jsonb_agg(song)
        from jsonb_array_elements(v_engine_snapshot -> 'state' -> 'songs') as song
        where not ((song ->> 'songId')::uuid = any(v_held_song_ids))
      ),
      '[]'::jsonb
    );
    v_engine_snapshot := jsonb_set(
      v_engine_snapshot,
      '{state,songs}',
      v_filtered_songs,
      true
    );
  end if;

  v_state_reference_hour :=
    (v_engine_snapshot -> 'state' ->> 'referenceHour')::bigint;
  v_state_revision := (v_engine_snapshot ->> 'stateRevision')::bigint;
  v_snapshot_date :=
    (to_timestamp(v_reference_hour * 3600) at time zone 'Africa/Nairobi')::date;

  with latest_revisions as (
    select distinct on (effective_date)
      id, effective_date
    from public.bora_engine_daily_platform_rank_snapshots
    where effective_date <= v_snapshot_date
    order by effective_date desc, revision desc
  ),
  selected as (
    select id, effective_date
    from latest_revisions
    order by effective_date desc
    limit 7
  )
  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'effectiveDate', selected.effective_date,
          'ranks', coalesce((
            select jsonb_agg(jsonb_build_object(
              'songId', entries.song_id::text,
              'rank', entries.rank
            ) order by entries.song_id)
            from public.bora_engine_daily_platform_rank_entries entries
            where entries.snapshot_id = selected.id
              and entries.platform = 'youtube'
          ), '[]'::jsonb)
        )
        order by selected.effective_date
      ),
      '[]'::jsonb
    ),
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'effectiveDate', selected.effective_date,
          'ranks', coalesce((
            select jsonb_agg(jsonb_build_object(
              'songId', entries.song_id::text,
              'rank', entries.rank
            ) order by entries.song_id)
            from public.bora_engine_daily_platform_rank_entries entries
            where entries.snapshot_id = selected.id
              and entries.platform = 'spotify'
          ), '[]'::jsonb)
        )
        order by selected.effective_date
      ),
      '[]'::jsonb
    ),
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'effectiveDate', selected.effective_date,
          'ranks', coalesce((
            select jsonb_agg(jsonb_build_object(
              'songId', entries.song_id::text,
              'rank', entries.rank
            ) order by entries.song_id)
            from public.bora_engine_daily_platform_rank_entries entries
            where entries.snapshot_id = selected.id
              and entries.platform = 'boomplay'
          ), '[]'::jsonb)
        )
        order by selected.effective_date
      ),
      '[]'::jsonb
    )
  into v_youtube, v_spotify, v_boomplay
  from selected;

  select publication_id
    into v_current_publication_id
  from public.bora_engine_publication_head
  where singleton = true;
  if not found then
    raise exception 'BORA_ENGINE_PUBLICATION_HEAD_MISSING';
  end if;

  select reference_hour, revision
    into v_state_reference_hour, v_state_revision
  from public.bora_engine_hourly_state_head
  where singleton = true;
  if not found
    or v_state_reference_hour <> v_reference_hour
    or v_state_reference_hour <>
      (v_engine_snapshot -> 'state' ->> 'referenceHour')::bigint
    or v_state_revision <>
      (v_engine_snapshot ->> 'stateRevision')::bigint then
    return jsonb_build_object(
      'status', 'not-ready',
      'reason', 'engine-state-changed'
    );
  end if;

  select revision
    into v_source_revision_after
  from public.bora_engine_publication_source_head
  where singleton = true;
  if not found or v_source_revision_after <> v_source_revision_before then
    return jsonb_build_object(
      'status', 'not-ready',
      'reason', 'source-snapshot-changed'
    );
  end if;

  v_rank_snapshots := jsonb_build_object(
    'youtube', v_youtube,
    'spotify', v_spotify,
    'boomplay', v_boomplay
  );

  return jsonb_build_object(
    'status', 'ready',
    'referenceHour', v_reference_hour,
    'stateRevision', v_state_revision,
    'sourceRevision', v_source_revision_after,
    'expectedCurrentPublication',
      case
        when v_current_publication_id is null
          then jsonb_build_object('status', 'initial')
        else jsonb_build_object(
          'status', 'published',
          'publicationId', v_current_publication_id
        )
      end,
    'engineSnapshot', v_engine_snapshot,
    'dailyPlatformRankSnapshots', v_rank_snapshots
  );
end;
$$;

revoke all on function public.bora_engine_publication_input_snapshot()
from public, anon, authenticated;
grant execute on function public.bora_engine_publication_input_snapshot()
to service_role;
