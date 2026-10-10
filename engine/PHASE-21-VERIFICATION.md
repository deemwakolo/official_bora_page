# PHASE 21 - INDEPENDENT REFERENCE MODEL AND CONFORMANCE VERIFICATION

## WHAT THIS PHASE IS

Phase 21 stops asking "do the tests pass?" and asks:

> Would an independently written mathematician get the same answer?

It builds a second, deliberately naive implementation of the LOCKED BORA
mathematical contract - an ORACLE - and compares it against the production
engine across a deterministic corpus and a set of metamorphic properties.

```
        CONTRACT  (the written specification)
             |
             v
        REFERENCE MODEL        <- independent; imports nothing from src/engine
             |
             |  expected
             v   ^
     +---------------+
     |   DIFFERENTIAL |     -> conformance.test.ts   (C1 .. C11)
     |     COMPARISON |     -> metamorphic.test.ts    (P1 .. P12)
     +---------------+
             |  actual
             v
        ENGINE UNDER TEST     <- src/engine/**
```

The reference model is NOT a second test wrapper around the engine. If both
sides shared a helper, a bug in that helper would be reproduced faithfully on
both sides and the comparison would prove nothing. The independence is
enforced mechanically by `src/verification/referencePurity.test.ts`, not by
convention.

## THE INDEPENDENCE BOUNDARY

| Layer | Path | May import src/engine? |
|---|---|---|
| Reference model | `src/verification/reference/**` | **NO** - enforced by test |
| Test-layer seam | `src/verification/adapters.ts` | yes - translates shapes only |
| Scenarios / corpus | `src/verification/spec.ts`, `generator.ts` | no - plain data |
| Conformance tests | `src/verification/*.test.ts` | yes - drives both sides |

`adapters.ts` is the only file allowed to know both vocabularies. It copies
SHAPES, never formulas.

Two supporting decisions make the independence real rather than nominal:

1. **Constants are transcribed, not imported.** Every locked number in
   `reference/contract.ts` is written longhand. If they were imported from
   `src/engine/constants.ts`, a wrong `C_WINDOW_HOURS` would be reproduced
   faithfully in both models and both would agree.

2. **Types are independent too.** `reference/types.ts` defines its own plain
   `number` vocabulary instead of importing the engine's branded `HourIndex`. A
   brand is a compile-time fiction; sharing it would create the appearance of a
   shared contract while sharing nothing mathematically.

## TRACEABILITY: CONTRACT -> REFERENCE -> ENGINE -> TEST

| ID | Contract | Reference model | Engine under test | Conformance test |
|---|---|---|---|---|
| REF-K | Contract 2 - K is permanent, score-neutral, ranking tie-break #2 | carried as `RefSong.k`, consumed only by `refCompare` | `engine/k.ts`, surfaced via `EngineSong.k` | P7, P8, C7, C8 |
| REF-THRESHOLD | Contract 9 - C_U 0/1/2, C_D 0/0.5/1, C_h = max(0, C_U - C_D) | `refUpvoteContribution`, `refDownvoteContribution`, `refHourlyC` | `engine/votes/threshold.ts` | C1 |
| REF-WINDOW | Contract 3/4, A5 - H-71..H, 72 CLOCK-hours | `refWindowStart/End/Hours`, `refHourInWindow` | `engine/window/hours.ts` | C2, P3, P4, P5 |
| REF-SEED | Contract 9, A6 — actual REPLACES seed, even at C = 0 | `refResolveHours` | `chart.ts::resolveHourlyC`, `rollover.ts::resolveHourC` | C3, P6, **D-002** |
| REF-SEED-DOMAIN | Phase 22 D-001 — seed C valid iff finite ∧ 0 ≤ C ≤ C_MAX | `refSeededHourlyCAccepts`, `refSongSeedsWithinDomain` | `seed/seed.ts::validateSeededHourlyC` (called by both chart and rollover) | **D-001**, P13, P14, P15 |
| REF-DISTRIBUTION | Contract 6, A2 - T_C, XP = C/T_C, fresh = XP x 50 | `refTotalActiveC`, `refXpAndFreshKura`, `refActiveC` | `engine/kura/distribution.ts` | C4 |
| REF-KURA | A1, A3 - D_h = 0.0025 x (1 - C/2); inject BEFORE decay | `refDecayRate`, `refPersistentNext` | `engine/kura/persistent.ts` | C5, C11 |
| REF-PLATFORM | Contract 18-21, A4 - 168 hours, 30/15/5, per-platform denominator, no redistribution | `refPlatformActivity`, `refNormalisePlatform` | `engine/platform/window.ts`, `platform/points.ts` | C6, P9 |
| REF-SCORE | Contract 2 - score = persistentKura (CURRENT) + yt + sp + bp; K excluded | `refBoraScore` | `engine/score/boraScore.ts` | C7 |
| REF-RANK | Contract 7 - score, K, platformTotal, songId (UTF-16 asc) | `refCompare`, `refRank` | `engine/ranking/ranking.ts` | C8, P10 |
| REF-LIFECYCLE | Phase 13, A8 - Vault is exclusion; restore zeroes Kura, keeps K and history | `refIsActive`, `refVault`, `refRestore` | `engine/lifecycle/lifecycle.ts` | C9, P11, P12 |
| REF-ROLLOVER | A3 - evaluate, resolve C_H, fresh, decay, commit, advance, re-evaluate | `refRolloverHour` | `engine/rollover/rollover.ts` | C11 |

