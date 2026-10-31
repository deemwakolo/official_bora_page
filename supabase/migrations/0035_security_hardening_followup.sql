-- Avoid per-row auth lookups in the FAQ policy and disambiguate the admin RPC.

drop policy if exists faqs_published_read on public.faqs;
create policy faqs_published_read
  on public.faqs
  for select
  to anon, authenticated
  using (
    published is true
    or (
      (select auth.role()) = 'authenticated'
      and (select public.bora_author_is_administrator())
    )
  );

-- The 8-argument overload must not default its last parameter: otherwise
-- calls to the 7-argument admin RPC are ambiguous in SQL/PostgREST.
drop function public.admin_upsert_song(
  integer, text, text, bigint, bigint, integer, text, text
);

create or replace function public.admin_upsert_song(
  p_slot_number integer,
  p_title text,
  p_artist text,
  p_yt_views bigint,
  p_sp_plays bigint,
  p_momentum_score integer,
  p_cover_url text,
  p_youtube_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.songs%rowtype;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'BORA_AUTH_REQUIRED: an authenticated session is required'
      using errcode = '28000';
  end if;

  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <>
    'bora_administrator' then
    raise exception 'BORA_ADMIN_REQUIRED: caller is not an authorized BORA administrator'
      using errcode = '42501';
  end if;

  insert into public.songs as t (
    slot_number,
    title,
    artist,
    yt_views,
    sp_plays,
    momentum_score,
    cover_url,
    youtube_id,
    updated_at
  )
  values (
    p_slot_number,
    p_title,
    p_artist,
    p_yt_views,
    p_sp_plays,
    p_momentum_score,
    p_cover_url,
    p_youtube_id,
    pg_catalog.now()
  )
  on conflict (slot_number) do update
    set title = excluded.title,
        artist = excluded.artist,
        yt_views = excluded.yt_views,
        sp_plays = excluded.sp_plays,
        momentum_score = excluded.momentum_score,
        cover_url = excluded.cover_url,
        youtube_id = excluded.youtube_id,
        updated_at = excluded.updated_at
  returning * into v_row;

  return pg_catalog.to_jsonb(v_row);
end;
$$;

revoke all on function public.admin_upsert_song(
  integer, text, text, bigint, bigint, integer, text, text
) from public, anon, service_role;
grant execute on function public.admin_upsert_song(
  integer, text, text, bigint, bigint, integer, text, text
) to authenticated;
