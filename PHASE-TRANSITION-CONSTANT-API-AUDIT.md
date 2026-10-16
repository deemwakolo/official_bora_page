# PHASE — Transition Constant API Audit (`TRANSITION_MS` / Contract 5 / R-41)

**Status:** audit complete; implementation pending approval.
**Scope:** BORA repository only. The standalone repository (`F:\coding\bora-engine`) was inspected read-only; no file there was modified.

---

## 1. What R-41 requires, and what remains deferred (verified)

Source: `F:\coding\bora-engine\BORA-ENGINE-SPEC-V1.md` §21 "DEFERRED ITEM: R-41" (lines 770–782):

- **R-41 / Contract 5 transition timing is DEFERRED.** `TRANSITION_MINUTES` and `TRANSITION_MS` exist in `src/engine/constants.ts` but have **no behavioural consumers**; the constant governs **event routing**, which belongs to the future simulation / integration layer.
- This is **not** a mathematical inconsistency in Engine V1. It **must** be resolved before production integration "if that integration requires the transition timing contract." It is deliberately not solved in the freeze phase and deliberately not deleted.

**Requires (when resolved):** the transition-timing contract — the fixed operational transition window that follows each hour boundary, used for event routing (deciding whether a late event arrived before or after a commitment boundary).
**Remains deferred:** engine-internal behavioural adoption and the full routing semantics. The parity audit (`PHASE-BORA-ENGINE-PARITY-AUDIT.md`, lines 97/119/129) is explicit that adding the constant to the **frozen engine package surface** is *not* a way to resolve R-41: "simply adding an engine export would expand the frozen package surface… Do not silently broaden engine semantics."

## 2. Where the authoritative constant is defined (verified)

BORA's in-repository engine implementation, `engine/src/engine/constants.ts`:

| Symbol | Location | Exact value | Unit |
|---|---|---|---|
| `TRANSITION_MINUTES` | line 73 | `10` | minutes |
| `TRANSITION_MS` | line 75 | `TRANSITION_MINUTES * MINUTE_MS` = 10 × 60,000 = **600,000** | milliseconds |

Its doc comment (lines 50–71) fixes the semantics: **Contract 5 — "Controls EVENT ROUTING ONLY — no scoring coefficient, never alters a C value."**

**Verified finding — stale comment:** the same comment block still states "Neither constant has any consumer anywhere in the repository: no production module, no simulation module, and no test reads them." That was true of the standalone freeze; in the BORA repository it is now **stale** — three `lib/` modules consume `TRANSITION_MS` (§3), while the "no test reads them" half remains true.

## 3. Current imports — internal reach-through, no public entry point (verified)

- BORA's engine copy has **no** `engine/src/engine/index.ts` (verified absent). The curated barrel exists only in the standalone repo (`F:\coding\bora-engine\src\engine\index.ts`), and it deliberately exports neither `TRANSITION_MS`, `TRANSITION_MINUTES` nor `MINUTE_MS` (verified lines 1–23; it does export `HOUR_MS`) — "in keeping with the package report's stated exclusion of deferred transition-timing constants" (parity audit line 97).
- **Answer to Q3: BORA reaches into an internal module.** Direct internal-path imports of engine files are the repo-wide convention (e.g. `hourly-runner.ts` imports `../../engine/src/engine/rollover/rollover`), not an exception specific to the transition constant.
- The complete consumer set (full-repo scan; nothing else references either symbol):

| File | Import | Usage |
|---|---|---|
| `lib/bora-engine/hour-entry.ts` | line 5, from `'../../engine/src/engine/constants'` | line 105: `eligibleAtMs = (input.closedHour + 1) * HOUR_MS + TRANSITION_MS` |
| `lib/bora-engine/hourly-runner.ts` | line 8, same module | line 413: same formula — commented "early UX guard only. The atomic database claim independently checks eligibility and lease timing against database time." |
| `lib/bora-engine/source-readiness.ts` | line 5, same module | line 493: `(input.evaluationHour + 1) * HOUR_MS + TRANSITION_MS` |

- Semantics of all three: earliest eligible instant = **hour boundary + 10 minutes**, in epoch milliseconds over clock-hour indices; each guards `Number.isSafeInteger(eligibleAtMs)`; `hour-entry.ts` and `hourly-runner.ts` are `server-only`. None is on a scoring path.
- **Cross-system duplication (verified):** `0014_bora_engine_hourly_atomic_operations.sql`, `bora_engine_claim_hour` (≈ lines 265–270), independently encodes the same boundary+10-minute rule as a hardcoded literal in seconds: `to_timestamp(((p_closed_hour::numeric + 1) * 3600 + 600)::double precision)`. Its consistency with `TRANSITION_MINUTES` is by convention, not by reference.
- Parity-audit positions relied on: lines 14, 97, 119, 129 ("Resolve `TRANSITION_MS` explicitly… decide whether the transition boundary remains a BORA application policy constant or is added through a documented, non-scoring integration contract") and line 140 (exit criterion: "the deferred transition-boundary policy has an explicit owner and test coverage").


## 4. Smallest safe change (recommendation — not implemented)

