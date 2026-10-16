# Voting & `songs` Permissions — Proposed Remediation (REVIEW ONLY)

**Status:** Proposal for review. No SQL executed, no migration applied, no source
edited, no env changed, no deploy. This document is the reviewable artifact; the
concrete diffs and migration SQL are below.

**Central finding (drives the whole design):** `public.handle_song_vote(uuid,text)`
is **SECURITY INVOKER** (verified live). It updates `songs.upvotes/downvotes/
momentum_score` using the **caller's** privileges. Therefore any restriction of
`songs` write access — whether by revoking table grants or by an admin-only RLS
write policy — **breaks legacy voting**, because ordinary voters lose the ability
to update `songs`. The hardened `cast_vote_secure` is **SECURITY DEFINER** (runs
as its owner, bypasses RLS, needs no caller grant), so it keeps working after the
restriction. Consequence: **the secure-voting cutover and the `songs` permission
tightening are coupled and must be deployed together** (see section D).

---

## A. Findings confirmed from source

1. **Live voting caller.** `app/components/ChartWrapper.tsx` is the only live
   voting surface (mounted at `app/page.tsx:151` and
   `app/admin/control-room/page.tsx:90`). `ChartWrapper.tsx:27`
   `const SECURE_VOTING = process.env.NEXT_PUBLIC_BORA_SECURE_VOTING === 'true';`.
   - Secure branch `ChartWrapper.tsx:170-192` -> `castSecureVote(...)` ->
     `supabase.rpc('cast_vote_secure', ...)` (`lib/supabase/secure-vote.ts:143`).
   - Legacy branch `ChartWrapper.tsx:193-208` -> `supabase.rpc('handle_song_vote', ...)`.
   - Default is legacy unless the deployed build inlines the flag as exactly `'true'`.
2. **Post-vote direct write (the vulnerability).** `ChartWrapper.tsx:242-257`
   runs **after both branches** and does, from the browser client:
   `supabase.from('songs').update({ slot_number, previous_rank }).eq('id', ...)`.
   This requires `anon`/`authenticated` UPDATE on `songs` and writes
   `slot_number` and `previous_rank` on every vote.
3. **Display order does not depend on that write.** `ChartWrapper.tsx:73-81`
   (initial) and `:143-158` (after vote) sort by `momentum_score` desc, tie-break
   `slot_number`, then assign `slot_number = index + 1` **in memory** (`:157`).
   `momentum_score` is persisted by the vote RPC on both paths. So removing the
   client rank write does **not** change the visible order or the vote feedback;
   only the DB persistence of `slot_number`/`previous_rank` is affected.
4. **`previous_rank` is read for the movement indicator** by
   `app/components/Chart/ChartGUI.tsx:99` from the song object (sourced from the
   DB row). Within a session it is not recomputed locally, so after removing the
   write it reflects the last persisted value until reload / an administrator
   updates ranks. (Minor UX nuance; not a vote-button behavior change.)
5. **Admin song write.** `lib/admin-actions.ts` `updateSlot()` performs
   `supabase.from('songs').upsert({ slot_number, title, artist, yt_views,
   sp_plays, momentum_score, cover_url, updated_at }, { onConflict:'slot_number' })`
   (`:211-228`) using the authenticated server client, now gated by
   `authorizeBoraAdministrator()` (`:70-84`). This is a **direct table write by
   the `authenticated` role**, so it breaks if `authenticated` UPDATE is revoked
   unless it is routed through a privileged path (see B.2).
6. **`vote_events` / secure RPC owner.** `0010:88-92` enables RLS on
   `vote_events` and revokes all from `anon`/`authenticated`; `cast_vote_secure`
   is SECURITY DEFINER and writes `vote_events` + updates `songs` as its owner.
   Restricting caller grants on `songs` does **not** affect `cast_vote_secure`
   (definer) or `vote_events`. Guests reach `cast_vote_secure` because Supabase
   anonymous sign-in yields role `authenticated` (`is_anonymous=true`), and
   EXECUTE is granted to `authenticated` (`0010:217-219`).
