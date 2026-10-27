-- ============================================================
-- BORA ENGINE — STAGE 02: FULL-WINDOW READINESS PREDICATE FIX
-- ============================================================
-- Additive forward-only SQL. Updates the readiness predicate to require
-- every one of the 648 logical slots per active song.
--
-- Combined with part_001b through part_0019f via a build step.

create or replace function public.bora_engine_readiness(
  p_closed_hour bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reference_hour bigint;
  v_closed_hour bigint;
  v_song_count bigint := 0;
  v_active_count bigint := 0;
  v_state_status text := 'missing';
  v_vote jsonb;
  v_seed jsonb;
  v_youtube jsonb;
  v_spotify jsonb;
  v_boomplay jsonb;
  v_ready boolean;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'BORA_ENGINE_WORKER_REQUIRED';
  end if;

  select reference_hour
    into v_reference_hour
  from public.bora_engine_hourly_state_head
  where singleton = true;

  if found then
    v_closed_hour := coalesce(p_closed_hour, v_reference_hour);
    select count(*), count(*) filter (where lifecycle = 'ACTIVE')
      into v_song_count, v_active_count
    from public.bora_engine_song_state;

    if v_song_count > 0
      and v_active_count > 0
      and v_reference_hour = v_closed_hour then
      v_state_status := 'ready';
    elsif v_song_count = 0 then
      v_state_status := 'missing';
    else
      v_state_status := 'incomplete';
    end if;
  else
    v_closed_hour := p_closed_hour;
  end if;