The parity audit demands an explicit ownership decision. **Recommendation: the transition boundary is a BORA application-policy constant, consumed from the in-repository engine implementation** (BORA's `engine/` copy is its own implementation; the standalone engine remains the mathematical reference only).

1. **Keep** the definition at `engine/src/engine/constants.ts` as the single source of truth and **keep the current direct import path**. Creating a package-style entry point in the BORA copy solely for this constant would diverge the copy's layout from the frozen engine and imply a package surface that R-41 explicitly deferred.
2. **Update** the stale constants.ts comment: retain the historical standalone-freeze statement, add a BORA-repo note naming the three consumers and recording the policy ownership (satisfies exit criterion line 140).
3. **Add** the acceptance tests in §5.
4. **Do not**: touch the standalone repo, its barrel, or frozen specs; move the constant into scoring paths; or silently change the `600`-second literal in `0014` (flagged for a separate decision — SQL and TypeScript cannot share a constant without a migration-side contract).

## 5. Acceptance tests (proposed — none exist today, verified)

- **T1 — value & unit** (new `engine/src/engine/constants.test.ts`, runs under the existing `engine:test` vitest config): `TRANSITION_MINUTES === 10`; `TRANSITION_MS === 600_000`; `TRANSITION_MS === TRANSITION_MINUTES * MINUTE_MS`; `TRANSITION_MS % 60_000 === 0` (integral minutes).
- **T2 — consumer path & formula** (structural, following the `persistence-contract.test.ts` precedent of reading sources from a test): the three lib files import `TRANSITION_MS` from the engine constants module; each computes `(x + 1) * HOUR_MS + TRANSITION_MS`; none inlines `600_000`; the `isSafeInteger` guards remain.
- **T3 — DB/app correspondence:** assert `TRANSITION_MINUTES * 60 === 600` and that `0014`'s `claim_hour` still contains `* 3600 + 600`, pinning the cross-system convention.
- **T4 — behavioural (deferred, not runnable today):** `nowMs < eligibleAtMs` → `not-eligible`/`not-ready`, at/after → proceeds. No existing harness includes `lib/` (the engine vitest config includes only `engine/src`). Do **not** claim this coverage until such a harness exists.

## 6. Verified vs recommendation

- **Verified:** every fact in §1–§3 and the "no tests exist" claim in §5 — spec text, barrel contents, absence of `index.ts` in the BORA copy, definitions/values/units, consumer files/lines/formulas, the stale comment, and the `0014` `600` literal.

## 7. Implementation record (approved follow-up)

The §4 recommendation was approved and implemented in the BORA repository only. Files changed:

| File | Change |
|---|---|
| `engine/src/engine/constants.ts` | Stale "no consumer" comment replaced: a **FREEZE-ERA RECORD** paragraph keeps the historical baseline (R-41 still DEFERRED), and a **BORA REPOSITORY NOTE** names the three `lib/bora-engine/` consumers (`hour-entry.ts`, `hourly-runner.ts`, `source-readiness.ts`), their shared boundary expression, and the event-routing-only scope. Comment-only; no value, export, or behaviour changed. |
| `engine/src/engine/constants.test.ts` (new) | **T1:** pins `TRANSITION_MINUTES === 10`, `TRANSITION_MS === 600_000`, `MINUTE_MS === 60_000`, the exact derivation `TRANSITION_MS === TRANSITION_MINUTES * MINUTE_MS`, and the whole-minute property. |
| `engine/src/engine/transition-integration.test.ts` (new) | **T2:** for each of the three consumers — imports `TRANSITION_MS` from `'../../engine/src/engine/constants'`, contains `+ 1) * HOUR_MS + TRANSITION_MS` and `Number.isSafeInteger(eligibleAtMs)`, and does not inline a `600_000` literal. **T3:** `TRANSITION_MINUTES * 60 === 600`, and `0014`'s `bora_engine_claim_hour` body still contains `* 3600 + 600` (migration not modified). Structural tests only — they do not execute the consumers or PostgreSQL. |

No runtime behaviour, scoring, routing semantics, exports, migrations, or configuration changed; no public barrel was created; the standalone repository and frozen specification were not touched; nothing was committed.

**Verification commands for manual execution (PowerShell, from the repository root):**

```powershell
# Focused tests (T1 + T2 + T3 + the existing DB-C contract file can be added by name):
$env:NODE_PATH='F:/coding/bora-engine/node_modules'; Set-Location 'F:\coding\bora codes\v1\official_bora_page\engine'; node F:\coding\bora-engine\node_modules\vitest\vitest.mjs run constants transition-integration --config vitest.engine.config.ts

# Full engine test suite:
$env:NODE_PATH='F:/coding/bora-engine/node_modules'; Set-Location 'F:\coding\bora codes\v1\official_bora_page\engine'; node F:\coding\bora-engine\node_modules\vitest\vitest.mjs run --config vitest.engine.config.ts

# Engine typecheck:
Set-Location 'F:\coding\bora codes\v1\official_bora_page'; node node_modules\typescript\bin\tsc -p engine\tsconfig.engine-test.json --noEmit

# Whitespace check:
Set-Location 'F:\coding\bora codes\v1\official_bora_page'; git diff --check
```

Per the agreed handoff, no tests, typechecks, or builds were executed during implementation; results are pending manual execution.

- **Recommendation only:** the ownership decision (§4), the fix steps, and the test designs. This audit modified **no** code, configuration, migration, or spec; nothing was committed; no tests were executed and no database was contacted. After implementation approval, run `npm run engine:test` and `npm run engine:typecheck` for verification.
