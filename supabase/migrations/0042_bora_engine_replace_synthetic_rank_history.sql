-- Allow administrators to replace, but never edit or relabel, synthetic daily
-- rank snapshots. Normal rank entry is no longer restricted to a time window.

do $$
declare
  v_definition text;
  v_updated text;
  v_old text := $old$
  v_local_now := clock_timestamp() at time zone 'Africa/Nairobi';
  if v_local_now::time < time '20:00' then
    return jsonb_build_object('status', 'outside-entry-window');
  end if;
  v_effective_date := v_local_now::date + 1;
  v_effective_at := v_effective_date::timestamp
    at time zone 'Africa/Nairobi';
$old$;
  v_new text := $new$
  v_local_now := clock_timestamp() at time zone 'Africa/Nairobi';
  if nullif(p_request ->> 'effectiveDate', '') is not null then
    if (p_request ->> 'effectiveDate') !~ '^\d{4}-\d{2}-\d{2}$' then
      return jsonb_build_object('status', 'invalid-input');
    end if;
    begin
      v_effective_date := (p_request ->> 'effectiveDate')::date;
    exception
      when invalid_datetime_format or datetime_field_overflow then
        return jsonb_build_object('status', 'invalid-input');
    end;
    if to_char(v_effective_date, 'YYYY-MM-DD') <>
        p_request ->> 'effectiveDate'
      or v_effective_date >= v_local_now::date + 1 then
      return jsonb_build_object('status', 'invalid-input');
    end if;
  else
    v_effective_date := v_local_now::date + 1;
  end if;
  v_effective_at := v_effective_date::timestamp
    at time zone 'Africa/Nairobi';
$new$;
  v_old_snapshot_lookup text := $old$
  select id
    into v_supersedes_id
  from public.bora_engine_daily_platform_rank_snapshots
  where effective_date = v_effective_date
  order by revision desc
  limit 1
  for update;
$old$;
  v_new_snapshot_lookup text := $new$
  select id
    into v_supersedes_id
  from public.bora_engine_daily_platform_rank_snapshots
  where effective_date = v_effective_date
  order by revision desc
  limit 1
  for update;

  if nullif(p_request ->> 'effectiveDate', '') is not null
    and not exists (
      select 1
      from public.bora_engine_daily_platform_rank_snapshots
      where id = v_supersedes_id
        and is_synthetic
    ) then
    return jsonb_build_object('status', 'correction-not-allowed');
  end if;
$new$;
begin
  select pg_get_functiondef(
    'public.bora_engine_admin_submit_daily_platform_ranks(jsonb)'::regprocedure
  )
    into v_definition;

  if position(v_old in v_definition) = 0
    or position(v_old_snapshot_lookup in v_definition) = 0 then
    raise exception 'BORA_ENGINE_DAILY_RANK_SUBMISSION_REWRITE_SOURCE_MISMATCH';
  end if;

  v_updated := replace(v_definition, v_old, v_new);
  v_updated := replace(v_updated, v_old_snapshot_lookup, v_new_snapshot_lookup);

  if v_updated = v_definition
    or position('outside-entry-window' in v_updated) > 0
    or position('and is_synthetic' in v_updated) = 0 then
    raise exception 'BORA_ENGINE_DAILY_RANK_SUBMISSION_REWRITE_FAILED';
  end if;

  execute v_updated;
end;
$$;
