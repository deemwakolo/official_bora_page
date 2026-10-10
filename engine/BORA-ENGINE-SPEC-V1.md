# BORA ENGINE SPECIFICATION V1

| | |
|---|---|
| **Document** | BORA Engine Specification V1 |
| **Specification version** | V1.0 |
| **Status** | **BASELINED** |
| **Date of baseline** | 2026-10-05 |
| **Engine identity** | `bora-engine-v1` (`ENGINE_VERSION`, `src/engine/constants.ts`) |
| **Baseline authority** | Human-ratified contract, Phases 1-24 |

---

## 1. STATUS AND IDENTITY

### 1.1 What this document is

This document is the **normative mathematical contract** of the BORA Engine. It is
the authoritative human-readable statement of what the engine computes.

### 1.2 Scope of the engine

The engine converts an explicit, fully-specified state into an explicit,
fully-specified result, deterministically. It answers one question:

> Given the exact state and events of BORA, can the chart be calculated
> deterministically, with no hidden state, no arbitrary behaviour, and no formula
> drift?

The pipeline is:

```
REAL EVENTS
  -> hourly C                 (thresholding)
  -> 72-hour active C          (windowing)
  -> XP                        (active-C distribution)
  -> fresh Kura
  -> persistent Kura + decay   (state transition)
  -> platform points
  -> BORA Score
  -> ranking
```

### 1.3 Repository scope

| In scope | Out of scope |
|---|---|
| The mathematical contract | Production BORA application |
| The engine implementation (`src/engine/**`) | Supabase / any database |
| The simulation layer (`src/sim/**`) | Production UI, chart presentation |
| The independent reference model (`src/verification/reference/**`) | Platform API ingestion, scraping |
| Verification suites | User identity, voting authentication |

**Production BORA is outside this repository.** No file in this repository is
imported by, or shared with, the production BORA application. The engine exists
to be *consumed* by production, never to have its mathematics defined by it.

### 1.4 Relationship between the four artifacts

These are distinct and MUST NOT be collapsed into one:

| Artifact | Role |
|---|---|
| **This specification** | The authoritative human-readable mathematical contract |
| **The engine** (`src/engine/**`) | The executable implementation of this contract |
| **The reference model** (`src/verification/reference/**`) | An independent conformance oracle |
| **The tests** | Verification evidence |

The reference model is NOT the implementation and MUST NOT become a mirror of it.
It exists so that agreement between engine and oracle is *evidence* rather than
tautology.

### 1.5 Change authority

Any future change to the mathematics described here requires a **new controlled
specification revision** under the change-control process in section 26. Editing
this document, or the engine, without that process is a defect.

No organization, certification authority, or external approval body is claimed
or implied by this document. It reflects only human rulings recorded in the
phase reports for Phases 1-24 of this repository.

---

## 2. HISTORICAL K

```
K = total historical upvotes
```

K is a permanent historical accumulator.

| Rule | Statement |
|---|---|
| K is permanent | K never decays. |
| K never decreases | Downvotes never reduce K. |
| K is excluded from BORA Score | K does **not** directly contribute to the score. |
| K is ranking tie-break #2 | See section 10. |
| K survives ACTIVE -> VAULT | See section 11. |
| K survives VAULT -> ACTIVE | See section 11. |

K and Kura are **different concepts**. K is a historical vote count. Kura is an
accumulated score balance. Only Kura enters BORA Score.

---

## 3. HOURLY VOTE THRESHOLDING

For one clock-hour:

### 3.1 Upvote contribution C_U

| Upvotes in the hour | C_U |
|---|---|
| 0 | 0 |
| 1-4 | 1 |
| 5 or more | 2 |

### 3.2 Downvote contribution C_D

| Downvotes in the hour | C_D |
|---|---|
| 0 | 0 |
| 1-4 | 0.5 |
| 5 or more | 1 |

### 3.3 Effective hourly C

```
C_h = max(0, C_U - C_D)
```

Therefore, for **actual, vote-derived** hourly C:

```
C_h in {0, 0.5, 1, 1.5, 2}
```

and:

```
C_MAX = 2
```

`C_MAX` is **structural**: it is the maximum hourly contribution the vote
threshold system can produce. It is not a tunable parameter.

**Note on domains.** The discrete set above applies to ACTUAL, thresholded,
vote-derived C. A SEEDED hourly C is continuous on `[0, C_MAX]`; see section 12.
Confusing the two is a category error.

