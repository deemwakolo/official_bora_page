-- Minimal test
select 1;

-- Test function with declare block
create function public.min_test_handler()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_run public.bora_engine_hourly_runs%rowtype;
  v_active_count bigint;
  v_complete_count bigint;
begin
  return jsonb_build_object('status', 'completed');
end;
$$;
