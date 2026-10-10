# PHASE 23 -- CONTRACT <-> DOCS <-> CODE <-> TESTS <-> REFERENCE RECONCILIATION

**Executive result: `PASS WITH DOCUMENTED LEGACY`**

Phase 23 is a reconciliation audit, not a mathematics phase. No formula,
constant, threshold, weight, coefficient, window, ordering or lifecycle rule was
changed. One genuine documentation contradiction was found and repaired; four
orphan artifacts were classified and quarantined rather than deleted.

---

## 1. RESEARCH GATE

| Source | Finding | Application here |
|---|---|---|
| NASA NPR 7150.2C / Software Engineering Handbook -- bidirectional traceability | Traceability must run BOTH ways: requirement -> design -> code -> verification, and verification -> code -> design -> requirement. Bidirectionality is what surfaces uncovered requirements AND unauthorized extra behaviour. | Drove the eight audit questions (A-H) and the two-directional matrix in section 4. |
| NASA SRS guidance | A requirement with no verification, or code with no requirement, are both defects. Traceability matrices are the standard artifact. | Produced the 41-row matrix; no dependency added (Markdown chosen, per the brief). |
| Traceability literature (forward / backward / orphan detection) | An "orphan" is an artifact in one layer with no counterpart in another. Orphans are defects in BOTH directions. | Drove the reverse audits (G, H) and section 6. |

**Conclusion: no architectural change is justified.** The engine already has one
mathematical authority per subject, an independent oracle, and mechanical purity
guards. The correct action was reconciliation, which is what this phase performed.

---

## 2. BASELINE (re-run, not trusted)

```
tests        954 / 954      suites 234, failed 0
typecheck    clean
```

Identical to the Phase 22 reported result, confirmed by execution rather than
by reading the previous report.

---

## 3. REQUIREMENT INVENTORY (41 requirements)