---

## 4. ACTIVE 72-HOUR WINDOW

Let `H` be the **reference hour**.

```
active hourly range = H - 71 ... H
```

Exactly 72 clock-hours. The current, in-progress hour `H` is included.

| Rule | Statement |
|---|---|
| Current hour | `H` is included. |
| Expired | `H - 72` is outside the window. |
| Future | `H + 1` is outside the window. |
| Missing hours | Contribute zero. |
| Ordering | The order in which buckets are supplied does not affect the result. |
| Duplicates | A duplicated hour index is invalid and is rejected (`DUPLICATE_HOUR_INDEX`). |
| Retention | Historical buckets remain stored. |
| Expiry | By **selection**, never by deletion. |
| Multi-hour movement | Occurs only as multiple single-hour transitions. |

The window is a range of **clock time**, not a count of stored records.

For song `i`:

```
ActiveC_i = sum of C_h over the selected active 72-hour range
```

---

## 5. ACTIVE C DISTRIBUTION

Let `P` be the set of ACTIVE songs in the evaluated chart.

```
T_C = sum over i in P of ActiveC_i
```

For each song `i` in `P`:

```
XP_i        = ActiveC_i / T_C
FreshKura_i = XP_i * 50
```

### 5.1 Zero-total behaviour

If `T_C = 0` then for every active song:

```
XP_i        = 0
FreshKura_i = 0
```

with **no `NaN`** and **no `Infinity`**.

### 5.2 Zero-C ACTIVE songs

A song with `ActiveC_i = 0` **remains in the active population**. It is not
excluded. Dropping it would change the population size and make the chart depend
on its own membership rules. It simply contributes zero to every sum.

### 5.3 Relative nature

XP is a **share**. A song's XP depends on its proportion of total active C, not
merely on its own raw C. Moving one song's C changes every other song's XP.

---

## 6. PERSISTENT KURA

Persistent Kura is **state**, not derived output.

At hourly rollover:

```
PersistentNext = (PersistentCurrent + FreshKura) * (1 - D_h)
```

where `D_h` is the decay rate for the **just-closed** hour.

### 6.1 Decay

```
D_h = 0.0025 * (1 - C_h / 2)
```

Therefore:

```
0 <= D_h <= 0.0025
```

| Boundary | Decay |
|---|---|
| `C_h = 0` | `D_h = 0.0025` (maximum decay) |
| `C_h = 2` | `D_h = 0` (no decay) |

The decay rate is **monotonically decreasing** in `C_h`.

### 6.2 Ordering

Fresh Kura is injected **before** decay, so the amount just earned is itself
subject to that cycle's decay.

### 6.3 Applied exactly once

Decay is applied **exactly once** per hourly rollover. It is never compounded
within a call, and never applied by pure evaluation.

### 6.4 Decay domain guarantee

Because `0 <= C_h <= C_MAX = 2`, the decay rate is bounded. `D_h` is never
negative, so **decay never becomes growth**.

### 6.5 Current versus projected

| Quantity | Meaning |
|---|---|
| `persistentKura` | The **current committed** balance. Used by BORA Score for the evaluated chart. |
| `persistentKuraNext` | A **projection** of what the balance becomes after the next rollover commits. |

**BORA Score uses the current persistent Kura**, not the projected value.
Evaluation may compute `persistentKuraNext`, but committing it is the exclusive
responsibility of rollover.

Pure chart evaluation **does not mutate state** and does not repeatedly decay
state.

---

## 7. PLATFORM POINTS

### 7.1 Weights

| Platform | Weight |
|---|---|
| YouTube | 30 |
| Spotify | 15 |
| Boomplay | 5 |

```
PLATFORM_TOTAL = 50
```

These are **fixed mathematics**, never configuration.

### 7.2 Observation window

Platform activity is observed over **7 clock-days** (168 clock-hours).

### 7.3 Normalization

Each platform is normalized **independently**, against that platform's own total
active activity:

```
points_platform(i) = ( activity_platform(i) / sum_j activity_platform(j) ) * weight_platform
```

There is no cross-platform balancing and no hidden renormalization. Dominance on
one platform earns nothing on another.

### 7.4 Idle platform

If a platform's total active activity is zero:

* every song receives **0** points for that platform;
* no `NaN`, no division by zero;
* **unused weight is NOT redistributed** to the other platforms.

### 7.5 No decay

