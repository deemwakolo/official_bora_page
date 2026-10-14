# Secure Voting Rollout & Rollback State Model

This document defines the **states** the secure-voting feature (`cast_vote_secure`)
can be in, the **transitions** between them, and the **guardrails** that must hold at
every step. It is a *source-grounded operational model*, not a change to application
behavior. It complements two existing documents:

- `docs/security/secure-voting-cutover.md` — the authoritative activation runbook.
- `docs/security/voting-data-transition.md` — the legacy-vs-secure data model.

**Read this before touching the feature flag or applying migrations.**

### Source basis legend

Every statement below is tagged so facts are never confused with proposals:

- **[SOURCE]** — established by inspecting repository source (migrations, helper,
  `ChartWrapper.tsx`) or the confirmed environment record in the cutover runbook.
- **[VERIFY]** — must be re-checked on the specific target before acting; state
  differs per environment and is *not* assumed from any other environment.
- **[RULE]** — a proposed operational rule from this document (not code; not yet an
  enforced control).
- **[UNKNOWN]** — cannot be established from source or the current record.

> ⚠️ **Current production record (`ktngrhqhxiklfewmwmev`) [SOURCE]:** migration
> `0010` is applied; migration `0011` is **NOT** applied. Therefore production is
> in **State 1 (Legacy active)** with a **partial** database footprint, and the
> production RPC still carries the rate-limit race. Production is explicitly
> **NOT** "database prepared." Do not infer otherwise.

---

## 1. The states at a glance

| # | State | Voting path active | DB footprint | Frontend flag |
|---|---|---|---|---|
| 1 | **Legacy active** | `handle_song_vote` | legacy only | not `"true"` |
| 2 | **Secure prepared** | `handle_song_vote` | legacy only | not `"true"` |
| 3 | **Database prepared** | `handle_song_vote` | 0010 **and** 0011 applied | not `"true"` |
| 4 | **Secure enabled** | `cast_vote_secure` | 0010 + 0011 + anon auth | exactly `"true"` |
| 5 | **Secure paused** | `handle_song_vote` | 0010 (+ 0011) remain; `vote_events` retains secure history | not `"true"` |
| 6 | **Reconciliation required** | (whichever is active) | both systems have written votes | n/a |

A target is always in exactly one of states 1–5 from the *rollout* perspective.
**State 6 is an overlay**: it becomes true once both paths have written votes,
regardless of which of 1–5 the routing is currently in.

---

## 2. State definitions

### State 1 — Legacy active

- **Entry conditions [SOURCE]:** the default. `NEXT_PUBLIC_BORA_SECURE_VOTING` is
  not exactly the string `"true"` (unset, empty, `"1"`, `"yes"`, `"TRUE"`, etc.).
  Confirmed by `ChartWrapper.tsx:27` (`=== 'true'`) with the legacy branch at the
  `else` (line ~198).
- **Active voting path [SOURCE]:** `supabase.rpc('handle_song_vote', { song_id, vote_type })`.
- **Data written [SOURCE]:** `handle_song_vote` updates only `songs` aggregates
  (`upvotes`/`downvotes`/`momentum_score`); no event rows, no identity, no idempotency.
- **Allowed next transitions:**
  - → **State 2** (prepare helper/switch) — already done in this repo [SOURCE].
  - → **State 3** (apply migrations) — with target confirmation [VERIFY].
- **Data-integrity risks [SOURCE]:** aggregate-only history; retries can double-count;
  invalid `vote_type` silently no-ops. (These are the known legacy limitations.)

### State 2 — Secure prepared

- **Entry conditions [SOURCE]:** the helper `lib/supabase/secure-vote.ts` and the
  feature-switch branch in `ChartWrapper.tsx` exist, but the flag is off, so the
  legacy path is still active. **This is the current repository state.**
- **Active voting path [SOURCE]:** still `handle_song_vote` (flag off).
- **Data written [SOURCE]:** legacy aggregates only. No secure events yet.
- **Allowed next transitions:**
  - → **State 3** by applying 0010 then 0011 to the intended target.
  - → stays here (preparation has no runtime effect while the flag is off).
- **Data-integrity risks:** none introduced — preparation is inert while the flag is
  off [SOURCE]. Risk is only *operational*: the wiring must be reviewed so the secure
  branch never falls back to legacy (it does not — see `secure-vote.ts` and the
  `throw` on `!result.ok` in `ChartWrapper.tsx`) [SOURCE].

### State 3 — Database prepared

- **Entry conditions [VERIFY]:** **both** migration `0010_hardened_guest_voting.sql`
  **and** migration `0011_serialize_vote_rate_limit.sql` are confirmed applied to the
  intended target (query `supabase_migrations.schema_migrations` and `pg_proc` on that
  target). The flag is **still off**.
- **Active voting path [SOURCE]:** still `handle_song_vote` — applying migrations does
  not change routing; the frontend must be rebuilt with the flag for that.