## REFERENCE MODEL FILES

| File | Contents |
|---|---|
| `reference/contract.ts` | REF identifiers; locked constants transcribed from the specification |
| `reference/types.ts` | The reference model's own plain-data vocabulary |
| `reference/model.ts` | REF-THRESHOLD, REF-WINDOW, REF-SEED, REF-DISTRIBUTION, REF-KURA, REF-PLATFORM, REF-SCORE, REF-RANK, REF-LIFECYCLE, whole-chart evaluation |
| `reference/rollover.ts` | REF-ROLLOVER - the hourly state transition |
| `reference/canonical.ts` | Canonical comparison rows, deterministic serialisation, field-level differ |

## TOLERANCE POLICY

> **SUPERSEDED BY PHASE 22.** The `1e-6` extreme-seed exemption described below
> was **retired**. Seed C is now bounded by `[0, C_MAX]`, so no accepted seed is
> ill-conditioned and every case is compared at `1e-9`. The text below is kept as
> the historical record of the Phase 21 policy.

- **1e-9** for all ordinary floating-point comparison.
- **1e-6** ONLY for the deliberately ill-conditioned `seed/extreme-nonuniform`
  case, and only by name in that one call site. *(RETIRED — Phase 22)*
- **Exact, no epsilon** for discrete quantities: `k`, `rank`, and song identity.
  An epsilon on a rank is meaningless and would mask a real disagreement.
- A tolerance was never widened to make a failing run green.

## DISCREPANCIES

### D-002 - ENGINE BUG - REPAIRED

**Duplicated-but-divergent formula.** Two code paths in one engine implemented
the seed-precedence rule differently.

Minimal reproduction:

```
song.buckets   = []
song.seedHours = [{ hourIndex: H, c: 2, source: 'ACTUAL', lifecycle: 'ACTIVE' }]
song.lifecycle = 'ACTIVE'
```

| Path | C_H before repair | Why |
|---|---|---|
| `evaluateChart` (Phase 14) | **0** | `chart.ts:390` skips `source !== 'SEED'` |
| `rolloverHour` (Phase 15) | **2** | `rollover.ts` matched on `hourIndex` alone |

C_H is the input to D_H, so the committed persistent Kura was decayed using
activity the chart evaluation had already ruled out: at C_H = 2 the decay rate
is 0; at C_H = 0 it is 0.0025. One engine, one locked contract, two answers.

**Why 858 tests missed it.** Every pre-existing test supplied seeds whose
`source` was `'SEED'`, so both paths agreed on every input anyone had thought to
write down. This is the canonical argument for an independent oracle: it asks
what the contract requires for inputs the author never imagined.

**Repair.** One guard in `rollover.ts::resolveHourC`, matching the rule Phase 14
already applied. No constant, coefficient, window, threshold, or ordering was
changed. Six regression tests now pin the behaviour in
`conformance.test.ts` (`D-002 seed provenance in rollover`).

### D-001 - CONTRACT AMBIGUITY - RESOLVED IN PHASE 22 BY HUMAN RULING