Platform points do not decay. They are computed fresh from the active window at
each evaluation.

---

## 8. BORA SCORE

```
BORA Score = Persistent Kura + YouTube Points + Spotify Points + Boomplay Points
```

The score is additive and linear: increasing any single component by `d`
increases the score by exactly `d`.

**K is excluded.** K is a ranking tie-break only and never enters the score.

---

## 9. STATE MODEL

### 9.1 Persistent state

| Field | Description |
|---|---|
| `referenceHour` | The current clock hour `H` |
| `songs` | The song population |
| `K` | Historical upvote total per song |
| buckets | Historical hourly vote buckets |
| lifecycle | `ACTIVE` or `VAULT` per song |
| `persistentKura` | Current committed Kura balance |
| platform observations | Per-song, per-platform, per-hour activity |
| seed timeline | Explicit hour-indexed seed records |

### 9.2 Derived state

| Field | Description |
|---|---|
| active C | Per-song sum over the 72-hour window |
| `T_C` | Chart-wide total active C |
| `XP` | Per-song share of `T_C` |
| fresh Kura | `XP * 50` |
| platform points | Normalized, weighted |
| BORA Score | Composition of the above |
| rank | Total order over the population |
| `persistentKuraNext` | Projection of the post-rollover balance |

**Derived state is fully recalculable** from the persistent state plus the
evaluation context. It is never authoritative, and it is never stored as if it
were.

---

## 10. RANKING

Ranking is a **total deterministic order**. Songs are compared by the following
levels, in order. The first level that distinguishes them decides.

| Level | Criterion | Direction |
|---|---|---|
| 1 | BORA Score | descending |
| 2 | K | descending |
| 3 | Normalized platform performance `YT + SP + BP` | descending |
| 4 | `songId` | lexical **ascending**, UTF-16 code-unit order |

### 10.1 Determinism

* Ranking uses `<` / `>` comparison on song ids, **never** `localeCompare`, which
  is locale-dependent and would produce different orders on different machines.
* There is **no random tie-breaking**.
* Given valid distinct song ids, level 4 always resolves a tie, so the comparator
  never returns "fully tied".

### 10.2 `INVALID_SONG_ID`

If a song's id is missing, empty, or not a string, the call is **rejected** with
`INVALID_SONG_ID`. It is not coerced, defaulted, or substituted, because ranking
falls back to `songId` for determinism: an id with no defined order has no
defined position.

---

## 11. LIFECYCLE / VAULT

### 11.1 ACTIVE -> VAULT

On vaulting a song:

| Retained | |
|---|---|
| K | retained |
| historical bucket history | retained |
| persistent Kura | retained |

A vaulted song:

* is **excluded** from active ranking and from the active C population;
* receives **no decay** while dormant;
* is not deleted. Vault is an **exclusion**, never a reset.

### 11.2 VAULT -> ACTIVE

On restoring a song:

| Retained | |
|---|---|
| K | retained |
| historical bucket history | retained |
| historical platform observations | retained |

and:

* `persistentKura` is **reset to 0**;
* **no new seed is automatically generated**.

---

## 12. SEED ARCHITECTURE

### 12.1 Seed is an external assessment, not observed activity

Seed represents an **assessed expectation** of hourly activity. It is **not**
observed voting activity.

### 12.2 The engine does not invent seeds

The engine does **not**:

* assess popularity;
* calculate an external-strength seed distribution;
* derive a seed runway from `T_C`;
* convert a scalar into 72 values;
* distribute strength across hours;
* infer missing seed hours.

The pipeline is:

```
EXTERNAL ASSESSMENT (human / operator / assessment process)
  -> explicit hourly seed values
  -> operator or harness injection
  -> engine validation      <- engine responsibility begins here
  -> engine evaluation
```

Seed C is supplied externally as an **exact-hour value**.

### 12.3 Seeded hourly C domain

```
0 <= C_seed <= C_MAX        where C_MAX = 2
```

This is a **continuous** closed interval.

| Value | Verdict |
|---|---|
| `0` | accepted |
| `Number.MIN_VALUE` | accepted |
| any finite value strictly between 0 and 2 | accepted |
| `0.5`, `1`, `1.25`, `1.5` | accepted |
| `2` | accepted |
| `> 2` | **rejected** |
| negative | **rejected** |
| `NaN` | **rejected** |
| `+Infinity` | **rejected** |
| `-Infinity` | **rejected** |