7. **No app service-role client exists** for `admin-actions` (only the Engine's
   `BORA_ENGINE_SUPABASE_SERVICE_ROLE_KEY` in `persistence.ts`). `lib/supabase/
   server.ts` is the authenticated (user-session) client; `public-server.ts` is
   the anon client. There is no `songs` migration in the repo, so the live
   policies/grants (`Bora_Admin_Policy`, `Songs_Read_Authenticated`) are not
   represented in source.

---

## B. Proposed source changes (smallest set)

### B.1 `app/components/ChartWrapper.tsx` — remove the post-vote direct rank write

Remove the `previousRanks` capture (`:108-116`, consumed only by the removed
block) and the rank-sync block (`:219-265`). Keep the vote RPC branch, optimistic
UI, and success return untouched.

```diff
@@ app/components/ChartWrapper.tsx
-    const previousRanks = new Map<string, number>();
-    songs.forEach((song, index) => {
-      previousRanks.set(song.id, index + 1);
-    });
-
     /* HATUA YA PILI: BADILISHA MOMENTUM INSTANTLY KWENYE UI. */
@@ (vote RPC branch unchanged) @@
-      const rankUpdates = rankedSongs
-        .filter((song) => {
-          const oldRank = previousRanks.get(song.id);
-          return (oldRank !== undefined && oldRank !== song.slot_number);
-        })
-        .map((song) => ({
-          id: song.id,
-          slot_number: song.slot_number,
-          previous_rank: previousRanks.get(song.id) ?? null,
-        }));
-
-      for (const update of rankUpdates) {
-        const { error: rankError } = await supabase
-          .from('songs')
-          .update({ slot_number: update.slot_number, previous_rank: update.previous_rank })
-          .eq('id', update.id);
-        if (rankError) { console.error('BORA_RANK_SYNC_FAILURE:', rankError); }
-      }
-
-      console.log(`BORA_RANK_SYNC: ${rankUpdates.length} chart positions updated.`);
+      // Canonical ranks (slot_number / previous_rank) are no longer persisted
+      // from the browser. Display order is derived client-side from
+      // momentum_score (see reRanked/rankedSongs above). Persisting ranks is an
+      // administrator-only concern (updateSlot) — see migration 0019.
       console.log(`BORA_SIGNAL: ${type.toUpperCase()} registered for ID: ${id}`);
       return true;
```

### B.2 `lib/admin-actions.ts` — route `updateSlot` through a definer RPC

Required because section C revokes `authenticated` writes on `songs`. Replace the
direct `.from('songs').upsert(...)` (`:210-230`) with a call to the new
`admin_upsert_song` RPC (defined in section C). The storage upload (`bora-assets`)
and the server-side `authorizeBoraAdministrator()` gate are unchanged.

```diff
@@ lib/admin-actions.ts  (inside updateSlot, after cover_url is resolved)
-    const { data, error } = await supabase
-      .from('songs')
-      .upsert(
-        { slot_number, title, artist, yt_views, sp_plays, momentum_score, cover_url, updated_at: new Date().toISOString() },
-        { onConflict: 'slot_number' }
-      )
-      .select()
-      .single();
+    const { data, error } = await supabase.rpc('admin_upsert_song', {
+      p_slot_number: slot_number,
+      p_title: title,
+      p_artist: artist,
+      p_yt_views: yt_views,
+      p_sp_plays: sp_plays,
+      p_momentum_score: momentum_score,
+      p_cover_url: cover_url,
+    });
```

> No change to the `NEXT_PUBLIC_BORA_SECURE_VOTING` flag or to voting UX. The
> secure-path **cutover is a deploy action** (enable flag + rebuild), not a code
> change; it is required together with section C (see section D).

---

## C. Proposed additive SQL — `supabase/migrations/0019_harden_songs_permissions.sql`

Additive, idempotent where practical; does not touch `0018` or any source file.

