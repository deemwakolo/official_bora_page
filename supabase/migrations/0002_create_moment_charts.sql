-- ============================================================
-- BORA MOMENT CHARTS
-- Historical weekly/monthly chart system
-- Separate from the voting/ranking engine.
-- ============================================================

create table public.moment_chart_editions (
  id uuid primary key default gen_random_uuid(),

  period text not null
    check (period in ('weekly', 'monthly')),

  chart_date date not null,

  display_label text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (period, chart_date)
);

create table public.moment_chart_entries (
  id uuid primary key default gen_random_uuid(),

  edition_id uuid not null
    references public.moment_chart_editions(id)
    on delete cascade,

  song_id uuid
    references public.songs(id)
    on delete set null,

  rank integer not null
    check (rank between 1 and 10),

  movement_kind text not null
    check (
      movement_kind in (
        'up',
        'down',
        'same',
        'new'
      )
    ),

  movement_delta integer
    check (
      movement_delta is null
      or movement_delta > 0
    ),

  title_snapshot text not null,
  artist_snapshot text not null,
  feature_snapshot text,
  producer_snapshot text,
  release_date_snapshot date,
  genre_snapshot text,
  artwork_snapshot text,

  youtube_url_snapshot text,
  spotify_url_snapshot text,
  boomplay_url_snapshot text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (edition_id, rank)
);

create index moment_chart_editions_period_date_idx
on public.moment_chart_editions (
  period,
  chart_date desc
);

create index moment_chart_entries_edition_idx
on public.moment_chart_entries (
  edition_id,
  rank
);

create index moment_chart_entries_song_idx
on public.moment_chart_entries (
  song_id
);

alter table public.moment_chart_editions
enable row level security;

alter table public.moment_chart_entries
enable row level security;

create policy "Public can read moment chart editions"
on public.moment_chart_editions
for select
to anon, authenticated
using (true);

create policy "Public can read moment chart entries"
on public.moment_chart_entries
for select
to anon, authenticated
using (true);