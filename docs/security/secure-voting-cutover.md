# Secure Voting Cutover Runbook (`cast_vote_secure`)

This runbook activates BORA's hardened guest-voting path (`public.cast_vote_secure`)
in place of the legacy `public.handle_song_vote`. It is the single authoritative
activation procedure. **Read the whole document before acting.** Sections marked
**VERIFIED** reflect the confirmed repository/database state at the time of writing;
sections marked **VERIFY** must be re-checked on the actual target because state
differs per environment.

> ⚠️ This runbook contains **no secrets, tokens, service-role keys, or database
> passwords**. Obtain those from the authorized secret store at activation time.
> Never commit them.

---

## 0. What this feature is

| Layer | File | State |
|---|---|---|
| DB: vote-event log + RPC | `supabase/migrations/0010_hardened_guest_voting.sql` | Prepared |
| DB: rate-limit serialization | `supabase/migrations/0011_serialize_vote_rate_limit.sql` | Prepared, **forward-only** |
| Frontend helper | `lib/supabase/secure-vote.ts` | Prepared (no fallback to legacy) |
| Frontend wiring | `app/components/ChartWrapper.tsx` | Wired behind a **default-off** switch |

- **RPC:** `cast_vote_secure(p_song_id uuid, p_vote_type text, p_idempotency_key text) returns jsonb`
- **Switch:** `NEXT_PUBLIC_BORA_SECURE_VOTING === 'true'` (build-time inlined by Next.js).
- **Legacy path** `handle_song_vote(song_id, vote_type)` remains the default and is **never revoked** by this work.

### Confirmed vs. unknown environment state

- **VERIFIED (production `ktngrhqhxiklfewmwmev`):** migration `0010` was applied — `vote_events`
  and `cast_vote_secure` exist, `EXECUTE` granted to `authenticated` only, live
  `handle_song_vote` unchanged, `songs` counters unchanged. `0011` was **not applied**,
  so the **production RPC currently still carries the rate-limit race** (no per-voter lock).
- **VERIFY (every target):** do **not** assume `0010`/`0011` are applied. Check
  `supabase_migrations.schema_migrations` and `pg_proc` on the target before acting.
- **VERIFY:** anonymous sign-in must be enabled in **Auth → Providers** (separate from the
  local `config.toml` flag, which only governs the local stack).

---

## 1. Confirm the target Supabase project and environment

1. Identify the exact target: production, staging, or local.
2. Confirm the project ref. **Production is `ktngrhqhxiklfewmwmev` — never run
   `supabase db push --linked`, `migration up --linked`, or any production write
   against a different project by accident.**
3. Confirm you are using the **target's own** credentials (never production keys for local tests).
4. Record the current state (read-only):

   ```sql
   select version, name
   from supabase_migrations.schema_migrations
   order by version;
   -- note presence/absence of 0010 and 0011

   select proname, pg_get_function_identity_arguments(oid) as args
   from pg_proc
   where proname in ('handle_song_vote','cast_vote_secure');

   select proname, r.rolname
   from pg_proc p
   join aclexplode(p.proacl) a on true
   join pg_roles r on r.oid = a.grantee
   where p.proname = 'cast_vote_secure'
   order by r.rolname;
   ```

## 2. Review the migration SQL and dependencies

Review **both** files in full before applying.

- **`0010`** creates `public.vote_events` and `public.cast_vote_secure`.
  - Dependencies: `public.songs` (FK + counter updates), `gen_random_uuid()` (pgcrypto),
    `auth.uid()` / `auth.jwt()` (Supabase Auth).
  - Security: RLS on, **no policies** (table locked); RPC is `SECURITY DEFINER` with
    `search_path = public, pg_temp`; `EXECUTE` to `authenticated` only; `PUBLIC`/`anon` revoked.
- **`0011`** replaces `cast_vote_secure` with a version that adds, **after identity
  resolution and before the rate-limit count**:

  ```sql
  perform pg_advisory_xact_lock(hashtext(v_voter_ref::text));
  ```

  - Dependencies: `0010` applied, `public.vote_events`, `pg_advisory_xact_lock` / `hashtext`.
  - It preserves the signature, grants, validation, idempotency, and counter semantics
    exactly; only the lock line differs.

## 3. Apply `0010` **only if** not already recorded as applied

```bash
# from the repository root, target already linked/confirmed in step 1
supabase migration up        # or the project's approved deploy path
```

- If `0010` is already recorded (e.g. it is on production), **skip** — it is additive and
  re-applying is unnecessary.
- Re-run the step-1 read-only queries to confirm `vote_events` and `cast_vote_secure` exist
  and grants are `authenticated` only.

## 4. Apply `0011` (forward-only rate-limit serialization)

```bash
supabase migration up
```

- `0011` is **required before enabling the flag**: it closes the concurrent rate-limit race.
- After applying, confirm the function body contains the advisory lock and that the
  signature/grants are unchanged:

  ```sql
  select pg_get_functiondef(oid) ~ 'pg_advisory_xact_lock\(hashtext\(v_voter_ref::text\)\)' as has_lock
  from pg_proc where proname = 'cast_vote_secure';
  ```