```sql
-- ============================================================
-- BORA — HARDEN public.songs PERMISSIONS (ADDITIVE)
-- ============================================================
-- Removes the unconditional anonymous ALL policy, revokes direct
-- write privileges from anon/authenticated (incl. TRUNCATE),
-- preserves public reads, and moves administrator song writes to a
-- SECURITY DEFINER RPC gated by the trusted app_metadata.role claim
-- (same pattern as 0018). service_role and the table owner are left
-- intact.
--
-- COUPLING (critical): handle_song_vote is SECURITY INVOKER and needs
-- the caller's songs UPDATE grant. After this migration, legacy
-- voting FAILS unless the frontend is already running the secure
-- path (cast_vote_secure). Deploy the flag cutover WITH this change.
-- ============================================================

-- 1. Remove the permissive anonymous ALL policy.
drop policy if exists "Bora_Admin_Policy" on public.songs;

-- 2. Preserve public chart reads for anon AND authenticated.
drop policy if exists "Public can read songs" on public.songs;
create policy "Public can read songs"
  on public.songs
  for select
  to anon, authenticated
  using (true);
-- (Existing "Songs_Read_Authenticated" becomes redundant but is left in place.)

-- 3. Revoke direct write privileges from client roles (keep SELECT).
revoke insert, update, delete, truncate, references, trigger on public.songs from anon;
revoke insert, update, delete, truncate, references, trigger on public.songs from authenticated;
-- service_role and the owner are intentionally NOT revoked.

-- 4. Administrator-only song write path (SECURITY DEFINER).
create or replace function public.admin_upsert_song(
  p_slot_number integer,
  p_title text,
  p_artist text,
  p_yt_views bigint,
  p_sp_plays bigint,
  p_momentum_score integer,
  p_cover_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.songs%rowtype;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'BORA_AUTH_REQUIRED: an authenticated session is required'
      using errcode = '28000';
  end if;

  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'bora_administrator' then
    raise exception 'BORA_ADMIN_REQUIRED: caller is not an authorized BORA administrator'
      using errcode = '42501';
  end if;

  insert into public.songs as t (
    slot_number, title, artist, yt_views, sp_plays, momentum_score, cover_url, updated_at
  )
  values (
    p_slot_number, p_title, p_artist, p_yt_views, p_sp_plays, p_momentum_score, p_cover_url, now()
  )
  on conflict (slot_number) do update
    set title = excluded.title,
        artist = excluded.artist,
        yt_views = excluded.yt_views,
        sp_plays = excluded.sp_plays,
        momentum_score = excluded.momentum_score,
        cover_url = excluded.cover_url,
        updated_at = excluded.updated_at
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

revoke execute on function public.admin_upsert_song(integer, text, text, bigint, bigint, integer, text) from public;
revoke execute on function public.admin_upsert_song(integer, text, text, bigint, bigint, integer, text) from anon;
grant execute on function public.admin_upsert_song(integer, text, text, bigint, bigint, integer, text) to authenticated;
```

### Rollback

- Re-grant: `grant insert, update, delete, truncate, references, trigger on
  public.songs to anon, authenticated;`
- Re-create the old policy if required: `create policy "Bora_Admin_Policy" on
  public.songs for all to anon using (true) with check (true);`
- `drop function public.admin_upsert_song(integer, text, text, bigint, bigint,
  integer, text);` and revert the `updateSlot` source change (B.2).
- Rollback re-opens the anonymous write exposure; treat as incident recovery.

> Note: `admin_upsert_song` performs its **own** `app_metadata.role` administrator
> check and is intentionally **independent of `0018`** — it does **not** call
> `0018`'s `bora_author_is_administrator()` and has no dependency on `0018` being
> applied (see D.1). Parameter types are finalized against the live
> `information_schema.columns` (see C and D.5). The administrator authorization
> contract is defined in D.0.

---

## D. Risks, authorization contract, and missing prerequisites

### D.0 Administrator authorization contract (both gates must agree)

- **Database boundary (authoritative for privileged RPCs):** every privileged
  RPC — the four `save_*` RPCs in `0018` and `admin_upsert_song` in `0019` —
  requires `auth.role() = 'authenticated'` **and** the trusted, non-caller-editable
  JWT claim `app_metadata.role = 'bora_administrator'` (otherwise `SQLSTATE 42501`).
  This claim is the single authoritative administrator identity at the database.
- **Server-side pre-filter:** `lib/administrator-authorization.ts` verifies the
  session with `auth.getUser()` and matches the id against the server-only
  `BORA_ADMIN_USER_IDS` allowlist before any DB call. `BORA_ADMIN_USER_IDS` is a
  fail-fast pre-filter, **not** an independent source of truth.
