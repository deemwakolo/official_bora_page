CREATE OR REPLACE FUNCTION public.test_func(bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
declare
  v_run public.bora_engine_hourly_runs%rowtype;
begin
  return jsonb_build_object('status', 'completed');
end;
$$;

