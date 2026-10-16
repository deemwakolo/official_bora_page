-- BORA: harden public.songs after the secure voting and admin RPC
-- paths have been deployed and verified.

drop policy if exists "Bora_Admin_Policy" on public.songs;

drop policy if exists "Public can read songs" on public.songs;
create policy "Public can read songs"
  on public.songs
  for select
  to anon, authenticated
  using (true);

revoke insert, update, delete, truncate, references, trigger
  on public.songs from anon;

revoke insert, update, delete, truncate, references, trigger
  on public.songs from authenticated;