- **Both gates must agree:** `BORA_ADMIN_USER_IDS` and `app_metadata.role` must be
  provisioned from the **same approved administrator list**. An identity present in
  one but not the other is denied by whichever layer lacks it (fail-closed).

### D.1 `0019` is independent of `0018`

`0019` performs its **own** `app_metadata.role` check inside `admin_upsert_song`;
it does **not** call `0018`'s `bora_author_is_administrator()` and has **no
dependency** on `0018` being applied. The two migrations touch disjoint objects
(`0018`: the four `save_*` RPCs; `0019`: `songs` + `admin_upsert_song`), so there
is no function/grant/policy/migration-history conflict and they may be applied in
either relative order.

### D.2 Applying `0011` safely (advisory lock; verify live body)

`0011` is a `CREATE OR REPLACE` of the existing `cast_vote_secure` that adds a
per-voter `pg_advisory_xact_lock(hashtext(v_voter_ref::text))` before the
rate-limit count — the only change vs `0010`. Because `CREATE OR REPLACE`
**replaces the function body**, verify the current live definition
(`pg_get_functiondef`) before applying, so any live divergence from the `0010`
source is known and not silently overwritten. Grants, tables, and the response
contract are unchanged; the change only closes the concurrent rate-limit race.

### D.3 Coupled cutover (highest risk) — required order

Because `handle_song_vote` is SECURITY INVOKER, restricting `songs` write access
while the frontend still runs the legacy path **breaks voting for everyone**
(permission-denied on the `songs` update inside `handle_song_vote`). Required
order (each step gated on the previous):

1. Apply migration `0011` (closes the `cast_vote_secure` rate-limit race; live
   evidence: `0010` applied, `0011` NOT applied). Verify the lock line is present.
2. Confirm Supabase **anonymous sign-in is enabled** (guests need it).
3. Ship **one** frontend deployment containing **both** the removal of the
   `ChartWrapper.tsx` rank-sync write (B.1) **and**
   `NEXT_PUBLIC_BORA_SECURE_VOTING=true` (build-time inlined). The rank-sync
   removal must **not** ship separately from the secure-voting flag cutover.
4. Verify the deployed secure path is healthy (guest + account votes accepted via
   `cast_vote_secure`; the browser no longer issues `songs` UPDATE or
   `handle_song_vote`).
5. Apply migration `0019` **only after** step 4 is verified healthy. It must
   **not** be applied while legacy `handle_song_vote` remains the active frontend
   path.

### D.4 `app_metadata.role` provisioning

`admin_upsert_song` (and the `0018` RPCs) require `app_metadata.role='bora_administrator'`
on administrator accounts. Until provisioned, administrator song writes fail
closed at the DB layer even though the server-side allowlist gate passes. Confirm
it is done before applying `0019`.

### D.5 `admin_upsert_song` types and column set

Parameter types are finalized against the live `information_schema.columns`:
`p_slot_number integer`, `p_title text`, `p_artist text`, `p_yt_views bigint`,
`p_sp_plays bigint`, `p_momentum_score integer`, `p_cover_url text`. The function
writes exactly the columns `updateSlot` writes today. If `songs` has NOT NULL
columns without defaults that `updateSlot` does not set, the insert could fail —
confirm against the deployed schema (read-only) before applying.

### D.6 Behavior notes

- **`updated_at = now()`:** `admin_upsert_song` sets `updated_at = now()` (server
  time) on insert and on the `ON CONFLICT` update, instead of the client-supplied
  ISO string. Functionally equivalent (arguably more correct).
- **Temporary `previous_rank` limitation:** after B.1, votes no longer persist
  `previous_rank`, so the movement indicator may show a stale value until reload or
  an administrator updates ranks. `slot_number` remains a momentum tie-break and is
  admin-managed. No ranking algorithm is invented; live rank persistence would need
  a separate, approved server-side design.

### D.7 Redundant policy

`Songs_Read_Authenticated` is left in place and becomes redundant with the new
`Public can read songs`; harmless, but noted.