> **STATUS: CLOSED.** Phase 22 resolved this by human ruling. Seed C is valid
> **iff** it is finite and in the closed interval `[0, C_MAX]`, where
> `C_MAX = 2`. `validateSeededHourlyC` is now the single validation authority,
> called by both chart evaluation and rollover; the `× 72` round trip is
> removed; and the 1e-6 extreme-seed tolerance was retired because accepted
> seeds are now bounded and well conditioned. The pinning tests below were
> replaced by tests that assert the ruled domain. The text below is preserved
> as the historical record of how the ambiguity was found.

The contract states a seeded hour's C must be "finite and non-negative" and
states **no upper bound**. The engine has no single answer to what that means:

1. The validity gate in `seed.ts` is `seedCPerHour(record.c * 72)`. The
   `x 72 / 72` round trip is not an identity at the top of the double range:
   `(Number.MAX_VALUE / 72) * 72` is `Infinity`. So the EFFECTIVE accepted
   domain is `[0, MAX_VALUE/72)` ~= `[0, 2.4968e306)`, not `[0, 1.7977e308]`.

2. The chart accepts a seeded C above `C_MAX` (e.g. 7.5) and evaluates it, but
   the rollover then REJECTS the same chart, because the resolved C_H is
   validated against `[0, C_MAX]`.

Classification is CONTRACT AMBIGUITY, not an engine bug: the mathematics is
correct for every value both sides accept; what is undefined is the DOMAIN, and
the contract is silent about it. Per Phase 21 section 23 an ambiguous contract
means stop and ask a human - not silently widen the domain, and not silently
narrow it either. Both observed behaviours are pinned by tests so neither can
drift before the decision is made.

## WHAT THE PHASE ESTABLISHED

- Every locked mathematical subsystem conforms between two independently
  written implementations.
- One genuine engine defect (D-002) was found, repaired minimally, and pinned.
- One genuine contract ambiguity (D-001) was found and left for human decision.
- The reference model is provably independent: purity, isolation, and
  no-production-helpers are all asserted on every run.

## WHAT THIS PHASE DOES NOT ESTABLISH

- Mutation testing remains INCONCLUSIVE (carried forward from Phase 20R: Stryker
  false survivors and equivalent mutants). No mutation score is claimed here.
- Performance is an engineering characteristic, not a mathematical contract
  (Phase 20R R6). Nothing in this phase constrains runtime.
- Conformance is evidence, not proof. The corpus is finite; a divergence outside
  the generated space would not be found by these tests alone.
## FINAL VERIFICATION RESULTS

| Gate | Result |
|---|---|
| Typecheck (`tsc -b --force`) | **clean**, exit 0 |
| Full suite, run 1 | **931 / 931**, 27 / 27 files, exit 0 |
| Full suite, run 2 (determinism) | **931 / 931**, 27 / 27 files, exit 0 - identical |
| Engine purity (`engine/purity.test.ts`) | **18 / 18** |
| Endurance (`sim/endurance/endurance.test.ts`) | **20 / 20** |
| Deterministic replay + property + seed coverage | **90 / 90** |
| Attack / formula-authority / duplication guards | **92 / 92** |
| Phase 21 verification suite | **96 / 96** (74 conformance + 15 metamorphic + 7 purity) |

Baseline for comparison: 835 / 835 across 24 files at the end of Phase 20R.
Phase 21 adds 96 tests across 3 files and removes none.

Test-count arithmetic: 835 + 96 = 931, which matches exactly.

## SOURCE INTEGRITY

Compared by MD5 against a manifest taken before the first Phase 21 edit.

| Category | Count |
|---|---|
| Pre-existing files byte-identical | **54 of 55** |
| Pre-existing files changed | **1** - `src/engine/rollover/rollover.ts` |
| Files deleted | **0** |
| Files added | **11** - all under `src/verification/` |

The single changed engine file contains exactly one executable change: the
three-line `source !== 'SEED'` guard that repairs D-002. Verified by inspecting
the comment-stripped body of `resolveHourC`; every other line in the function is
unchanged. No mathematical constant, coefficient, window, threshold, or ordering
was modified anywhere in `src/engine/**`.

## TOLERANCE AND PACKAGE CHANGES

- No package, dependency, or configuration file was modified. No
  property-testing library was added.
- Tolerance policy held: 1e-9 everywhere, 1e-6 only for the single named
  extreme-seed case, and exact comparison for `k`, `rank`, and identity. No
  tolerance was widened to make a run green.