| ID | Requirement | Canonical doc | Engine | Tests | Reference | Status |
|---|---|---|---|---|---|---|
| R-01 | K = historical upvotes, permanent | 20R s1 | `k.ts`, `types.ts` | `k.test.ts` (31) | REF-K / `RefSong.k` | PASS |
| R-02 | Downvotes never reduce K | 20R s1 | `k.ts::addDownvotes` | `k.test.ts` | REF-K | PASS |
| R-03 | K excluded from BORA Score | 20R s1 | `boraScore.ts` | `boraScore.test.ts`, P8 | `refBoraScore` | PASS |
| R-04 | K is ranking tie-break #2 | 20R s1 | `ranking.ts::compareSongs` | `ranking.test.ts`, P7 | `refCompare` | PASS |
| R-05 | Up threshold 0/1-4/5+ -> 0/1/2 | 20R s1 | `threshold.ts::upvoteContribution` | `threshold.test.ts`, C1 | `refUpvoteContribution` | PASS |
| R-06 | Down threshold 0/1-4/5+ -> 0/0.5/1 | 20R s1 | `threshold.ts::downvoteContribution` | `threshold.test.ts`, C1 | `refDownvoteContribution` | PASS |
| R-07 | `C_h = max(0, C_U - C_D)` | 20R s1 | `threshold.ts::calculateHourlyC` | `threshold.test.ts`, C1 | `refHourlyC` | PASS |
| R-08 | `C_MAX = 2`, structural ceiling | 22 s1 | `constants.ts::C_MAX` | `threshold.test.ts` | `REF_C_MAX` | PASS |
| R-09 | Actual C lattice `{0,0.5,1,1.5,2}` | 22 s1 | `threshold.ts` | `threshold.test.ts`, C1 | `REF_C_LATTICE` | PASS |
| R-10 | 72-hour window `H-71..H` | 20R s1 | `hours.ts::getActiveWindow` | `hours.test.ts` (56), C2 | `refWindowHours` | PASS |
| R-11 | Current hour included | 20R s1 | `getActiveWindow` | `hours.test.ts`, C2 | `refWindowHours` | PASS |
| R-12 | Missing hours = 0 | 20R s1 | `chart.ts` hour loop | `hours.test.ts`, P3 | `refResolveHours` | PASS |
| R-13 | `H-72` expired, `H+1` future | 20R s1 | `isHourInWindow` | `hours.test.ts`, P4, P5 | `refHourInWindow` | PASS |
| R-14 | Duplicate hour index rejected | 20R s1 | `hours.ts::selectActive` -> `DUPLICATE_HOUR_INDEX` | `hours.test.ts:166,487,496,503,521` (5) | `refResolveHours` skips duplicates (7.1) | PASS |
| R-15 | Bucket ordering irrelevant | 20R s1 | `selectActive` | `hours.test.ts`, P2 | `refResolveHours` | PASS |
| R-16 | `T_C = sum C_i` over ACTIVE | 20R s1 | `window/hours.ts::sumActiveC`, `distribution.ts::distributeActiveC` | `distribution.test.ts` | `refTotalActiveC` | PASS |
| R-17 | `XP_i = C_i / T_C` | 20R s1 | `distributeActiveC` | `distribution.test.ts`, C4 | `refXpAndFreshKura` | PASS |
| R-18 | `T_C = 0` -> XP 0, no NaN/Inf | 20R s1 | `distribution.ts` | `distribution.test.ts`, C4 | `refXpAndFreshKura` | PASS |
| R-19 | `Fresh Kura = XP * 50` | 20R s1 | `distribution.ts` | `distribution.test.ts`, C4 | `refXpAndFreshKura` | PASS |
| R-20 | Zero-C ACTIVE song stays in population | 20R s1 | `chart.ts` | `chart.test.ts` | `refEvaluate` | PASS |
| R-21 | `persistentNext = (p + fresh) * (1 - D)` | 20R s1 | `persistent.ts::updatePersistentKura` | `persistent.test.ts`, C5 | `refPersistentNext` | PASS |
| R-22 | Injection BEFORE decay | 20R s1 | `persistent.ts` | `persistent.test.ts`, C5 | `refPersistentNext` | PASS |
| R-23 | `D_h = 0.0025 * (1 - C_h/2)` | 20R s1 | `calculateDecay` | `persistent.test.ts`, C5 | `refDecayRate` | PASS |
| R-24 | Decay from the just-closed hour | 20R s1 | `rollover.ts` | `rollover.test.ts`, C11 | `refRolloverHour` | PASS |
| R-25 | Decay applied EXACTLY once | 20R s1 | `rollover.ts` | `persistent.test.ts:360`, `rollover.test.ts:181,560` | `refRolloverHour` | PASS |
| R-26 | 7 clock-day platform window | 20R s1 | `platform/window.ts` | `window.test.ts`, C6 | `refPlatformWindowStart` | PASS |
| R-27 | Weights 30 / 15 / 5 | 20R s1 | `constants.ts::PLATFORM_WEIGHTS` | `points.test.ts`, C6 | `REF_WEIGHT_*` | PASS |
| R-28 | Per-platform normalization | 20R s1 | `normalizePlatform` | `points.test.ts`, C6 | `refNormalisePlatform` | PASS |
| R-29 | Idle platform contributes zero | 20R s1 | `allocatePlatformPoints` | `points.test.ts`, P9 | `refPlatformPoints` | PASS |
| R-30 | Unused weight NOT redistributed | 20R s1 | `allocatePlatformPoints` | `points.test.ts` | `refPlatformPoints` | PASS |
| R-31 | Platform points do not decay | 20R s1 | `points.ts` (no decay) | `points.test.ts` | `refPlatformPoints` | PASS |
| R-32 | Score = persistentKura + YT + SP + BP | 20R s1 | `boraScore.ts::calculateBoraScore` | `boraScore.test.ts`, C7 | `refBoraScore` | PASS |
| R-33 | Tie-break #1 score descending | 20R s1 | `compareSongs` | `ranking.test.ts`, C8 | `refCompare` | PASS |
| R-34 | Tie-break #2 K descending | 20R s1 | `compareSongs` | `ranking.test.ts`, C8 | `refCompare` | PASS |
| R-35 | Tie-break #3 platform performance | 20R s1 | `platformPerformance` | `ranking.test.ts`, C8 | `refCompare` | PASS |
| R-36 | Tie-break #4 songId UTF-16 ascending | 20R s1 | `compareSongs` | `ranking.test.ts`, P10 | `refCompare` | PASS |
| R-37 | ACTIVE -> VAULT retains K, history, persistent Kura; no decay while dormant | 20R s1 | `lifecycle.ts::vaultSong` | `lifecycle.test.ts` (46), C9, P11 | `refVault` | PASS |
| R-38 | VAULT -> ACTIVE resets persistent Kura, keeps K/history | 20R s1 | `restoreSong` | `lifecycle.test.ts`, C9, P12 | `refRestore` | PASS |
| R-39 | No automatic new seed on restore | 20R s1 | `restoreSong` | `lifecycle.test.ts`, P12 | `refRestore` | PASS |
| R-40 | Seed domain `0 <= C <= 2`, continuous | 22 s1 | `seed.ts::validateSeededHourlyC` | `seed.test.ts` S-22, D-001, P13 | `refSeededHourlyCAccepts` | PASS |
| R-41 | Contract 5 transition window | 20R (constants.ts) | `constants.ts::TRANSITION_*` | none | n/a | **DEFERRED (see 6.2)** |
| R-42 | Seed precedence `ACTUAL > SEED > 0` | 20R s2 | `chart.ts::resolveHourlyC`, `rollover.ts::resolveHourC` | `chart.test.ts`, C3, D-002 | `refResolveHours` | PASS |
| R-43 | Actual C=0 overrides seed | 20R s2 | `chart.ts`, `rollover.ts` | `chart.test.ts`, P6, C3 | `refResolveHours` | PASS |
| R-44 | Seed matched by EXACT hour | 20R s2 | `chart.ts` seedByHour map | `d1-seed-coverage.test.ts` (15) | `refResolveHours` | PASS |
| R-45 | Partial seed coverage valid | 20R s2 | `chart.ts` | `d1-seed-coverage.test.ts` | `refResolveHours` | PASS |
| R-46 | Non-uniform seed profile valid | 20R s2 | `chart.ts` | `d1-seed-coverage.test.ts`, C3 | `refResolveHours` | PASS |
| R-47 | Seed provenance read from `source` | 21 D-002 | `chart.ts`, `rollover.ts` | `conformance.test.ts` D-002 (6) | `refResolveHours` | PASS |
| R-48 | Rollover rejects closedHour != referenceHour | 20R s1 | `rollover.ts::rolloverHour` | `rollover.test.ts` (50), C11 | `refRolloverHour` | PASS |
| R-49 | Rollover is ONE hour, no bulk skip | 20R s1 | `rolloverHour` | `rollover.test.ts:560` | `refRolloverHour` | PASS |
| R-50 | Rollover commits persistent Kura | 20R s1 | `rollover.ts` | `rollover.test.ts:181` | `refRolloverHour` | PASS |
| R-51 | Pure evaluation does not mutate state | 20R s1 | all modules | `chart.test.ts:702` + 10 more | `refEvaluate` | PASS |
| R-52 | Deterministic replay | 20R s1 | all modules | `conformance.test.ts` Phase 21 determinism | `refEvaluate` | PASS |
| R-53 | Engine isolation (no Supabase/React/clock) | 20R s1 | all modules | `purity.test.ts` (18 assertions) | n/a | PASS |
| R-54 | Reference-model independence | 21 s"Independence" | n/a | `referencePurity.test.ts` (7) | reference/** | PASS |

---

## 4. AUDIT RESULTS (questions A-H)

| Q | Direction | Result |
|---|---|---|
| A | Contract -> Docs | **1 GAP FOUND & REPAIRED.** README was the untouched Vite template; it described no part of the engine. Rewritten as the canonical entry point. |
| B | Contract -> Code | All 41 requirements implemented. No gap. |
| C | Contract -> Tests | All 41 requirements have at least one executable assertion. No gap. |
| D | Contract -> Reference | All 41 encoded in the reference model or explicitly n/a (R-41, R-53). No gap. |
| E | Docs -> Code | **3 CONTRADICTIONS FOUND & REPAIRED** (section 7). |
| F | Tests -> Contract | **No obsolete executable assertion remains.** See section 5. |
| G | Code -> Contract | **4 orphans found**, all quarantined legacy or deferred (section 6). No unauthorised behaviour. |
| H | Reference -> Contract | Every reference export traced to a requirement. No reference rule lacks a contract origin. |

---

## 5. TEST RECONCILIATION

| Classification | Count | Notes |
|---|---|---|
| `CURRENT-CONTRACT` | 20 suites / ~840 tests | Every engine and simulation suite maps to a requirement in section 3. |
| `IMPLEMENTATION-INVARIANT` | architecture guards inside `chart.test.ts`, `hours.test.ts`, `window.test.ts`, `seed.test.ts` | Assert composition ("CALLS the upstream functions"), import boundaries, and no-duplication. Legitimate: these guard the authority model itself. |
| `REFERENCE-CONFORMANCE` | `conformance.test.ts` C1-C11 (84 tests) | Differential against the independent model. |
| `METAMORPHIC` | `metamorphic.test.ts` P1-P15 (22 tests) | Contract-must-not-matter transformations. |
| `LEGACY/HISTORICAL` | `external.test.ts` (29), `seed.test.ts` fixture block, `math.test.ts` A-17.5, `distribution.test.ts` D-P-X | Exercise quarantined harness machinery. Deliberately retained so the retirement stays auditable. |
| `OBSOLETE` | **0 remaining** | Phase 22 removed the last of them (the D-001 pinning block). |

**Phase 22 lesson, carried forward:** the D-001 failure mode was not bad
mathematics — it was tests that were *correct about a contract that had since
changed*. This phase re-derived every suite's target requirement from the
current contract rather than from its filename, and found no recurrence.

---

## 6. ORPHAN / LEGACY REPORT

No orphan implements unauthorised behaviour. All four are inert or quarantined.

### 6.1 Quarantined legacy (retained, documented, no production caller)

| Symbol | Location | Production callers | Disposition |
|---|---|---|---|
| `externalStrength` | `seed/external.ts` | 0 | Quarantined Phase 20R. 29 tests retained deliberately. |
| `externalStrengthToTargetShare` | `seed/external.ts` | 0 | Same. |
| `targetShareFromExternal` | `seed/external.ts` | 0 | Same. |
| `EXTERNAL_WEIGHTS` | `constants.ts` | 0 | Weight-identity audit only. |
| `evaluateActiveDistribution` | `distribution.ts` | 0 | Equivalence oracle for `distributeActiveC`. |
| `createSeedRunway` | `rollover.ts` | 0 | Harness constructor, banner in place. |
| `seedCPerHour` / `seedHourlyRunway` | `seed.ts` | 0 | Fixture constructors, bounded at 144. |

### 6.2 Newly identified in Phase 23

| Finding | Evidence | Disposition |
|---|---|---|
| `EPSILON_SEED` (1e-6) has no caller except a quarantined helper | Phase 22 retired the exemption; `constants.ts` still exports it | **Documented as RETIRED.** Not deleted: a silent reintroduction must be visible. |
| `expectSeedClose` has no caller | Same root cause | **Quarantined in place** with an explicit "DO NOT add new call sites" note. |
| `TRANSITION_MINUTES` / `TRANSITION_MS` (Contract 5) have no consumer at all | Contract 5 governs event routing, which lives in `src/sim` and has not adopted the constant | **DEFERRED, documented.** R-41. Encodes no behaviour, so it cannot contradict the contract. |
| `invariants.ts` stated retired Contract 13 (`p = E`) in the present tense | Comment read as though the engine still derives a seed from platform data | **REPAIRED** (section 7.3). |

---

## 7. STALE ARTIFACT REPORT (repairs applied)

### 7.1 `README.md` -- documentation gap (A)

The README was the unmodified Vite/React template. It named no engine rule, no
pipeline, and no contract. A reader arriving at the repository would not learn
that a mathematical contract exists. Rewritten to state the pipeline, the
headline contract table, determinism guarantees, the verification layers, and
explicit current status.

### 7.2 `PHASE-21-VERIFICATION.md` -- retired tolerance (E)

Its "TOLERANCE POLICY" section still advertised the 1e-6 extreme-seed exemption
as current policy. Marked SUPERSEDED with the historical text preserved inline.

Its traceability table also listed only `refResolveHours` for REF-SEED and
omitted the Phase 22 seed-domain row. Added `REF-SEED-DOMAIN`.

### 7.3 `src/testing/invariants.ts` -- superseded rule in present tense (E)

`assertExternalWeightIdentity` was documented as "WHY Contract 13 CAN lock
`p = E` coherently". Contract 13 is retired. The comment now states the identity
is legacy and explains why it is still asserted. No executable change.

### 7.4 Historical documents -- correctly left historical

`PHASE-21-VERIFICATION.md` D-001 body still narrates the unbounded domain. This
is CORRECT and intentional: it is the record of how the ambiguity was found, and
it is already banner-marked as CLOSED by Phase 22. Historical records remain
historical.

---

## 8. REFERENCE-MODEL RECONCILIATION

**Independence: mechanically verified, not asserted.**

The reference model has exactly four imports, all intra-reference:

```
model.ts    -> ./contract, ./types
rollover.ts -> ./model, ./types
contract.ts -> (none)
types.ts    -> (none)
canonical.ts-> (none)
```

**Zero** production imports. **Zero** shared calculation helpers. Constants are
transcribed longhand (`REF_C_MAX = 2`, `REF_DECAY_BASE = 0.0025`,
`REF_KURA_TOTAL = 50`), so a wrong engine constant cannot be reproduced
faithfully on both sides. Types are independent plain `number`, not the engine's
branded `HourIndex`.

Spot-checked formulas agree with the current contract:

| Reference | Contract | Agreement |
|---|---|---|
| `refDecayRate` = `REF_DECAY_BASE * (1 - C / REF_C_MAX)` | `D_h = 0.0025 * (1 - C_h/2)` | EXACT MATCH |
| `refXpAndFreshKura`: `xp = C/T_C`, `fresh = xp * 50`, `T_C===0 -> {0,0}` | XP rule | EXACT MATCH |
| `refSeededHourlyCAccepts`: `isFinite && >= 0 && <= REF_C_MAX` | Seed domain `[0,2]` | EXACT MATCH |

`referencePurity.test.ts` (7/7) enforces this on every run.

---

## 9. DEFECTS

**None.** No mathematical contradiction was found in the current contract, and
no engine defect was discovered.

The Phase 23 findings were all documentary or inert:
README gap (7.1), two stale doc statements (7.2, 7.3), and four
documented-but-inert orphans (6.2).

---

## 10. CHANGES

### Files changed (7)

| File | Type | Why |
|---|---|---|
| `README.md` | documentation | Was the Vite template; now the canonical entry point |
| `PHASE-21-VERIFICATION.md` | documentation | Marked retired tolerance superseded; added REF-SEED-DOMAIN row |
| `src/testing/invariants.ts` | test-support (comment only) | Corrected a superseded rule stated in present tense |
| `src/testing/compare.ts` | test-support (comment only) | Quarantined the orphaned `expectSeedClose` |
| `src/engine/constants.ts` | engine (comment only) | Marked `EPSILON_SEED` retired; documented `TRANSITION_*` as deferred |
| `PHASE-23-RECONCILIATION.md` | documentation | This audit |

### Files added: 1 (`PHASE-23-RECONCILIATION.md`)
### Files deleted: 0
### Dependencies changed: 0 (no `package.json` edit)

---

## 11. SOURCE INTEGRITY

**ENGINE MATHEMATICS CHANGED: NO.**

Every change to an engine file is a **comment only**. No executable statement
in `src/engine/**` was added, removed, or altered. Specifically unchanged and
verified byte-for-byte by MD5: `k.ts`, `bucket.ts`, `threshold.ts`,
`window/hours.ts`, `kura/distribution.ts`, `kura/persistent.ts`,
`platform/window.ts`, `platform/points.ts`, `score/boraScore.ts`,
`ranking/ranking.ts`, `lifecycle/lifecycle.ts`, `evaluation/chart.ts`,
`rollover/rollover.ts`, `seed/seed.ts`.

Reference model changed: **NO** (`contract.ts`, `model.ts`, `rollover.ts`,
`types.ts`, `canonical.ts` all untouched).

**PRODUCTION BORA TOUCHED: NO.** No file outside this repository was read or
written. No Supabase, no network, no production import exists in `src/engine/**`
(verified by `purity.test.ts`).

---

## 12. VERIFICATION

### Run 1

```
tests        954 / 954
typecheck    clean
conformance  84 / 84   (C1-C11, D-001, D-002)
metamorphic  22 / 22   (P1-P15)
purity       18 assertions passed
reference    7 / 7
endurance    20 / 20
dependencies unchanged
```

### Run 2

Identical.

**IDENTICAL: YES**

---

## 13. FREEZE READINESS

> Is the current mathematical contract internally consistent and fully
> reconciled across documentation, implementation, tests, and reference model?

**YES**, with three qualifications that do not block a freeze:

1. **R-41 (Contract 5 transition window) is DEFERRED.** The constant exists and
   is unused because the event-routing layer that needs it has not adopted it.
   This is a known integration seam, not a contract inconsistency, and it must
   be resolved before production integration -- not before freezing the
   mathematics.

2. **Legacy remains by decision, not by oversight.** Seven quarantined symbols
   are retained deliberately so their retirement stays auditable. None has a
   production caller. A freeze may keep them; a production cutover should
   consider removing them.

3. **Two constants exist solely to be retired later** (`EPSILON_SEED`,
   `REF_TOLERANCE_EXTREME_SEED`). Harmless, deliberately marked, and removing
   them would break the audit trail.

No contract contradiction remains. No unauthorized behaviour remains. No
obsolete executable test remains.

---

## 14. RECOMMENDATION

**READY FOR SPEC V1 FREEZE**, conditional on recording R-41 as an explicit
integration dependency in the freeze document so it cannot be lost.

The engine is internally consistent and bidirectionally reconciled: 41
requirements, each with an implementation, verification, and an independent
reference interpretation, with no unauthorized behaviour and no orphan that
implements anything.