- **Data written [SOURCE]:** legacy aggregates only. `vote_events` exists but is empty
  until the flag is enabled and secure votes arrive.
- **Allowed next transitions:**
  - → **State 4** by enabling anonymous Auth **and** rebuilding/deploying with the flag
    exactly `"true"` (both required) [RULE].
  - → back to a *less-prepared* DB state only by a separate, approved rollback of
    migrations (not covered here — there is no automated DB rollback) [RULE].
- **Data-integrity risks:** none to live voting (routing unchanged). Risk is *latent*:
  the RPC is now reachable and, on this target, correctly hardened (0011 closes the
  race). Confirm 0011 really is present here — **do not assume it from any other
  environment** [VERIFY].
- **⚠️ Production note [SOURCE]:** production (`ktngrhqhxiklfewmwmev`) is **NOT** in
  State 3 — 0010 is applied but 0011 is not. Applying only 0010 leaves the
  rate-limit race in place; State 3 requires **both**.

### State 4 — Secure enabled

- **Entry conditions [VERIFY]:** (a) State 3 confirmed on the target (0010 **and**
  0011 applied); (b) Supabase **anonymous sign-in enabled** in that project's Auth;
  (c) the frontend rebuilt and deployed with `NEXT_PUBLIC_BORA_SECURE_VOTING` set to
  exactly `"true"` (Next.js inlines `NEXT_PUBLIC_*` at build time, so a rebuild +
  redeploy is mandatory — an env-only change has no effect).
- **Active voting path [SOURCE]:** the secure branch in `ChartWrapper.tsx` —
  `ensureGuestSession()` → `castSecureVote(...)` with a fresh idempotency key per click.
- **Data written [SOURCE]:** `cast_vote_secure` inserts a `vote_events` row (validated
  song/type/key, `voter_ref = auth.uid()`, guest/account method, server `created_at`)
  **and** updates the same `songs` counters **atomically**; enforces
  `UNIQUE(voter_ref, idempotency_key)` and the 60/hr per-identity cap.
- **Allowed next transitions:**
  - → **State 5** by deploying a new build with the flag **not** exactly `"true"`.
  - → **State 6** (overlay becomes true) as soon as any secure vote is recorded while
    legacy votes already exist.
- **Data-integrity risks:** diverges from any pre-existing legacy aggregate history
  (secure is attributable + idempotent; legacy is aggregate-only). This is the point at
  which **State 6** is typically entered [SOURCE + RULE]. Requires the pre-flight checks
  in §7 to be cleared first.

### State 5 — Secure paused (frontend rollback)

- **Entry conditions [SOURCE]:** a **new frontend build** is deployed with the flag set
  to anything other than exactly `"true"`, routing votes back to
  `handle_song_vote`.
- **Active voting path [SOURCE]:** `handle_song_vote` again.
- **Data written [SOURCE]:** legacy aggregates again. Existing `vote_events` rows are
  **retained, not deleted** — pausing does not remove secure history.
- **Allowed next transitions:**
  - → **State 4** by rebuilding with the flag exactly `"true"` again (re-enable).
  - → **State 6** persists as an overlay if both paths have written votes.
- **Data-integrity risks [SOURCE]:** a frontend rollback is **routing only** — it does
  **not** reverse migrations, does not delete `vote_events`, and does not reconcile the
  two histories. If both paths have written votes, **State 6** applies and the
  aggregate counters and the event log now diverge.

### State 6 — Reconciliation required (overlay)

- **Entry conditions [RULE]:** both the legacy and secure paths have each written at
  least one vote to the same `songs` counters. This overlay is **true** regardless of
  whether routing is currently in State 4 or State 5.
- **Active voting path:** whichever of State 4/5 is current (this overlay does not
  choose routing).
- **Data written:** both systems have contributed. `songs` aggregates are shared and
  monotonically updated by both; `vote_events` holds only the secure-path subset.
- **Allowed next transitions:** none that "exit" reconciliation automatically. It is
  resolved only by an **approved reconciliation/backfill decision** (see
  `docs/security/voting-data-transition.md` §8–§9) — which this document does **not**
  authorize or design here [RULE].
- **Data-integrity risks [SOURCE]:** historical aggregate counters **cannot** be
  decomposed into individual voter events (no identity, no per-event timestamp, no
  idempotency keys exist in aggregate-only history). No lossless merge is possible
  without fabricating data. Any migration of the two histories must be additive and
  explicitly approved.
---

## 3. Allowed transitions

Only the transitions in this table are permitted. Any other move is out of model
and must not be performed without an approved change to this document. **[RULE]**

