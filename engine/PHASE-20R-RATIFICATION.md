# PHASE 20R — CONTRACT RATIFICATION & LEGACY CLEANUP

**Predecessor:** Phase 20 — result `CONFORMANT WITH REPAIRS REQUIRED`
**Nature:** contract/legacy repair. **No BORA mathematics changed.**

---

## 1. THE LOCKED CONTRACT (unchanged)

| Authority | Subject |
|---|---|
| `votes/threshold.ts` | K, up/down thresholds, effective hourly C |
| `window/hours.ts` | 72-hour active window |
| `kura/distribution.ts` | T_C, XP, fresh Kura |
| `kura/persistent.ts` | persistent Kura, decay |
| `platform/points.ts` | platform weights + normalization |
| `score/boraScore.ts` | BORA Score |
| `ranking/ranking.ts` | ranking |
| `lifecycle/lifecycle.ts` | lifecycle / vault behaviour |
| `evaluation/chart.ts` | seed precedence, exact-hour mapping, actual C=0 override |
| `rollover/rollover.ts` | temporal commitment boundary |

Exactly one mathematical authority per subject. No duplication introduced.

---

## 2. THE SEEDED CONTRACT, AS RATIFIED (R3)

```
Chart / external assessment        ← OUTSIDE the engine
        ↓                           (human, operator, or future AI)
explicit hourly seed C values      ← 72 values, or an intentional subset
        ↓
operator / harness injection
        ↓
BORA Engine validation             ← engine responsibility BEGINS here
        ↓
exact-hour seed resolution         ← chart.ts resolveHourlyC
        ↓
C distribution
```

The engine does **not** assess popularity, invent values, derive a runway from
T_C, convert a scalar into 72 values, distribute strength across hours, or infer
missing seed hours.

Per-hour resolution order:

1. an `ACTUAL` record for this hour → use it, **including C = 0**
2. else a `SEED` record for this hour → use that value
3. else → `0`

Partial coverage is valid. A missing hour has no seed. Provenance stays
observable as `SEED`.

### SEEDED HOURLY C DOMAIN — Phase 22, D-001 ruling

> An explicit seeded hourly C is valid **iff** it is finite and lies in the closed
> interval `[0, C_MAX]`, where `C_MAX = 2`. Seed C is supplied externally as an
> exact-hour value. The engine does not derive seed values or seed profiles.
> Actual hourly C, including `C = 0`, takes precedence over seed C for the same
> hour.

`validateSeededHourlyC` in `src/engine/seed/seed.ts` is the **single authority**
for this rule. Chart evaluation (`chart.ts`) and rollover (`rollover.ts`) both
call it, so no seed value can be accepted by one path and rejected by the other.

The domain is **continuous** on `[0, 2]`. Actual, vote-derived C lies on the
five-point threshold lattice `{0, 0.5, 1, 1.5, 2}`; a seeded C may be any finite
real in `[0, 2]`, for example `1.25`.

Seed values are bounded by the structural maximum hourly C of the BORA activity
model. This preserves `0 <= D_h <= 0.0025`, because `D_h = 0.0025 · (1 − C_h/2)`
turns negative whenever `C_h > 2` — which would make "decay" into growth.

No AI dependency, no network, no randomness, no clock. Pure and deterministic.

---

## 3. LEGACY INVENTORY (R1, R2)

Every symbol was audited for production reachability before action.