**Why the upper bound exists.** `D_h = 0.0025 * (1 - C_h / 2)` is negative
whenever `C_h > 2`, which would turn decay into growth and contradict the
semantic role of the coefficient. Seed values are therefore bounded by the
structural maximum hourly C of the activity model.

**Reject, never clamp.** An out-of-domain seed is rejected. Clamping `7.5` down to
`2` would silently invent a different chart; clamping `-3` up to `0` would
silently invent an hour of measured activity.

**No `* 72` round-trip validation exists.** A supplied hourly value is validated
directly as `finite AND >= 0 AND <= C_MAX`. There is no scalar round trip and no
derived boundary.

### 12.4 Precedence for an exact hour

For each clock hour, in order:

1. an **actual** C exists for this hour -> use that C
2. otherwise a **seed** exists for this hour -> use the seed C
3. otherwise -> `C = 0`

**Bucket existence decides, not bucket value.** An hour holding a real but empty
bucket resolves to `C = 0` and the seed for that hour is **suppressed**.

Therefore an actual `C = 0` **explicitly overrides** a seed for that hour.

A supplied seed is **never added** on top of actual C. Actual **replaces** seed.

### 12.5 Runway properties

* A **non-uniform** seed runway is valid.
* A **partial** seed runway is valid.
* A supplied runway is **never reinterpreted** as a scalar whole-window overlay.
  A seed covering one hour affects exactly that hour.

---

## 13. SEED PROVENANCE

Hourly C resolution carries explicit provenance:

| Provenance | Meaning |
|---|---|
| `ACTUAL` | Resolved from a vote bucket |
| `SEED` | Resolved from a supplied seed record |
| `NONE` | No value for that hour; C is 0 |

**Provenance must never be inferred from the numeric value of C.**

An actual `C = 0` and a missing hour both produce the numeric value zero, but they
are semantically distinct: the first is measured silence, the second is absence of
evidence. Consequently:

* a record whose `source` is not `SEED` is **never** treated as a seed, whatever
  its numeric value;
* an `ARCHIVED` record has left the timeline, is retained forever, and
  contributes nothing.

---

## 14. TEMPORAL RULES

### 14.1 Core terms

| Term | Meaning |
|---|---|
| `referenceHour` | The current clock hour `H` of committed state |
| `closedHour` | The hour that has just completed |

### 14.2 Rollover boundary

```
closedHour must equal state.referenceHour
```

Any other value is **rejected**. Rollover advances exactly one hour and never
skips or invents one.

### 14.3 One hour only

There is **no bulk multi-hour transition API**. Moving from `H` to `H + 3`
requires **three** single-hour rollover calls, so each elapsed hour receives its
own C and its own decay. Collapsing a gap into one cycle would decay three hours
as though only one had passed.

### 14.4 Ordering

* **Same-hour declaration order** is NOT silently claimed commutative.
* **Cross-hour ordering** has been verified deterministic where contractually
  applicable.

### 14.5 Late and backdated events

The engine has no clock and no notion of lateness. Whether an event arrived
before or after the relevant commitment boundary is decided by the
**simulation / event-delivery layer**, not by engine mathematics. Late events are
surfaced as late events rather than being silently treated as on-time.

---

## 15. PURE EVALUATION VERSUS STATE TRANSITION

These are two distinct authorities and MUST NOT be conflated.

### 15.1 Evaluation

```
evaluateChart(...)
```

A **pure calculation**. It must not:

* mutate engine state;
* use wall-clock time;
* use randomness;
* depend on global mutable state;
* access external services, Supabase, or production BORA;
* repeatedly decay persistent Kura.

It MAY project `persistentKuraNext`. Projecting is not committing.

### 15.2 Rollover

```
rolloverHour(...)
```

The **state transition authority**. Sequence, in order:

1. validate that `closedHour == referenceHour`, else reject;
2. evaluate the chart at `H`, **before** any commitment;
3. resolve the exact-hour `C_H`;
4. calculate fresh Kura from that evaluation;
5. apply decay **exactly once** for `H`;
6. commit `persistentKuraNext` into a **new** state;
7. advance `referenceHour` to `H + 1`;
8. evaluate the chart at `H + 1`, which sees the committed Kura.

Decay for an hour always uses that hour's own C, never the new hour's. A song's
balance never decays against activity it has not yet earned.

---

## 16. DETERMINISM AND PURITY

### 16.1 Determinism

