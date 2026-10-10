# PHASE 24 - BORA ENGINE SPECIFICATION V1 FREEZE

## VERDICT

# `SPEC V1 FROZEN WITH DOCUMENTED DEFERRED ITEM`

BORA Engine Specification V1 is established as the mathematical baseline for all
subsequent work. No mathematical behaviour was invented, changed, or removed in
this phase.

---

## 1. RESEARCH GATE

| Source | Principle extracted | Effect on this phase |
|---|---|---|
| NASA NPR 7150.2C / NASA Software Engineering Handbook | Bidirectional traceability between requirements, implementation, and verification; baselines must carry their verification evidence | Traceability R-01..R-54 carried forward as the baseline; section 18 records verification evidence **with** the baseline rather than separately |
| NASA Systems Engineering Handbook (NASA/SP-2007-6105) | Technical milestones establish baselines; the baseline is the point after which change is controlled | Confirmed the phase structure: freeze the contract, then control all further change. Nothing changed. |
| Configuration management (baselining, change control) | A baseline is an identified, versioned set of artifacts plus the evidence that was current when it was set. After baselining, changes are controlled changes, not edits | Produced section 26 change-control rules and the section 10 fingerprint |
| ISO/IEC/IEEE 29148 (requirements engineering) | A specification must be unambiguous, traceable, and versioned; baselining makes the specification the authority that other artifacts are checked against | Confirmed the four-artifact separation in spec section 1.4 (spec / engine / oracle / tests) |
| Traceability literature (from Phase 23) | Forward + backward traceability detect missing requirements and unauthorized behaviour | Re-verified at freeze rather than assumed from Phase 23 |

**Did any principle require a change to this phase? No.**

Research confirmed the freeze structure was sound. No mathematical or
architectural defect was revealed. No architecture change was made.

One correction WAS made, but it is a **provenance/attribution** defect, not a
mathematical one — see section 6.

---

## 2. BASELINE IDENTITY

| Field | Value |
|---|---|
| Specification document | `BORA-ENGINE-SPEC-V1.md` |
| Specification version | V1.0 |
| Status | **BASELINED** |
| Date of baseline | 2026-10-05 |
| Engine identity | `bora-engine-v1` |
| Governing human rulings | Phases 1-24 |
| Supersedes | Phase 20R ratification, Phase 21 verification, Phase 22 seed domain, Phase 23 reconciliation — as **narrative history**, not as conflicting authority |

### 2.1 Relationship to prior documents

Prior phase documents are **retained as the historical record**. They are not
deleted and not treated as competing authority. Where any of them describes a rule
that has since been superseded, the governing statement is in
`BORA-ENGINE-SPEC-V1.md`.

---

## 3. SPECIFICATION ARTIFACT

`BORA-ENGINE-SPEC-V1.md` at the repository root.

Contents, all present:

| Required content | Section |
|---|---|
| Status and identity | 1 |
| Historical K | 2 |
| Hourly vote thresholding, `C_MAX` | 3 |
| Active 72-hour window | 4 |
| Active C distribution, `T_C`, XP, zero-total | 5 |
| Persistent Kura, decay, current vs projected | 6 |
| Platform points, weights, idle, no redistribution | 7 |
| BORA Score, K excluded | 8 |
| State model, persistent vs derived | 9 |
| Ranking, determinism, `INVALID_SONG_ID` | 10 |
| Lifecycle / Vault | 11 |
| Seed architecture and domain | 12 |
| Seed provenance | 13 |
| Temporal rules, rollover boundary, late data | 14 |
| Pure evaluation vs state transition | 15 |
| Determinism and purity | 16 |
| Tolerance policy | 17 |
| Verification baseline | 18 |
| Independent reference model | 19 |
| Traceability baseline | 20 |
| Deferred item R-41 | 21 |
| Quarantined legacy | 22 |
| Explicit non-goals | 23 |
| Post-V1 proposals | 24 |
| Error behaviour | 25 |
| Change control | 26 |
| Acceptance criteria | 27 |

### 3.1 Formula fidelity

Formulas are stated in explicit notation and were verified against source before
being written down:

```
C_h           = max(0, C_U - C_D)
ActiveC_i     = sum of C_h over the 72-hour active range
T_C           = sum over active population of ActiveC_i
XP_i          = ActiveC_i / T_C
FreshKura_i   = XP_i * 50
D_h           = 0.0025 * (1 - C_h / 2)
PersistentNext= (PersistentCurrent + FreshKura) * (1 - D_h)
BORA Score    = PersistentKura + YT + SP + BP
```

No formula was paraphrased to the point of changing its mathematical meaning.

---

## 4. ACCEPTANCE CRITERIA

### A. Specification

| Criterion | Status |
|---|---|
| `BORA-ENGINE-SPEC-V1.md` exists | PASS |
| Complete (27 sections) | PASS |
| Internally consistent | PASS |
| Mathematically explicit | PASS |
| No retired rule presented as current | PASS — the `1e-6` tolerance is explicitly marked RETIRED; legacy is explicitly marked non-normative |

