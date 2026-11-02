-- Remove the remaining hourly-platform prerequisites from Engine snapshots
-- and expose one stable, service-only input for daily-rank publication.

do $$
declare
  v_function record;
  v_definition text;
  v_updated text;
  v_rewritten_count integer := 0;
begin
  for v_function in
    select p.oid, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and p.proname in (
        'bora_engine_hourly_snapshot_base',
        'bora_engine_hourly_snapshot'
      )
      and p.pronargs = 1
  loop
    v_definition := pg_get_functiondef(v_function.oid);
    v_updated := regexp_replace(
      v_definition,
      $regex$or[[:space:]]+\(c\.input_type in \('YOUTUBE', 'SPOTIFY', 'BOOMPLAY'\)[[:space:]]+and[[:space:]]+c\.hour_index between p_closed_hour - 167 and p_closed_hour\)$regex$,
      '',
      'g'
    );
    v_updated := replace(
      v_updated,
      'and c.hour_index = p_closed_hour',
      'and c.hour_index between p_closed_hour - 71 and p_closed_hour'
    );
    v_updated := replace(v_updated, '506', '144');

    if v_updated = v_definition
      or position('p_closed_hour - 167' in v_updated) > 0
      or position('506' in v_updated) > 0
      or position(
        'c.input_type in (''YOUTUBE'', ''SPOTIFY'', ''BOOMPLAY'')'
        in v_updated
      ) > 0 then
      raise exception 'BORA_ENGINE_DAILY_SNAPSHOT_REWRITE_FAILED: %',
        v_function.proname;
    end if;

    execute v_updated;
    v_rewritten_count := v_rewritten_count + 1;
  end loop;

  if v_rewritten_count <> 2 then
    raise exception 'BORA_ENGINE_DAILY_SNAPSHOT_FUNCTIONS_MISSING';
  end if;
end;
$$;

create function public.bora_engine_publication_input_snapshot()
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

revoke all on function
  public.bora_engine_publication_input_snapshot()
from public, anon, authenticated;
grant execute on function
  public.bora_engine_publication_input_snapshot()
to service_role;
