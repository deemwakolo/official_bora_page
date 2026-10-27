    -- Seed hours: full 72-hour window [R-71, R]
    select jsonb_build_object(
      'status', case when count(*) filter (where c.status = 'COMPLETE') = v_active_count * 72
        then 'ready' else 'incomplete' end,
      'expected', v_active_count * 72,
      'complete', count(*) filter (where c.status = 'COMPLETE'),
      'missing', greatest(v_active_count * 72 - count(c.song_id), 0),
      'unavailable', count(*) filter (where c.status = 'UNAVAILABLE'),
      'failed', count(*) filter (where c.status = 'FAILED'),
      'records', (
        select count(*)
        from public.bora_engine_seed_hours sh
        where sh.hour_index = v_closed_hour
          and sh.song_id in (
            select song_id
            from public.bora_engine_song_state
            where lifecycle = 'ACTIVE'
          )
      ),
      'zeroRecords', (
        select count(*)
        from public.bora_engine_seed_hours sh
        where sh.hour_index = v_closed_hour
          and sh.c = 0
          and sh.song_id in (
            select song_id
            from public.bora_engine_song_state
            where lifecycle = 'ACTIVE'
          )
      )
    )
      into v_seed
    from public.bora_engine_hourly_input_coverage c
    join public.bora_engine_song_state s on s.song_id = c.song_id
    where s.lifecycle = 'ACTIVE'
      and c.input_type = 'SEED'
      and c.hour_index between v_closed_hour - 71 and v_closed_hour;

    -- Platform observations: full 168-hour window [R-167, R]
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
        where p.platform = 'youtube'
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
        where p.platform = 'youtube'
          and p.value = 0
          and p.hour_index between v_closed_hour - 167 and v_closed_hour
          and p.song_id in (
            select song_id
            from public.bora_engine_song_state
            where lifecycle = 'ACTIVE'
          )
      )
    )
      into v_youtube
    from public.bora_engine_hourly_input_coverage c
    join public.bora_engine_song_state s on s.song_id = c.song_id
    where s.lifecycle = 'ACTIVE'
      and c.input_type = 'YOUTUBE'
      and c.hour_index between v_closed_hour - 167 and v_closed_hour;