### B. Repository integrity

| Criterion | Status |
|---|---|
| No production engine mathematics changed for formatting | PASS — see section 6 |
| No production BORA files touched | PASS — none exist in this repository |
| No new dependencies | PASS — `package.json` unchanged |
| Reference model remains independent | PASS — zero production imports, verified mechanically |

### C. Verification

| Criterion | Status |
|---|---|
| Full test suite | PASS — 954/954 |
| Typecheck | PASS — clean |
| Purity | PASS |
| Conformance | PASS — 84/84 |
| Metamorphic | PASS — 22/22 |
| Deterministic replay | PASS — identical across runs |
| Endurance | PASS — 20/20 |
| Architecture guards | PASS |
| No known regression | PASS |

### D. Traceability

| Criterion | Status |
|---|---|
| Every normative requirement maps to implementation | PASS |
| Every normative requirement maps to verification | PASS |
| Every normative requirement maps to reference behaviour where applicable | PASS |
| No unexplained normative orphan behaviour | PASS — all orphans are documented non-normative legacy |

### E. Baseline

Recorded in section 10. **No hash was fabricated.** Git is not present in this
repository; this is stated plainly rather than papered over with an invented
commit id.

---

## 5. VERIFICATION RESULTS

Executed at freeze, twice.

| Evidence | Result |
|---|---|
| Ordinary test suite | **954 / 954** |
| Test files | 27 suites / 234 cases / 0 failures |
| Typecheck (`tsc -b`) | clean (0 bytes of diagnostics) |
| Engine purity | 18 assertions passing |
| Reference-model purity | 7 / 7 |
| Conformance | 84 / 84 |
| Metamorphic | 22 / 22 |
| Endurance | 20 / 20 |
| Deterministic replay | byte-identical |
| Dependencies | unchanged |

### RUN 1
`954 / 954` — typecheck clean

### RUN 2
`954 / 954` — typecheck clean

### IDENTICAL: **YES**

---

## 6. REPOSITORY / SOURCE INTEGRITY

### 6.1 Files added

| File | Purpose |
|---|---|
| `BORA-ENGINE-SPEC-V1.md` | The normative specification |
| `PHASE-24-SPEC-FREEZE.md` | This baseline artifact |

### 6.2 Files changed

| File | Change | Executable? |
|---|---|---|
| `src/engine/platform/window.ts` | Removed a false contract attribution from a comment | **No — comment only** |
| `src/engine/platform/points.ts` | Same | **No — comment only** |
| `src/engine/platform/window.test.ts` | `describe(...)` title text only | **No — string literal in a test title** |

### 6.3 Why those three changes were made

`window.ts` and `points.ts` credited **per-platform independence** to
"Contract Phase 23". Phase 23 was a *reconciliation* phase that changed no
mathematics. Independent per-platform normalization is **Contract 18-21 / A4** and
dates from Phase 6. The comment therefore asserted a false provenance for a
current rule.

This is a **provenance defect, not a mathematical defect**. The behaviour was and
remains correct. It was corrected because a frozen specification that cites the
wrong authority for a live rule is a specification that will drift.

### 6.4 Files deleted

**None.** No legacy was deleted. This is a freeze, not a cleanup.

### 6.5 Dependencies changed

**None.** `package.json` and `package-lock.json` unchanged.

### 6.6 ENGINE MATHEMATICS CHANGED

# **NO**

Every engine change is a comment or a test title. No executable statement in
`src/engine/**` was added, removed, or altered. Verified by MD5 comparison of
every engine module except the three named above, and by declaration-level
inspection of those three.

### 6.7 Reference model changed

**NO.** All five reference files untouched.

### 6.8 PRODUCTION BORA TOUCHED

# **NO**

No file outside `F:\coding\bora-engine` was read or written. No Supabase, no
network, no production import exists in `src/engine/**`.

---

## 7. TRACEABILITY STATUS

| Property | Status |
|---|---|
| Requirement IDs | R-01 .. R-54 |
| Implementation mapping | complete |
| Verification mapping | complete |
| Reference-model counterpart mapping | complete where applicable |
| Bidirectional | yes |
| Unresolved mathematical requirement gap | **none** |
| Normative orphan behaviour | **none** |

Full matrix: `PHASE-23-RECONCILIATION.md`.

---

## 8. DEFERRED ITEM: R-41

**Status: DEFERRED — does not block the freeze.**

`TRANSITION_MINUTES` / `TRANSITION_MS` exist in `src/engine/constants.ts` with
**zero behavioural consumers**. Contract 5 governs event routing, which belongs to
the future simulation / integration layer.

* Not a mathematical inconsistency in V1 — the constant encodes no behaviour.
* **Must** be resolved before production integration, if that integration requires
  the transition timing contract.
* Deliberately not solved in Phase 24.
* Deliberately not deleted to make the freeze look cleaner.

Recorded in specification section 21 so it cannot be lost.

---