| Symbol | Category | Action | Location | Requirement parent |
|---|---|---|---|---|
| `seedC(p, T_C)` | **C — orphaned** | **REMOVED** | deleted | none — superseded |
| `seedCPerHour` | B — **fixture only** (was: validity gate) | RETAINED, quarantined | `seed/seed.ts` | Phase 22: no longer the validity gate |
| `seedHourlyRunway` | B — fixture | RETAINED, documented | `seed/seed.ts` | test convenience only |
| `validateSeededHourlyC` | **A — validation authority** | **ADDED (Phase 22)** | `seed/seed.ts` | D-001 ruling, `[0, C_MAX]` |
| `createSeedRunway` | B — harness constructor | RETAINED, quarantined | `rollover/rollover.ts` | test convenience only |
| `externalStrength` | B — test-only | QUARANTINED | `seed/external.ts` | none — superseded |
| `externalStrengthToTargetShare` | B — test-only | QUARANTINED | `seed/external.ts` | none — superseded |
| `targetShareFromExternal` | B — test-only | QUARANTINED | `seed/external.ts` | none — superseded |
| `EXTERNAL_WEIGHTS` | B — test-only | QUARANTINED | `constants.ts` | weight-identity audit |
| `evaluateActiveDistribution` | B — test-only | QUARANTINED | `kura/distribution.ts` | equivalence oracle only |

**Category A (required in production):** none of the above.
**Category C (completely orphaned, removed):** `seedC` only.

---

## 4. RATIFIED AMBIGUITIES (R4, R5, decay timing, R6)

**R4 — zero-C songs and "active population".** ACTIVE lifecycle status decides
chart population membership, never accumulated C. A song whose 72-hour C total
is zero remains ranked and evaluated, earns `XP = 0` and `fresh Kura = 0`, and
receives no artificial minimum. For platform normalization, zero activity
contributes a zero numerator and does not inflate the activity denominator.

**R5 — first-hour event boundary.** The late-data boundary is defined relative
to the latest committed reference hour. Before the first rollover no hour has
been committed, so an event at the initial reference hour is `ON_TIME`.

**Decay timing.** Decay for a rollover is determined by the activity of the hour
that has just closed. This makes decay a single committed state transition
associated with the completed hour, and prevents future-hour activity from
affecting the decay applied to the previous hour. Formula, inputs and sequence
position unchanged.

**R6 — performance.** Current performance is an observed engineering
characteristic, not a BORA mathematical contract. Correctness, determinism and
bounded derived-state behaviour take precedence. Performance may be optimized in
a later phase without changing the mathematical contract. No algorithm changed.

---

## 5. MUTATION TESTING

**INCONCLUSIVE.**

Unchanged from Phase 19. Stryker reported false survivors with
`testsCompleted: 0`, plus two genuine equivalent mutants. No engine test was
modified to satisfy Stryker, no architecture guard was weakened, and no claim of
100% mutation coverage is made. This is a P3 tooling issue, not an engine
blocker.

---

## 6. BIDIRECTIONAL TRACEABILITY

**Requirement → implementation.** Every locked contract has exactly one
mathematical authority, is documented at that authority, and is covered by
tests. No unimplemented locked contract was found.

**Implementation → requirement.** Every surviving production module has a
legitimate parent requirement. The only implementation elements lacking one are
the quarantined symbols in §3, each now labelled LEGACY at its definition and
proven unreachable from the evaluation path.

**Remaining ambiguities:** none known at P1/P2 level.
**Remaining orphans:** none in production. The quarantined set in §3 is
intentional, documented, and test-only.
### Why `seedC` was removed rather than quarantined

`C_seed = (p / (1 − p)) × T_C` is precisely the derivation the ratified contract
forbids: the engine turning a chart-wide scalar into a seed profile. It had
**zero** production callers. Its blast radius was contained to three test files,
so removal was a broom sweep rather than a bulldozer.

### Why the external subsystem was quarantined rather than removed

Deleting it would cascade through five further files — including a shared
`testing/invariants.ts` helper asserting the
`EXTERNAL_WEIGHTS === PLATFORM_WEIGHTS / PLATFORM_TOTAL` identity — and would
destroy 29 tests. That identity remains worth auditing even though nothing
consumes E or p. Quarantine + documentation is the sanctioned alternative where
removal creates more churn than the ambiguity it removes.

### Why `createSeedRunway` stayed in the engine

Its callers span seven files across the engine tests and the `src/sim` harness.
Moving it would churn the module graph and every import to express what a
docstring states. It is labelled a test/harness constructor and is proven
unreachable from `chart.ts` by `chart.test.ts`.