| From | To | Preconditions (all must hold) | Data written by the move |
|---|---|---|---|
| 1 Legacy active | 2 Secure prepared | Helper `secure-vote.ts` and the `SECURE_VOTING` branch are merged into `ChartWrapper.tsx`; flag still not `"true"` **[SOURCE: already true in repo]** | none (code only; no runtime writes) |
| 2 Secure prepared | 3 Database prepared | Migration `0010` applied; migration `0011` applied — **both confirmed on the target** **[VERIFY]** | schema + grants only; no vote rows |
| 3 Database prepared | 4 Secure enabled | `0010`+`0011` confirmed; **Auth anonymous sign-in enabled on target** **[VERIFY]**; frontend rebuilt+deployed with `NEXT_PUBLIC_BORA_SECURE_VOTING` exactly `"true"` **[VERIFY]** | `vote_events` rows begin accumulating; `songs` counters move via `cast_vote_secure` |
| 4 Secure enabled | 5 Secure paused | A **new frontend build** deployed with the flag set to anything other than exactly `"true"` **[RULE]** | none from the move; legacy aggregates resume; `vote_events` retained |
| 5 Secure paused | 4 Secure enabled | Both migrations still confirmed; anon auth still enabled; new build with flag exactly `"true"` **[VERIFY]** | `vote_events` resumes |
| any 1–5 | 6 Reconciliation required (overlay) | Automatically true once **both** `handle_song_vote` **and** `cast_vote_secure` have written at least one vote for the same `songs` row **[RULE]** | no move; a condition becomes true |

Illegal / forbidden transitions **[RULE]**:

- **2 → 4** (skip database prep): never enable the flag before `0010` **and**
  `0011` are confirmed applied and anon auth is on. On the current production
  record this would enable a path whose RPC still carries the rate-limit race.
- **Any → "database prepared" by assumption:** never treat a target as state 3
  because another environment (e.g. this local repo's applied `0010`) is prepared.
  `0010` and `0011` are confirmed **per target**, never inherited.

---

## 4. Guardrails (must hold in every state)

1. **Never enable the flag before confirming both migrations and target Auth
   settings.** Confirm `0010` **and** `0011` are recorded as applied and anonymous
   sign-in is enabled on the *specific* target. **[RULE]**
2. **Never treat a frontend rollback as a database rollback.** Setting the flag
   away from `"true"` and redeploying (state 4 → 5) changes only which RPC new
   votes call. It does not remove `vote_events`, `cast_vote_secure`, or any grant,
   and it does not reverse migrations. **[RULE]** (See
   `docs/security/voting-data-transition.md` §5.)
3. **Never infer individual historical votes from aggregate counters.** Legacy
   `songs.upvotes/downvotes` lack voter identity, per-event timestamps, and
   idempotency keys; they cannot be decomposed into `vote_events` without
   fabricating data. **[SOURCE + RULE]**
4. **Never automatically merge event records and aggregate counts.** There is no
   reconciliation/backfill/dedup path in the repository. Any future merge must be
   additive, explicitly designed, and approved — never a silent script. **[RULE]**
5. **Do not fall back to the legacy RPC on a secure-path failure.** The helper
   throws on `!result.ok`; adding a legacy fallback here would risk double-counting
   the same user action. **[SOURCE: `secure-vote.ts` + `ChartWrapper.tsx`]**

Facts established by **[SOURCE]** above come from the migrations, the helper, and
`ChartWrapper.tsx`; the switch is `process.env.NEXT_PUBLIC_BORA_SECURE_VOTING ===
'true'` (`ChartWrapper.tsx:27`), legacy `handle_song_vote` at `ChartWrapper.tsx:198`,
secure branch at `ChartWrapper.tsx:170`. Everything marked **[RULE]** is a proposed
operational control, not enforced code.

---

## 5. Contradictions / gaps found in the existing docs

Reviewed for consistency while building this model:

- **No factual contradiction** between `secure-voting-cutover.md` and
  `voting-data-transition.md`; the two are consistent (activation runbook vs. data
  model). **[SOURCE]**
- **Clarifying gap the cutover runbook left implicit:** it tells the operator to
  apply `0011`, but does not name the resulting *state*. This document adds the
  explicit **State 3 (Database prepared)** and the rule that state 3 is only
  reached when **both** `0010` and `0011` are confirmed — closing an ambiguity where
  "0010 applied" (the current production record) could be misread as prepared.
  **[RULE]**
- **Shared caveat restated:** both existing docs and this one agree end-to-end
  integration is **untested** and `0011` is **not deployed**; nothing here changes
  that. **[SOURCE]**

---

## 6. Source basis

- **[SOURCE]** items derive from: `supabase/migrations/0010_hardened_guest_voting.sql`,
  `supabase/migrations/0011_serialize_vote_rate_limit.sql`,
  `lib/supabase/secure-vote.ts`, `app/components/ChartWrapper.tsx`, and the
  confirmed production record recorded in `docs/security/secure-voting-cutover.md`
  (`0010` applied / `0011` not applied).
- **[VERIFY]** items must be re-checked on the target project at action time and
  are **not** inherited from any other environment.
- **[RULE]** items are proposed operational guardrails from this document; they are
  documentation, not enforced controls.
- **[UNKNOWN]** items could not be established from source and are not asserted.

> This document is documentation only. It does not enable secure voting, change the
> feature flag, apply migrations, access the database, or alter any runtime behavior.
