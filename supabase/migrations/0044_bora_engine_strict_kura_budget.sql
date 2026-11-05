-- Keep authoritative ACTIVE Kura state within BORA's 50-point chart budget.
-- Normalize legacy accumulated state proportionally before adding the guards.

lock table public.bora_engine_song_state in access exclusive mode;

with active_total as (
  select coalesce(sum(persistent_kura), 0) as total
  from public.bora_engine_song_state
  where lifecycle = 'ACTIVE'
)
update public.bora_engine_song_state s
set persistent_kura = s.persistent_kura * 50 / active_total.total,
    updated_at = clock_timestamp()
from active_total
where s.lifecycle = 'ACTIVE'
  and active_total.total > 50;

alter table public.bora_engine_song_state
  add constraint bora_engine_active_kura_per_song_budget_check
  check (lifecycle <> 'ACTIVE' or persistent_kura <= 50);

create function public.bora_engine_lock_active_kura_budget()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  perform pg_advisory_xact_lock(1329746766, 50);
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create function public.bora_engine_validate_active_kura_budget()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_total numeric;
begin
  perform pg_advisory_xact_lock(1329746766, 50);
  select coalesce(sum(persistent_kura), 0)
    into v_total
  from public.bora_engine_song_state
  where lifecycle = 'ACTIVE';

  if v_total > 50.000000001 then
    raise exception 'BORA_ENGINE_ACTIVE_KURA_BUDGET_EXCEEDED'
      using detail = format('active Kura total is %s; maximum is 50', v_total);
  end if;
  return null;
end;
$$;

create trigger bora_engine_song_state_kura_budget_lock
before insert or update or delete
on public.bora_engine_song_state
for each row
execute function public.bora_engine_lock_active_kura_budget();

create constraint trigger bora_engine_song_state_kura_budget_check
after insert or update or delete
on public.bora_engine_song_state
deferrable initially deferred
for each row
execute function public.bora_engine_validate_active_kura_budget();
