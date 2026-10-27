    select jsonb_build_object(
      'status', case when count(*) filter (where c.status = 'COMPLETE') = v_active_count * 168
        then 'ready' else 'incomplete' end,
      'expected', v_active_count * 168,
      'complete', count(*) filter (where c.status = 'COMPLETE'),
      'missing', greatest(v_active_count * 168 - count(c.song_id), 0),
      'unavailable', count(*) filter (where c.status = 'UNAVAILABLE'),
      'failed', count(*) filter (where c.status = 'FAILED'),
      'records', (
        select count(*)
        from public.bora_engine_platform_observations p
        where p.platform = 'spotify'
          and p.hour_index between v_closed_hour - 167 and v_closed_hour
          and p.song_id in (
            select song_id
            from public.bora_engine_song_state
            where lifecycle = 'ACTIVE'
          )
      ),
      'zeroRecords', (
        select count(*)
        from public.bora_engine_platform_observations p
        where p.platform = 'spotify'
          and p.value = 0
          and p.hour_index between v_closed_hour - 167 and v_closed_hour
          and p.song_id in (
            select song_id
            from public.bora_engine_song_state
            where lifecycle = 'ACTIVE'
          )
      )
    )
      into v_spotify
    from public.bora_engine_hourly_input_coverage c
    join public.bora_engine_song_state s on s.song_id = c.song_id
    where s.lifecycle = 'ACTIVE'
      and c.input_type = 'SPOTIFY'
      and c.hour_index between v_closed_hour - 167 and v_closed_hour;

    select jsonb_build_object(
      'status', case when count(*) filter (where c.status = 'COMPLETE') = v_active_count * 168
        then 'ready' else 'incomplete' end,
      'expected', v_active_count * 168,
      'complete', count(*) filter (where c.status = 'COMPLETE'),
      'missing', greatest(v_active_count * 168 - count(c.song_id), 0),
      'unavailable', count(*) filter (where c.status = 'UNAVAILABLE'),
      'failed', count(*) filter (where c.status = 'FAILED'),
      'records', (
        select count(*)
        from public.bora_engine_platform_observations p
        where p.platform = 'boomplay'
          and p.hour_index between v_closed_hour - 167 and v_closed_hour
          and p.song_id in (
            select song_id
            from public.bora_engine_song_state
            where lifecycle = 'ACTIVE'
          )
      ),
      'zeroRecords', (
        select count(*)
        from public.bora_engine_platform_observations p
        where p.platform = 'boomplay'
          and p.value = 0
          and p.hour_index between v_closed_hour - 167 and v_closed_hour
          and p.song_id in (
            select song_id
            from public.bora_engine_song_state
            where lifecycle = 'ACTIVE'
          )
      )
    )
      into v_boomplay
    from public.bora_engine_hourly_input_coverage c
    join public.bora_engine_song_state s on s.song_id = c.song_id
    where s.lifecycle = 'ACTIVE'
      and c.input_type = 'BOOMPLAY'
      and c.hour_index between v_closed_hour - 167 and v_closed_hour;
  else
    v_vote := jsonb_build_object(
      'status', 'incomplete', 'expected', 1, 'complete', 0, 'missing', 1,
      'unavailable', 0, 'failed', 0, 'records', 0, 'zeroRecords', 0,
      'acceptedEvents', 0
    );
    v_seed := v_vote;
    v_youtube := jsonb_build_object(
      'status', 'incomplete', 'expected', 168, 'complete', 0, 'missing', 168,
      'unavailable', 0, 'failed', 0, 'records', 0, 'zeroRecords', 0
    );
    v_spotify := v_youtube;
    v_boomplay := v_youtube;
  end if;

  v_ready := v_state_status = 'ready'
    and v_vote ->> 'status' = 'ready'
    and v_seed ->> 'status' = 'ready'
    and v_youtube ->> 'status' = 'ready'
    and v_spotify ->> 'status' = 'ready'
    and v_boomplay ->> 'status' = 'ready';

  return jsonb_build_object(
    'status', case when v_ready then 'ready' else 'not-ready' end,
    'closedHour', v_closed_hour,
    'checks', jsonb_build_object(
      'initialState', jsonb_build_object(
        'status', v_state_status,
        'songCount', v_song_count,
        'referenceHour', v_reference_hour
      ),
      'voteHistory', v_vote,
      'seedHours', v_seed,
      'youtube', v_youtube,
      'spotify', v_spotify,
      'boomplay', v_boomplay
    )
  );
end;
$$;