## 5. Enable anonymous sign-in in Supabase Auth

- **Target (production/staging):** Auth → Providers → enable **Anonymous sign-ins**.
  This is separate from `supabase/config.toml` (which only affects local).
- **Local:** already `enable_anonymous_sign_ins = true` in `supabase/config.toml`.
- The secure path cannot vote without this: `cast_vote_secure` derives identity from
  `auth.uid()`, which requires an authenticated (anonymous) JWT.

## 6. Set the frontend switch in the target environment

Set, for the **target environment only**:

```
NEXT_PUBLIC_BORA_SECURE_VOTING=true
```

- Exact string `"true"`. Any other value (`"1"`, `"yes"`, `"TRUE"`, empty, unset) keeps legacy.
- Do **not** set this in `.env.local`, in unrelated environments, or in CI unless you are
  explicitly activating that environment.

## 7. Redeploy the frontend

Next.js inlines `NEXT_PUBLIC_*` at build time. **The flag has no effect until a new build
is produced and deployed.** Redeploy so the bundle contains the secure branch.

## 8. Expected guest behavior + known limitations (read BEFORE enabling)

**Expected behavior once enabled:**
- A guest is auto-signed-in anonymously (no email/phone/registration).
- Each vote carries a fresh idempotency key; an exact retry returns `duplicate` (no
  double-count); a reused key with a different payload is rejected (`23505`).
- Accepted and duplicate both surface as success in the UI; all other outcomes take the
  existing error path (no success popup). **There is no fallback to legacy on failure.**
- Counters (`upvotes`/`downvotes`/`momentum_score`) change with the **same semantics** as
  the legacy RPC, so optimistic momentum and rank sync stay valid.
- Rate limit: 60 accepted votes per verified identity per rolling hour; `0011`'s per-voter
  lock prevents concurrent overshoot.

**Known limitations (do not treat as production-ready until resolved):**
- **End-to-end integration is NOT tested.** No isolated project or local stack has run the
  JS-client flow (Docker is unavailable on the dev machine; local `supabase start` blocked
  by incomplete migration history). Only SQL-transaction checks (rolled back) and the
  harness self-tests (`node scripts/verify-cast-vote-secure.mjs --selftest`, 9/9) exist.
- **The `0011` race fix is prepared, not deployed** to production at the time of writing —
  apply it (step 4) before enabling, or the 60/hour cap can be overshot under concurrency.
- **Guest identity persistence depends on the browser Supabase Auth session** (cookie/
  localStorage). It can be cleared, copied, or bypassed; it is **not** proof of a unique
  person and does **not** prevent multi-identity / multi-device abuse. The rate limit is a
  soft velocity cap, not a sybil defence.
- The secure path has **never been activated on the public site.**

## 9. Rollback procedure

1. **Frontend rollback (fast, no data loss):**
   - Set `NEXT_PUBLIC_BORA_SECURE_VOTING` to anything other than the exact string `"true"`
     (e.g. remove it or set `false`), then **redeploy a new frontend build**.
   - Because Next.js inlines the variable at build time, an env-only change without a
     rebuild does **not** take effect. The flag is effectively compile-time.
2. **What rollback does NOT do:**
   - It **does not reverse database migrations** — `0010`/`0011` stay applied; `vote_events`,
     `cast_vote_secure`, and its grants remain in place.
   - The **legacy `handle_song_vote` RPC remains available** and is not revoked by this work,
     so the legacy chart keeps working after rollback.
3. **Data-reconciliation limitation (important):**
   - The secure path writes durable per-voter events to `vote_events`; the legacy path does
     **not** — it only bumps the `songs` aggregate counters (and has no idempotency, so
     legacy retries can double-count).
   - Votes already recorded in `vote_events` are **not** automatically merged into, or
     reconciled with, legacy aggregate records.
   - Switching backends produces **divergent vote histories and attribution**: after a
     rollback, new votes continue to move `songs` counters but create no `vote_events` rows,
     and the per-identity history/rate-limit/idempotency guarantees are lost.
   - **Rollback is a traffic-routing mechanism, not a data-reconciliation mechanism.** Do not
     treat pre-rollback and post-rollback counters/histories as a single consistent series.

---

## Quick reference

| Step | Action | Reversible? |
|---|---|---|
| 1 | Confirm target project + read current state | read-only |
| 2 | Review `0010` + `0011` SQL | read-only |
| 3 | Apply `0010` if absent | additive (no drop) |
| 4 | Apply `0011` (closes race) | forward-only (`create or replace`) |
| 5 | Enable anonymous sign-in (Auth) | toggle |
| 6 | Set `NEXT_PUBLIC_BORA_SECURE_VOTING=true` | env change |
| 7 | Redeploy frontend | redeploy |
| 8 | (Read limitations) | — |
| 9 | Rollback = unset flag + rebuild | see §9 caveats |

**Status:** prepared and documented; **not activated**. No migration was applied, no Auth
setting changed, and no environment variable was set by this runbook.