## E. Verification plan (read-only / isolated, no production writes)

Run against an **isolated, non-production** Supabase project with `0010`, `0011`,
and `0019` applied and anonymous sign-in enabled. All checks are behavioral and
do not modify production.

### Staging gates (apply in order; each gated on the previous passing)

- **Gate A — DB prep:** apply `0011`; verify via `pg_proc`/`pg_get_functiondef`
  that the advisory-lock line is present in `cast_vote_secure`.
- **Gate B — Auth config:** confirm Supabase **anonymous sign-in** is enabled
  (verify only; change only through the approved process).
- **Gate C — one frontend build:** ship B.1 (rank-sync write removed) **and**
  `NEXT_PUBLIC_BORA_SECURE_VOTING=true` in the **same** deployment.
- **Gate D — verify secure path live:** guest vote -> `cast_vote_secure` accepted;
  signed-in vote accepted; browser no longer issues `songs` UPDATE or
  `handle_song_vote`. If Gate D fails, revert the frontend to flag=off — **only
  safe before Gate E**.
- **Gate E — point of no return:** apply `0019`. Only after Gate D is healthy;
  never while legacy `handle_song_vote` is the active frontend path.
- **Gate F — verify restriction:** anon/authenticated direct `UPDATE`/`DELETE`/
  `TRUNCATE` denied; public reads work; administrator `updateSlot` works via
  `admin_upsert_song`.

### Behavioral verification matrix

| # | Scenario | Expected result |
|---|---|---|
| 1 | Public chart reads (anon `select` on `songs`) | **Allowed** (`Public can read songs`). |
| 2 | Guest voting: anonymous sign-in -> `cast_vote_secure` | Accepted; `vote_events` row inserted; `songs` counters move. |
| 3 | Signed-in (account) voting: `cast_vote_secure` | Accepted; identity_method `account`. |
| 4 | Duplicate idempotency key (same voter+key) | `status='duplicate'`, no double count. |
| 5 | Same key, different song/type | `23505` conflict, rejected. |
| 6 | Rate limit: >60 votes/hour for one uid (post-`0011`) | `P0001` rate-limited, serialized (no race). |
| 7 | Invalid vote (bad song id / bad vote_type / bad key) | `22023`/`P0002` validation error, rejected. |
| 8 | Anonymous direct `UPDATE`/`DELETE`/`TRUNCATE` on `songs` | **Denied** (grants revoked; RLS). |
| 9 | Ordinary authenticated direct `UPDATE`/`DELETE` on `songs` | **Denied** (grants revoked). |
| 10 | Ordinary authenticated direct `rpc('admin_upsert_song', …)` | **Denied** (`42501`, not admin claim). |
| 11 | Administrator `updateSlot` (server allowlist + admin claim) | Succeeds via `admin_upsert_song`. |
| 12 | `vote_events` direct read/write by anon/authenticated | **Denied** (unchanged from `0010`). |
| 13 | `handle_song_vote` invoked directly post-`0019` | **Denied** (confirms legacy path is closed; expected). |

Pre-checks (read-only catalog): confirm `0019` objects exist
(`pg_policy`, `pg_proc`, `information_schema.role_table_grants`) and that issued
JWTs contain `app_metadata`. Do not decode production user tokens.

## F. Files that would change

- **Edit:** `app/components/ChartWrapper.tsx` (remove post-vote rank write; B.1).
- **Edit:** `lib/admin-actions.ts` (`updateSlot` -> `admin_upsert_song` RPC; B.2).
- **New:** `supabase/migrations/0019_harden_songs_permissions.sql` (section C).
- **New (this review artifact):** `docs/voting-songs-permissions-remediation-proposal.md`.
- **Not changed:** `0018`, voting UX, feature flag, Engine scoring, `vote_events`,
  `cast_vote_secure`, `handle_song_vote` definition, `getRegistry` public read.

## G. Confirmation

This proposal made **no** live database changes, applied **no** migration,
edited **no** existing source file, changed **no** environment variable, ran
**no** `npm run build`, and performed **no** deploy/restart. The only file
created is this review document. Evidence is drawn from repository source plus
the live-database facts supplied in the task brief.
