-- ============================================================
-- BORA TRENDING — SINGLE LIVE CURRENT SET
-- ============================================================
--
-- Trending is its own system, separate from charts/voting.
-- One live top-N per platform, replaced on save. No history here.
--
-- title/artist are snapshots so display never depends on the
-- Songs registry. song_id is an optional, nullable link only.
--
-- 1. Public SELECT allowed (public Trending renders for visitors).
-- 2. NO INSERT/UPDATE/DELETE policies. The ONLY write path is the
--    SECURITY DEFINER function in 0005.
-- 3. Ranks are 1..10 for youtube/spotify, 1..8 for artist.
-- ============================================================

create table public.trending_entries (
  id uuid primary key default gen_random_uuid(),

  platform text not null
    check (platform in ('youtube', 'spotify', 'artist')),

  song_id uuid
    references public.songs(id)
    on delete set null,

  title text not null,

  artist text not null,

  rank integer not null
    check (rank between 1 and 10),

  movement integer not null default 0,

  songs_count integer,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (platform, rank)
);

create index trending_entries_platform_rank_idx
on public.trending_entries (
  platform,
  rank
);

alter table public.trending_entries
enable row level security;

create policy "Public can read trending entries"
on public.trending_entries
for select
to anon, authenticated
using (true);
