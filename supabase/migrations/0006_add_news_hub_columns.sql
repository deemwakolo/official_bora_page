-- ============================================================
-- BORA NEWS HUB — STEP 7b SCHEMA + SECURED SAVE RPC
-- ============================================================
--
-- Extends the EXISTING public.news_hub so it can honestly
-- represent the existing frontend NewsItem contract.
--
-- No new table. No new CMS. Existing columns are all kept:
--   id, content, media_url, is_insta, created_at
--
-- Column mapping (frontend NewsItem -> news_hub):
--   id           -> id            (existing)
--   title        -> title         (new)
--   category     -> category      (new)
--   excerpt      -> excerpt       (new)
--   image        -> media_url     (existing, reused as-is)
--   publishedAt  -> published_at  (new, source of truth)
--   source       -> source        (new)
--   isHot        -> is_hot        (new)
--   timestamp    -> DERIVED from published_at at read time
--                   (deliberately NOT stored as a column)
--   content      -> article/post body (existing, preserved,
--                   maps to no NewsItem field; additive only)
--
-- Additive only: the table has 0 rows, so no backfill is needed
-- and no existing value can be broken.
-- ============================================================

alter table public.news_hub
  add column if not exists title        text,
  add column if not exists category     text,
  add column if not exists excerpt      text,
  add column if not exists source       text,
  add column if not exists is_hot       boolean     not null default false,
  add column if not exists published_at timestamptz;


-- ============================================================
-- SECURED SAVE RPC: save_news_hub_item
--
-- Security Model (mirrors 0003 Moment Charts exactly):
-- 1. NO direct INSERT/UPDATE/DELETE policies on news_hub.
-- 2. Direct table mutations by anon or authenticated stay
--    blocked by RLS.
-- 3. The ONLY authorized write path is this function.
-- 4. EXECUTE revoked from PUBLIC/anon, granted to authenticated.
-- 5. Fixed search_path = public, pg_temp.
-- 6. p_id is taken from the caller only to UPDATE an existing
--    row. The caller can never set id, media_url, is_insta,
--    created_at — those are not writable through this RPC.
-- ============================================================

create or replace function public.save_news_hub_item(
  p_id      uuid,
  p_title   text,
  p_category text,
  p_excerpt text,
  p_source  text,
  p_is_hot  boolean,
  p_published_at timestamptz,
  p_content text,
  p_media_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row record;
begin
  -- 1. AUTHENTICATION CHECK
  if auth.role() <> 'authenticated' then
    raise exception 'Unauthorized: caller must be authenticated';
  end if;

  -- 2. VALIDATE REQUIRED EDITOR FIELDS
  if coalesce(trim(p_title), '') = '' then
    raise exception 'title cannot be empty';
  end if;

  if coalesce(trim(p_category), '') = '' then
    raise exception 'category cannot be empty';
  end if;

  if coalesce(trim(p_excerpt), '') = '' then
    raise exception 'excerpt cannot be empty';
  end if;

  if coalesce(trim(p_media_url), '') = '' then
    raise exception 'media_url (image) cannot be empty';
  end if;

  -- 3. CREATE OR UPDATE
  -- media_url is writable here (it backs NewsItem.image), but
  -- is_insta and created_at are deliberately NOT exposed.
  if p_id is null then
    insert into public.news_hub (
      content, media_url, is_insta, created_at,
      title, category, excerpt, source, is_hot, published_at
    )
    values (
      nullif(trim(p_content), ''),
      trim(p_media_url),
      false,
      now(),
      trim(p_title),
      trim(p_category),
      nullif(trim(p_excerpt), ''),
      nullif(trim(p_source), ''),
      coalesce(p_is_hot, false),
      p_published_at
    )
    returning * into v_row;
  else
    update public.news_hub
    set
      content = nullif(trim(p_content), ''),
      media_url = trim(p_media_url),
      title = trim(p_title),
      category = trim(p_category),
      excerpt = nullif(trim(p_excerpt), ''),
      source = nullif(trim(p_source), ''),
      is_hot = coalesce(p_is_hot, false),
      published_at = p_published_at
    where id = p_id
    returning * into v_row;

    if not found then
      raise exception 'News item not found: %', p_id;
    end if;
  end if;

  return jsonb_build_object(
    'success', true,
    'id', v_row.id,
    'created', p_id is null
  );
end;
$$;

-- Revoke all execute rights from public/anon, grant strictly to authenticated
revoke execute on function public.save_news_hub_item(uuid, text, text, text, text, boolean, timestamptz, text, text) from public;
revoke execute on function public.save_news_hub_item(uuid, text, text, text, text, boolean, timestamptz, text, text) from anon;
grant execute on function public.save_news_hub_item(uuid, text, text, text, text, boolean, timestamptz, text, text) to authenticated;