The same valid input state plus the same valid input events MUST produce the same
result. This is verified by deterministic replay.

### 16.2 Forbidden inside engine mathematics

* `Date.now()`
* `new Date()`
* `performance.now()`
* `Math.random()`
* `localStorage`
* `globalThis`
* `fetch`
* Supabase
* production BORA imports
* React / UI imports
* Node / process runtime dependencies
* hidden mutable globals

These are enforced mechanically by the engine purity suite, not by convention.

---

## 17. TOLERANCE POLICY

The current numeric comparison tolerance is:

```
1e-9
```

Discrete quantities (`K`, `rank`, song identity) are compared **exactly**, with
no epsilon.

The former `1e-6` "extreme seed" tolerance is **RETIRED**. It must not be
resurrected or advertised as current contract. Its premise — that unbounded seed
values made the arithmetic ill-conditioned — expired when seed C was bounded to
`[0, C_MAX]`.

A tolerance is never widened to make a run pass. A new tolerance may be introduced
only through a verified contract change under section 26.

---

## 18. VERIFICATION BASELINE

Evidence recorded at freeze, taken from the repository at baseline.

| Evidence | Result |
|---|---|
| Ordinary test suite | **954 / 954** passing |
| Test files | 27 suites, 234 test cases, 0 failures |
| Typecheck (`tsc -b`) | clean |
| Engine purity | 18 assertions passing |
| Reference-model purity | 7 / 7 |
| Conformance (C1-C11, D-001, D-002) | 84 / 84 |
| Metamorphic (P1-P15) | 22 / 22 |
| Deterministic replay | verified, byte-identical across runs |
| Endurance | 20 / 20 |
| Attack / architecture guards | passing |
| Traceability reconciliation | R-01 .. R-54, bidirectional, no unresolved gap |
| Seed-domain boundary | boundary matrix verified across evaluation, rollover, and reference |
| Dependencies | unchanged |

Verification was executed **twice** at freeze with identical results.

### 18.1 Mutation testing

Mutation testing remains **inconclusive**. Stryker produced false survivor
classifications caused by interaction between the project's architecture guards
and its instrumentation. Genuine equivalent mutants and false tooling survivors
were both observed.

**No claim of 100% mutation coverage is made, and none is supported.** The
meaningful evidence is the deterministic, property, adversarial, endurance,
replay, differential, and reconciliation evidence above.

---

## 19. INDEPENDENT REFERENCE MODEL

```
src/verification/reference/**
```

### 19.1 Role

An **independent conformance oracle**: a second, deliberately naive
implementation of this same written contract, used to compare the engine's
behaviour against an independent reading of the specification.

### 19.2 Rules

* **No production-engine imports.** Enforced mechanically, not by convention.
* **Constants are transcribed independently**, longhand, not imported from
  `src/engine/constants.ts`.
* **Formulas are implemented independently.**
* Agreement is established **through conformance tests**, not by shared code.
* It is **not** the production implementation.
* It **must not** silently become a mirror of production internals.

At baseline the reference model's only imports are intra-reference
(`./contract`, `./types`, `./model`). It has zero production imports.

### 19.3 Conformance coverage

Conformance suites C1 through C11 cover: thresholds, windowing, seed,
distribution, persistent Kura, platform, score, ranking, lifecycle, whole-chart,
and rollover. D-001 and D-002 pin the two ratified discrepancy findings.

---

## 20. TRACEABILITY BASELINE

The Phase 23 reconciliation produced a bidirectional traceability audit covering
requirements **R-01 through R-54**, each mapped to:

* an implementation location;
* a verification location;
* a reference-model counterpart where applicable.

No unresolved mathematical requirement gap remains, and no normative orphan
behaviour remains.

The full matrix is recorded in `PHASE-23-RECONCILIATION.md`.

---

## 21. DEFERRED ITEM: R-41

**R-41 / Contract 5 transition timing is DEFERRED.**

`TRANSITION_MINUTES` and `TRANSITION_MS` exist in `src/engine/constants.ts` but
have **no behavioural consumers**. The constant governs event routing, which
belongs to the future simulation / integration layer.

* This is **not** a mathematical inconsistency in Engine V1.
* It **must** be resolved before production integration, if that integration
  requires the transition timing contract.
* It is deliberately **not** solved in this phase, and deliberately **not**
  deleted to make the freeze look cleaner.

---

## 22. QUARANTINED LEGACY

