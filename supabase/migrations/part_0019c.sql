revoke all on function public.bora_engine_readiness(bigint)
  from public, anon, authenticated;

grant execute on function public.bora_engine_readiness(bigint)
  to service_role;
