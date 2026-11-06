-- ============================================================
-- BORA CHART HOLD — ADMINISTRATIVE HOLD LIST FOR ENGINE ROOM
-- ============================================================
-- Purpose:
--   Maintain a protected list of songs withheld from the active chart.
--   The table is intentionally simple: row existence means the song is held.
--   The server action remains the governance boundary; this table just stores
--   the canonical hold list for the Engine Room UI.
-- ============================================================

create table if not exists public.bora_chart_hold (
  song_id uuid primary key references public.songs(id) on delete cascade,
  held_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bora_chart_hold_created_at_idx
  on public.bora_chart_hold (created_at desc);

alter table public.bora_chart_hold enable row level security;

create policy "bora_chart_hold_select_admin_only"
on public.bora_chart_hold
for select
to authenticated
using (
  auth.jwt() -> 'app_metadata' ->> 'role' = 'bora_administrator'
);

create policy "bora_chart_hold_insert_admin_only"
on public.bora_chart_hold
for insert
to authenticated
with check (
  auth.jwt() -> 'app_metadata' ->> 'role' = 'bora_administrator'
  and held_by = auth.uid()
);

create policy "bora_chart_hold_update_admin_only"
on public.bora_chart_hold
for update
to authenticated
using (
  auth.jwt() -> 'app_metadata' ->> 'role' = 'bora_administrator'
)
with check (
  auth.jwt() -> 'app_metadata' ->> 'role' = 'bora_administrator'
  and held_by = auth.uid()
);

create policy "bora_chart_hold_delete_admin_only"
on public.bora_chart_hold
for delete
to authenticated
using (
  auth.jwt() -> 'app_metadata' ->> 'role' = 'bora_administrator'
  and held_by = auth.uid()
);

create or replace function public.set_bora_chart_hold_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bora_chart_hold_set_updated_at on public.bora_chart_hold;
create trigger bora_chart_hold_set_updated_at
before update on public.bora_chart_hold
for each row
execute function public.set_bora_chart_hold_updated_at();