The following machinery is intentionally retained. It is **not** part of the
normative production mathematical contract.

| Symbol | Location | Status |
|---|---|---|
| `createSeedRunway` | `rollover/rollover.ts` | Harness constructor; zero production callers |
| `seedCPerHour` | `seed/seed.ts` | Fixture constructor; zero production callers |
| `seedHourlyRunway` | `seed/seed.ts` | Fixture constructor; zero production callers |
| `externalStrength` | `seed/external.ts` | Quarantined; computes a retired target share |
| `externalStrengthToTargetShare` | `seed/external.ts` | Quarantined |
| `targetShareFromExternal` | `seed/external.ts` | Quarantined |
| `EXTERNAL_WEIGHTS` | `constants.ts` | Weight-identity audit only |
| `evaluateActiveDistribution` | `kura/distribution.ts` | Equivalence oracle only |
| `EPSILON_SEED` | `constants.ts` | Retired tolerance; zero real callers |
| `expectSeedClose` | `testing/compare.ts` | Quarantined helper; zero callers |
| `REF_TOLERANCE_EXTREME_SEED` | `reference/contract.ts` | Retired tolerance |

Status rules:

* Retained for **audit, history, and legacy tests** where applicable.
* **Zero production callers** where established.
* **No new call sites are permitted.**
* Future cleanup **may** remove them once the audit trail is no longer needed.

This phase is a freeze, not a cleanup crusade. Nothing above was deleted.

---

## 23. EXPLICIT NON-GOALS

Engine Specification V1 does **not** define:

* production UI;
* voting authentication;
* anti-fraud systems;
* user identity;
* platform API ingestion;
* external platform scraping;
* AI seed assessment itself;
* business monetization;
* chart presentation;
* mobile application behaviour;
* production database schema;
* event transport implementation;
* Supabase integration;
* production migration strategy;
* real-world Billboard licensing or compliance issues.

These belong to later systems.

---

## 24. POST-V1 PROPOSALS

Any genuinely new mathematical improvement discovered after this baseline is
recorded as a **post-V1 proposal**. It is **not** implemented in V1, and the
engine is **not** altered to accommodate it.

No post-V1 proposal was created during Phase 24.

---

## 25. ERROR BEHAVIOUR

The engine rejects rather than coerces. Across all subsystems:

* an invalid numeric input is **rejected**, never clamped or zeroed;
* a corrupt count is never coerced into a plausible-looking C;
* a rejected operation does not partially mutate state;
* errors carry a stable code (for example `INVALID_MEASUREMENT`,
  `INVALID_K`, `INVALID_SONG_ID`, `DUPLICATE_HOUR_INDEX`,
  `ILLEGAL_LIFECYCLE_OPERATION`, `UNKNOWN_SONG`).

---

## 26. CHANGE CONTROL AFTER FREEZE

### 26.1 What does NOT require a specification revision

* A comment fix that changes no behaviour.
* A documentation clarification that changes no behaviour.
* Adding tests for existing behaviour.
* Formatting.

### 26.2 What DOES require a controlled revision

A change to any of the following requires the full process:

* a formula;
* a numeric domain or bound;
* a precedence rule;
* a state transition;
* a ranking rule;
* a decay rule;
* a seed rule or seed domain;
* a lifecycle rule;
* a constant used in the mathematics.

### 26.3 The controlled revision process

1. Change proposal.
2. Reason for the change.
3. Affected contract requirements (R-IDs).
4. Impact analysis.
5. Implementation changes.
6. Reference-model update — the oracle must be updated **independently**.
7. Verification update.
8. Regression suite.
9. Traceability update.
10. New specification revision (V1.1, V2.0, ...).
11. Explicit approval before it becomes the new baseline.

The purpose is to prevent **accidental mathematical drift**. This is deliberately
minimal; no bureaucracy is introduced beyond what prevents drift.

---

## 27. ACCEPTANCE CRITERIA FOR THIS BASELINE

This specification is BASELINED because:

* every normative requirement maps to an implementation;
* every normative requirement maps to verification;
* every normative requirement maps to reference behaviour where applicable;
* the full test suite passes, twice, identically;
* typecheck is clean;
* purity, reference purity, conformance, metamorphic, endurance, and replay pass;
* no known regression exists;
* the reference model remains independent;
* no retired rule is presented as current contract.

---

END OF BORA ENGINE SPECIFICATION V1
