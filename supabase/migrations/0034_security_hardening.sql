-- Harden the exposed FAQ table and lock down function name resolution.

create or replace function public.bora_author_is_administrator()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') =
    'bora_administrator';
$$;

revoke all on function public.bora_author_is_administrator()
  from public, anon, service_role;
grant execute on function public.bora_author_is_administrator()
  to anon, authenticated;

alter table public.faqs enable row level security;

revoke all on table public.faqs from public, anon, authenticated, service_role;
grant select on table public.faqs to anon, authenticated;
grant insert, update, delete on table public.faqs to authenticated;
grant select, insert, update, delete on table public.faqs to service_role;

drop policy if exists faqs_published_read on public.faqs;
drop policy if exists faqs_admin_insert on public.faqs;
drop policy if exists faqs_admin_update on public.faqs;
drop policy if exists faqs_admin_delete on public.faqs;

create policy faqs_published_read
  on public.faqs
  for select
  to anon, authenticated
  using (
    published is true
    or (
      auth.role() = 'authenticated'
      and public.bora_author_is_administrator()
    )
  );

create policy faqs_admin_insert
  on public.faqs
  for insert
  to authenticated
  with check (public.bora_author_is_administrator());

create policy faqs_admin_update
  on public.faqs
  for update
  to authenticated
  using (public.bora_author_is_administrator())
  with check (public.bora_author_is_administrator());

create policy faqs_admin_delete
  on public.faqs
  for delete
  to authenticated
  using (public.bora_author_is_administrator());

create or replace function public.increment_vote(row_id text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.songs
  set raw_votes = raw_votes + 1,
      updated_at = pg_catalog.now()
  where id = row_id::uuid;

  perform public.update_bora_momentum(row_id::uuid);
end;
$$;

create or replace function public.decrement_vote(row_id text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.songs
  set downvotes = downvotes + 1,
      updated_at = pg_catalog.now()
  where id = row_id::uuid;

  perform public.update_bora_momentum(row_id::uuid);
end;
$$;

create or replace function public.cull_weakest_songs()
returns void
language plpgsql
set search_path = ''
as $$
begin
  delete from public.songs
  where id not in (
    select id
    from public.songs
    order by momentum_score desc
    limit 15
  );
end;
$$;

create or replace function public.update_bora_momentum(
  target_id uuid default null
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  total_voters int4;
begin
  select total_platform_voters
    into total_voters
  from public.platform_stats
  where id = 1;

  update public.songs
  set momentum_score = (
    (case
      when yt_rank = 1 then 30
      when yt_rank between 2 and 5 then 25
      when yt_rank between 6 and 10 then 20
      when yt_rank between 11 and 20 then 10
      else 0
    end) +
    (case
      when sp_rank <= 5 then 20
      when sp_rank <= 10 then 15
      when sp_rank <= 20 then 10
      else 0
    end) +
    least(50, (
      ((raw_votes - (downvotes * 0.7))::float
        / nullif(total_voters + 50, 0)) * 50 *
      greatest(
        0.05,
        power(
          0.95,
          extract(epoch from (pg_catalog.now() - updated_at)) / 3600
        )
      )
    ))
  )
  where target_id is null or id = target_id;
end;
$$;

create or replace function public.handle_song_vote(song_id uuid, vote_type text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if vote_type = 'up' then
    update public.songs
    set upvotes = coalesce(upvotes, 0) + 1,
        momentum_score = coalesce(momentum_score, 0) + 1
    where id = song_id;
  elsif vote_type = 'down' then
    update public.songs
    set downvotes = coalesce(downvotes, 0) + 1,
        momentum_score = coalesce(momentum_score, 0) - 1
    where id = song_id;
  end if;
end;
$$;

-- These RPCs intentionally remain callable by authenticated clients. Their
-- bodies enforce the administrator claim or verified voter identity.
alter function public.admin_upsert_song(
  integer, text, text, bigint, bigint, integer, text
) set search_path = '';
alter function public.admin_upsert_song(
  integer, text, text, bigint, bigint, integer, text, text
) set search_path = '';
alter function public.cast_vote_secure(uuid, text, text)
  set search_path = '';
alter function public.save_moment_chart_edition(uuid, jsonb)
  set search_path = '';
alter function public.save_news_hub_item(
  uuid, text, text, text, text, boolean, timestamptz, text, text
) set search_path = '';
alter function public.save_trending_platform(text, jsonb)
  set search_path = '';
alter function public.save_ui_room_config(jsonb, integer)
  set search_path = '';

revoke all on function public.admin_upsert_song(
  integer, text, text, bigint, bigint, integer, text
) from public, anon, service_role;
grant execute on function public.admin_upsert_song(
  integer, text, text, bigint, bigint, integer, text
) to authenticated;

revoke all on function public.admin_upsert_song(
  integer, text, text, bigint, bigint, integer, text, text
) from public, anon, service_role;
grant execute on function public.admin_upsert_song(
  integer, text, text, bigint, bigint, integer, text, text
) to authenticated;

revoke all on function public.cast_vote_secure(uuid, text, text)
  from public, anon, service_role;
grant execute on function public.cast_vote_secure(uuid, text, text)
  to authenticated;

revoke all on function public.save_moment_chart_edition(uuid, jsonb)
  from public, anon, service_role;
grant execute on function public.save_moment_chart_edition(uuid, jsonb)
  to authenticated;

revoke all on function public.save_news_hub_item(
  uuid, text, text, text, text, boolean, timestamptz, text, text
) from public, anon, service_role;
grant execute on function public.save_news_hub_item(
  uuid, text, text, text, text, boolean, timestamptz, text, text
) to authenticated;

revoke all on function public.save_trending_platform(text, jsonb)
  from public, anon, service_role;
grant execute on function public.save_trending_platform(text, jsonb)
  to authenticated;

revoke all on function public.save_ui_room_config(jsonb, integer)
  from public, anon, service_role;
grant execute on function public.save_ui_room_config(jsonb, integer)
  to authenticated;

-- This obsolete overload was created without authorization in migration 0023.
-- The current application uses the separate, guarded integer-argument RPC.
drop function if exists public.admin_upsert_song(
  text, text, text, text, text, text, text, text
);
