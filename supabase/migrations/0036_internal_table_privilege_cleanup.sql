-- These tables have no public RLS policies or direct application readers.
-- Keep their existing service-role access while removing unused client grants.
revoke all on table public.platform_stats, public.site_config
  from public, anon, authenticated;

-- This policy duplicates the public SELECT policy for authenticated users.
drop policy if exists "Songs_Read_Authenticated" on public.songs;
