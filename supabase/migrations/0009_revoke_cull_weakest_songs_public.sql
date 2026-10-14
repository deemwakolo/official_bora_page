-- ============================================================
-- BORA SECURITY PHASE 1 — CONTAIN PUBLIC DESTRUCTIVE RPC
-- ============================================================
--
-- Target: public.cull_weakest_songs()  —  signature: () RETURNS void
--
-- Verified pre-change (deployed, read-only inspection):
--   - args: none, returns void, language plpgsql, NOT security definer
--   - EXECUTE granted to: PUBLIC, anon, authenticated (+ postgres,
--     service_role via ownership/service defaults)
--   - Body deletes every song outside the top 15 by momentum_score
--   - Zero repository references (no app, admin, job, or migration
--     caller); no scheduled job exists (no cron/pg_cron schema)
--
-- Change (reversible, privilege-only):
--   - REVOKE EXECUTE on this exact signature from PUBLIC, anon,
--     and authenticated. No legitimate caller requires any of them
--     (dependency audit: no callers anywhere in the repository).
--   - The function DEFINITION is preserved untouched for now.
--   - No song rows are deleted, no logic is changed, no other
--     function, policy, or grant is modified in this migration.
--
-- Why authenticated is included: the audit confirmed no legitimate
-- caller under any role; leaving authenticated EXECUTE would leave
-- the mass-delete one stolen session away. Owner-operated use (if
-- ever needed) runs as postgres/service_role, which keep EXECUTE.
--
-- Reversal (if ever required):
--   GRANT EXECUTE ON FUNCTION public.cull_weakest_songs()
--   TO <specific_role>;
-- ============================================================

revoke execute on function public.cull_weakest_songs()
  from public;

revoke execute on function public.cull_weakest_songs()
  from anon;

revoke execute on function public.cull_weakest_songs()
  from authenticated;
