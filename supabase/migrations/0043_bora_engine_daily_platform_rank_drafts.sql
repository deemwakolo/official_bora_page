create table public.bora_engine_daily_platform_rank_drafts (
  effective_date date not null,
  song_id uuid not null references public.songs(id) on delete restrict,
  platform text not null check (platform in ('youtube', 'spotify', 'boomplay')),
  rank integer not null check (rank > 0),
  updated_by uuid not null references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  primary key (effective_date, song_id, platform)
);

comment on table public.bora_engine_daily_platform_rank_drafts is
  'Editable, unpublished per-song rank drafts. Only complete validated snapshots are published.';

alter table public.bora_engine_daily_platform_rank_drafts
  enable row level security;

revoke all on table public.bora_engine_daily_platform_rank_drafts
  from public, anon, authenticated;
grant all on table public.bora_engine_daily_platform_rank_drafts
  to service_role;

create function public.bora_engine_admin_save_daily_platform_rank_draft(
  p_request jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid;
  v_song_id uuid;
  v_effective_date date;
  v_entry jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'BORA_ENGINE_ADMIN_REQUIRED';
  end if;

  if jsonb_typeof(p_request) is distinct from 'object'
    or jsonb_typeof(p_request -> 'songId') is distinct from 'string'
    or jsonb_typeof(p_request -> 'actorUserId') is distinct from 'string'
    or jsonb_typeof(p_request -> 'entries') is distinct from 'array' then
    return jsonb_build_object('status', 'invalid-input');
  end if;

  if (p_request ->> 'songId') !~
       '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
    or (p_request ->> 'actorUserId') !~
       '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
    or jsonb_array_length(p_request -> 'entries') <> 3 then
    return jsonb_build_object('status', 'invalid-input');
  end if;

  v_song_id := (p_request ->> 'songId')::uuid;
  v_actor_id := (p_request ->> 'actorUserId')::uuid;

  if not exists (select 1 from auth.users where id = v_actor_id)
    or not exists (select 1 from public.songs where id = v_song_id) then
    return jsonb_build_object('status', 'invalid-input');
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_request -> 'entries') as item(value)
    where jsonb_typeof(item.value) is distinct from 'object'
      or jsonb_typeof(item.value -> 'platform') is distinct from 'string'
      or item.value ->> 'platform' not in ('youtube', 'spotify', 'boomplay')
      or jsonb_typeof(item.value -> 'rank') is distinct from 'number'
      or (item.value ->> 'rank') !~ '^[1-9][0-9]*$'
      or length(item.value ->> 'rank') > 10
      or case
        when (item.value ->> 'rank') ~ '^[1-9][0-9]*$'
          and length(item.value ->> 'rank') <= 10
        then (item.value ->> 'rank')::numeric > 2147483647
        else false
      end
  )
    or exists (
      select 1
      from jsonb_array_elements(p_request -> 'entries') as item(value)
      group by item.value ->> 'platform'
      having count(*) <> 1
    )
    or exists (
      select 1
      from unnest(array['youtube', 'spotify', 'boomplay'])
        as platforms(platform)
      where not exists (
        select 1
        from jsonb_array_elements(p_request -> 'entries') as item(value)
        where item.value ->> 'platform' = platforms.platform
      )
    ) then
    return jsonb_build_object('status', 'invalid-input');
  end if;

  v_effective_date :=
    (clock_timestamp() at time zone 'Africa/Nairobi')::date + 1;

  perform pg_advisory_xact_lock(hashtext(v_effective_date::text));

  if exists (
    select 1
    from public.bora_engine_daily_platform_rank_snapshots
    where effective_date = v_effective_date
  ) then
    return jsonb_build_object('status', 'snapshot-exists');
  end if;

  for v_entry in
    select value
    from jsonb_array_elements(p_request -> 'entries') as item(value)
  loop
    insert into public.bora_engine_daily_platform_rank_drafts (
      effective_date,
      song_id,
      platform,
      rank,
      updated_by,
      updated_at
    )
    values (
      v_effective_date,
      v_song_id,
      v_entry ->> 'platform',
      (v_entry ->> 'rank')::integer,
      v_actor_id,
      clock_timestamp()
    )
    on conflict (effective_date, song_id, platform)
    do update set
      rank = excluded.rank,
      updated_by = excluded.updated_by,
      updated_at = excluded.updated_at;
  end loop;

  return jsonb_build_object(
    'status', 'saved',
    'effectiveDate', v_effective_date
  );
end;
$$;

revoke all on function
  public.bora_engine_admin_save_daily_platform_rank_draft(jsonb)
from public, anon, authenticated;
grant execute on function
  public.bora_engine_admin_save_daily_platform_rank_draft(jsonb)
to service_role;