## 9. LEGACY STATUS

Eleven symbols remain intentionally quarantined:

| Symbol | Status |
|---|---|
| `createSeedRunway` | zero production callers |
| `seedCPerHour` | zero production callers |
| `seedHourlyRunway` | zero production callers |
| `externalStrength` | quarantined |
| `externalStrengthToTargetShare` | quarantined |
| `targetShareFromExternal` | quarantined |
| `EXTERNAL_WEIGHTS` | weight-identity audit only |
| `evaluateActiveDistribution` | equivalence oracle only |
| `EPSILON_SEED` | retired tolerance |
| `expectSeedClose` | quarantined helper, zero callers |
| `REF_TOLERANCE_EXTREME_SEED` | retired tolerance |

None participates in production evaluation. **No new call sites are permitted.**
Future cleanup may remove them once the audit trail is no longer needed.

**Nothing was deleted in Phase 24.**

---

## 10. BASELINE FINGERPRINT

All values generated from the actual repository. **No value is fabricated.**

### 10.1 Version control

```
Git repository : ABSENT
git status     : fatal: not a git repository
git HEAD       : unavailable
```

This repository is **not** under Git. No commit hash is recorded because none
exists. A Git checkpoint commit could **not** be created; see section 11.

### 10.2 Specification artifact

```
SHA256  BORA-ENGINE-SPEC-V1.md
103f025c82aabee2347b7f88823f816396f5587551cc16e39a30bb0b9f59fffd
```

### 10.3 Engine source inventory (SHA256, first 16 hex)

```
src/engine/bucket.ts                    da7747bc212ef63a
src/engine/constants.ts                 88819d8e24ca737e
src/engine/evaluation/chart.ts          2e28c3a78fb233a8
src/engine/k.ts                         028bd00ff771a136
src/engine/kura/distribution.ts         ba3824639d4c9113
src/engine/kura/persistent.ts           b1cd21f2bc1ad98f
src/engine/lifecycle/lifecycle.ts       4fe1b5a8064ebff1
src/engine/platform/points.ts           e538acc0515bc1b4
src/engine/platform/window.ts           ca043d0097007f01
src/engine/ranking/ranking.ts           75dcf4746151e492
src/engine/rollover/rollover.ts         01e703a477a5458b
src/engine/score/boraScore.ts           ae1bf0e114020b3e
src/engine/seed/external.ts             a3b8ae405c7a923d
src/engine/seed/seed.ts                 7ce6783e5dc51599
src/engine/types.ts                     37f09766acde8ee6
src/engine/votes/threshold.ts           8432707eb29d503b
src/engine/window/hours.ts              ea89c166e373840e
```

### 10.4 Reference model inventory (SHA256, first 16 hex)

```
src/verification/reference/canonical.ts  ad6a8e3dd05274ee
src/verification/reference/contract.ts   edc4c0dba9beee25
src/verification/reference/model.ts       ecc7a6864fea5f75
src/verification/reference/rollover.ts    89c1f3befc89ac15
src/verification/reference/types.ts      474cdd490bb549bd
```

### 10.5 Test suite aggregate

```
test files              27
aggregate SHA256        f3056880a29b73304f6325b3ba829aa4
```

### 10.6 Verification result summary

```
tests 954/954 · suites 234 · typecheck clean
```

---

## 11. GIT CHECKPOINT

**Not possible.** The repository is not a Git repository (section 10.1), so no
checkpoint commit was created.

This is recorded as a factual limitation, not worked around. The content hashes
in section 10 serve as the baseline fingerprint in the absence of version control.

**Recommendation:** initialize Git and commit this baseline before production
comparison work begins. Without version control, "controlled revision" under
specification section 26 has no mechanical enforcement, and Phase 25's rule set
relies on discipline alone.

---

## 12. FINAL VERDICT

```
SPEC V1 FROZEN WITH DOCUMENTED DEFERRED ITEM
```

BORA Engine Specification V1.0 is BASELINED as the mathematical contract.

* Every normative requirement maps to implementation, verification, and an
  independent reference counterpart.
* Verification passed twice, identically, with no regression.
* No engine mathematics changed in this phase.
* No dependency changed.
* No production BORA file was touched.
* One deferred item (R-41) is documented and bounded.
* Eleven quarantined legacy symbols are documented, retained, and unwired.

The engine has earned the right to stop changing. The next stage is not further
engine modification.

### Phase 25 Baseline Follow-up

> **The statement above is preserved exactly as written at Phase 24.** It was
> accurate when made: Git genuinely was unavailable at freeze time.
>
> **Phase 25 subsequently established the missing mechanical anchor.**
> ``F:\coding\bora-engine`` is now a Git repository, the V1 baseline is committed,
> and an annotated tag ``bora-engine-v1.0`` points at that commit. The
> recommendation above has therefore been carried out.
>
> Nothing in this follow-up alters Phase 24's mathematical content,
> verification evidence, or fingerprint. See ``PHASE-25-GIT-BASELINE.md`` for the
> full record.
