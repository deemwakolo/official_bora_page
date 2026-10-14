# Secure Voting Implementation Contract

**Status:** Reference document — not a runtime enforcement mechanism.
**Scope:** Any future change touching `cast_vote_secure`, `lib/supabase/secure-vote.ts`, or the feature switch in `app/components/ChartWrapper.tsx`.

This document captures the *current* contract so future changes do not silently break it. It does not replace the rollout procedure, the data-transition analysis, or the state model — those live in:

---

## 4. Error codes and their TypeScript mappings

`[SOURCE]` — `classifyErrorCode` in `lib/supabase/secure-vote.ts`:

| SQL error code | Meaning | Helper reason | Helper `ok` |
|---|---|---|---|
| *(none, `status:'accepted'`)* | new vote | `accepted` | `true` |
| *(none, `status:'duplicate'`)* | idempotent retry | `already_processed` | `true` |
| `P0001` | rate limit exceeded | `rate_limited` | `false` |
| `P0002` | song not found | `song_not_found` | `false` |
| `23505` | idempotency-key conflict | `idempotency_conflict` | `false` |
| `28000` | no authenticated JWT | `auth_required` | `false` |
| `22023` | invalid vote type / key / song arg | `invalid_input` | `false` |
| anything else | unmapped | `rejected` | `false` |

`accepted` and `duplicate` both surface as `ok: true` so the UI treats an idempotent retry as success. Every other outcome is `ok: false`.

---

## 5. Counter and event-write behavior

`[SOURCE]` migration 0010.

- On `accepted`, one row is inserted into `public.vote_events` **and** `public.songs` is updated **in the same transaction**:
  - `up` → `upvotes + 1`, `momentum_score + 1`
  - `down` → `downvotes + 1`, `momentum_score - 1`
- Counters are computed server-side. The client never sends counter, momentum, or rank values.
- `vote_events` stores: `id`, `song_id`, `vote_type`, `voter_ref` (= `auth.uid()`), `identity_method`, `identity_version` (currently `1`), `idempotency_key`, `created_at` (server clock). No PII beyond the opaque `voter_ref`.
- The table has RLS enabled with no policies and no `anon`/`authenticated` grants — the function (`SECURITY DEFINER`, fixed `search_path = public, pg_temp`) is the only write path.

---

## 6. Rate-limit behavior and the migration 0011 dependency

`[SOURCE]` migrations 0010 + 0011.

- Limit: **60 accepted votes per `voter_ref` per rolling hour**, counted from `vote_events`.
- Exceeding it raises `P0001` (`BORA_RATE_LIMITED`); the rejected request writes no event and moves no counter.
- **The rolling window is only safe under concurrency when migration 0011 is applied.** 0011 inserts, at the top of the transaction (after identity resolution, before the count query):
  ```
  perform pg_advisory_xact_lock(hashtext(v_voter_ref::text));
  ```
  This serializes concurrent requests per voter so two different-key requests cannot both pass a `count < 60` check.
- `[RECHECK]` Production is reported to have 0010 applied but **not** 0011. Until 0011 is applied to a given target, the 60/hour cap can be briefly overshot under concurrency. Re-verify `schema_migrations`/`pg_proc` per target before relying on the cap.


- `docs/security/secure-voting-cutover.md` — activation and rollback steps
- `docs/security/voting-data-transition.md` — legacy vs. secure data writes and reconciliation
- `docs/security/secure-voting-state-model.md` — rollout/rollback states and transitions

**Source basis:** every claim below is tagged `[SOURCE]` (established by reading the migration, helper, or component) or `[RECHECK]` (a reported fact about the deployed project that must be re-verified against the live database/Auth before it is relied on). Nothing here is inferred.

---

## 1. RPC signature and input/output contract

**Signature** `[SOURCE]`:
```
public.cast_vote_secure(
  p_song_id         uuid,
  p_vote_type       text,
  p_idempotency_key text
) returns jsonb
```

**Inputs** `[SOURCE]`:

| Parameter | Rule enforced in SQL | Failure |
|---|---|---|
| `p_song_id` | must be non-null and exist in `public.songs` | `P0002` song not found |
| `p_vote_type` | must be exactly `'up'` or `'down'` | `22023` invalid vote type |
| `p_idempotency_key` | must be non-empty and parse as a UUID | `22023` invalid idempotency key |

**Output** `[SOURCE]` — a `jsonb` object:
```
{ "status": "accepted" | "duplicate",
  "event_id": uuid,
  "song_id": uuid,
  "vote_type": "up" | "down",
  "identity_method": "guest" | "account" }
```
`accepted` = a new durable vote event was written and the counter moved. `duplicate` = the same voter re-sent the same key with the same payload; the counter did **not** move again.

---

## 2. Authentication and guest-session requirements

`[SOURCE]`

- The function derives identity from `auth.uid()`. If there is no verified JWT subject it raises `28000` (`BORA_AUTH_REQUIRED`).
- `identity_method` is `guest` when the JWT carries `is_anonymous = true`, otherwise `account`. No email/phone/social login is required to vote.
- The client must hold an `authenticated`-role session. The helper `ensureGuestSession()` (in `lib/supabase/secure-vote.ts`) calls `auth.getSession()` and, if absent, `supabase.auth.signInAnonymously()`.
- `cast_vote_secure` is granted `EXECUTE` to `authenticated` only; `PUBLIC` and `anon` are revoked. `[SOURCE]` migration 0010.

**Runtime dependency** `[RECHECK]`: anonymous sign-in must be enabled in the target project's Auth settings, and the target must actually issue anon→`authenticated` JWTs. This is an Auth configuration fact, not a code fact.

---

## 3. Idempotency-key generation and retry rules

`[SOURCE]`

- Key is generated once per user vote action in the component via `newIdempotencyKey()` (a `crypto.randomUUID()` with a fallback). It is **not** regenerated automatically inside `castSecureVote`.
- A retry of the same action reuses the same key. The database enforces `UNIQUE (voter_ref, idempotency_key)` on `public.vote_events`.
- Expected behavior:
  - **First submission** → `accepted`, counter +1.
  - **Exact retry** (same voter, same key, same song, same type) → `duplicate`, no counter change.
  - **Same key, different song or type** → rejected with `23505` (`BORA_IDEMPOTENCY_CONFLICT`); never a second accepted vote.
  - **Two different voters using the same key** → both can be `accepted`: the unique constraint is namespaced by `voter_ref`.
  - **Missing/malformed key** → `22023` before any write.
- Idempotency prevents **double-counting one voter's retry**. It does **not** prevent a guest from creating multiple identities.
