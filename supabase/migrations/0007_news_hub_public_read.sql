-- ============================================================
-- BORA NEWS HUB — PUBLIC READ POLICY
-- ============================================================
--
-- news_hub had RLS enabled but ZERO policies, so nothing could
-- read it — not even the public News reader.
--
-- This adds READ ONLY. It does not open any write path:
--   - no INSERT / UPDATE / DELETE policy is created here
--   - writes still go exclusively through save_news_hub_item(...)
--     (SECURITY DEFINER, auth.role() check, granted to
--     authenticated only)
--
-- Intended boundary:
--   Public            -> SELECT only
--   Authenticated     -> write via the controlled RPC
-- ============================================================

create policy "Public can read news hub"
on public.news_hub
for select
to anon, authenticated
using (true);
