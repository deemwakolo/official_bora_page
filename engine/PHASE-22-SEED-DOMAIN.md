# PHASE 22 -- BOUNDED SEED DOMAIN + VALIDATION UNIFICATION

**Result: PASS WITH REPAIR**

Resolves discrepancy **D-001** by human ruling. No formula, constant, window,
threshold, coefficient, ordering or lifecycle rule was changed.

---

## 1. THE RULING

```
CANONICAL SEEDED HOURLY C DOMAIN

    0 <= C_seed <= C_MAX          where C_MAX = 2
```

An explicit seeded hourly C is valid **iff** it is finite and lies in the closed
interval `[0, C_MAX]`. Seed C is supplied externally as an exact-hour value. The
engine does not derive seed values or seed profiles. Actual hourly C, including
`C = 0`, takes precedence over seed C for the same hour.

The domain is **continuous** on `[0, 2]`, not the five-point threshold lattice:

```
actual, vote-derived C  lies on  {0, 0.5, 1, 1.5, 2}
seeded C                may be ANY finite real in [0, 2]     e.g. 1.25
```

**Why the upper bound exists.** `D_h = 0.0025 * (1 - C_h / 2)` is negative
whenever `C_h > 2`, which would turn *decay* into *growth*. Bounding seed C by
the structural maximum hourly C of the activity model guarantees
`0 <= D_h <= 0.0025` for every accepted input, so the decay equation cannot
change species.

---

## 2. RESEARCH GATE

| Source | Finding | Effect on ruling |
|---|---|---|
| TC39 ECMA-262 / MDN `Number.isFinite` | Returns `true` only for finite numbers; `false` for `NaN`, `+-Infinity`, and non-numbers. `Number.MAX_VALUE` **is** finite. | Confirms the rule needs the `<= C_MAX` clause separately; finiteness alone cannot bound the domain. |
| IEEE-754 binary64 (ulp / binade structure) | `Number.EPSILON` is 2^-52, the ulp of `[1, 2)`. The ulp **at** 2.0 is 2^-51 because 2.0 opens binade `[2, 4)`. | **`2 + Number.EPSILON === 2` exactly.** "Just above C_MAX" must be `2 + 2*EPSILON`. |
| IEEE-754 round-half-to-even | Half-an-ulp ties resolve to the even significand, i.e. downward to 2.0. | Proves the prior `2 + EPSILON` probe tested the boundary itself and asserted nothing. |
| Contract-validation / invariant literature | Domain constraints are enforced at the boundary, once, with one authority; bounded state variables require the bound to be a precondition of the recurrence, not an emergent artefact. | Supports replacing the emergent `MAX_VALUE/72` bound with a stated `[0, C_MAX]` precondition. |

**Was the ruling challenged?** No contradiction found. The ruling is
mathematically coherent, implementable, and consistent with the locked decay
equation. One implementation-level correction was found and applied (the
epsilon probe above); it does not affect the ruling.

---

## 3. WHAT CHANGED

| Item | Before | After |
|---|---|---|
| Seed validity gate | `seedCPerHour(record.c * 72)` -- round-trip through a scalar | `validateSeededHourlyC(record.c)` -- direct |
| Chart evaluation (`chart.ts`) | own round-trip call | calls the authority |
| Rollover (`rollover.ts`) | returned `record.c` **unchecked** | calls the same authority |
| Reference model | no seed domain check | own independent `refSeededHourlyCAccepts` |
| Extreme-seed tolerance | `1e-6` exemption | **retired**; `1e-9` everywhere |
| Fixture total | unbounded | bounded at `72 * C_MAX = 144` |

The `x 72` round trip was removed because it is not an identity at the top of
the double range -- `(MAX_VALUE / 72) * 72` is `Infinity` -- so it imposed an
artificial boundary at ~2.5e306 that appeared nowhere in the contract.

---

## 4. BOUNDARY MATRIX (verified)

| Value | Verdict |
|---|---|
| `0` | ACCEPT |
| `Number.MIN_VALUE` (5e-324) | ACCEPT |
| `1e-12` | ACCEPT |
| `0.5` | ACCEPT |
| `1` | ACCEPT |
| `1.25` (decimal, off-lattice) | ACCEPT |
| `1.5` | ACCEPT |
| `2` (`C_MAX`) | ACCEPT |
| `2 + 2*EPSILON` (2.0000000000000004) | REJECT |
| `2 + Number.EPSILON` (**=== 2**) | ACCEPT -- it IS 2 |
| `2.0000001` | REJECT |
| `7.5` | REJECT |
| `Number.MAX_VALUE` | REJECT (exceeds `C_MAX`) |
| `-Number.MIN_VALUE` | REJECT |
| `-1e-12`, `-2` | REJECT |
| `NaN` | REJECT |
| `+Infinity` | REJECT |
| `-Infinity` | REJECT |

Every row is asserted identically in **evaluation**, **rollover**, and the
**reference model**. There is no split-brain verdict at any value.

---

## 5. DECAY INVARIANT

For every accepted seed: `0 <= D_h <= 0.0025`.

- `C = 0` -> `D_h = 0.0025` exactly
- `C = 2` -> `D_h = 0` exactly
- Verified against the engine's own `calculateDecay` across 2001 samples and
  against `refDecayRate` across 1000 samples including off-lattice jitter.

---

## 6. REPAIRS MADE IN PHASE 22

The implementation arrived with stale tests from the pre-ruling era:

1. **`seed.test.ts`** -- `2 + Number.EPSILON` was listed as "just above
   `C_MAX`". It equals 2. Replaced with `2 + 2*EPSILON`, with the binade
   reasoning recorded at the call site.
2. **`math.test.ts`** -- asserted `seedCPerHour(1e12)` was valid. Under the
   bounded domain the fixture total caps at 144; updated to the bound.
3. **`chart.test.ts`** -- the architecture guard still required chart to call
   `seedCPerHour(`. Updated to `validateSeededHourlyC(`.
4. **`conformance.test.ts`** -- the entire D-001 block pinned the *old*
   unbounded behaviour (1e300 accepted; chart/rollover split). Replaced with
   tests asserting the ruled domain.
5. **`contract.ts` / tolerance policy** -- retired the 1e-6 extreme-seed
   exemption.

---

## 7. SOURCE INTEGRITY

7 files changed. **No unrelated mathematical module was touched.**

```
src/engine/evaluation/chart.ts       comment only
src/engine/evaluation/chart.test.ts  architecture guard
src/engine/seed/seed.test.ts         boundary matrix
src/sim/attack/math.test.ts          fixture-total bound
src/verification/conformance.test.ts D-001 block replaced
src/verification/metamorphic.test.ts P13-P15 added
src/verification/reference/contract.ts tolerance retired
```

Unchanged and verified by MD5: `k.ts`, `bucket.ts`, `threshold.ts`, `window/`,
`distribution/`, `persistent/`, `platform/`, `score/`, `ranking/`,
`lifecycle/`, `rollover/`, `seed/seed.ts`, `reference/model.ts`.

---

## 8. TRACEABILITY

```
D-001 ruling (seed C in [0, C_MAX])
  -> src/engine/seed/seed.ts :: validateSeededHourlyC     (production authority)
  -> src/engine/evaluation/chart.ts                        (evaluation calls it)
  -> src/engine/rollover/rollover.ts                       (rollover calls it)
  -> src/verification/reference/model.ts :: refSeededHourlyCAccepts  (independent)
  -> src/engine/seed/seed.test.ts :: S-22                  (boundary matrix)
  -> src/verification/conformance.test.ts :: D-001         (three-way agreement)
  -> src/verification/metamorphic.test.ts :: P13/P14/P15   (properties)
```

---

## 9. LEGACY

No scalar seed-generation pathway participates in production evaluation.
`seedCPerHour` and `seedHourlyRunway` remain TEST/HARNESS FIXTURE constructors
and are unreachable from `chart.ts`. `externalStrength`,
`externalStrengthToTargetShare`, `targetShareFromExternal` and `EXTERNAL_WEIGHTS`
remain quarantined and unused by any production path.

Reference model independence verified: it imports only `./contract`, `./types`
and `./model` -- zero production imports.

---

## 10. FINAL VERIFICATION

```
tests        954 / 954        (Phase 21: 931; +23 new)
typecheck    clean
purity       18 / 18
sim purity   included
reference    7 / 7
attack       included
endurance    20 / 20
replay       included
conformance  84 / 84
metamorphic  22 / 22
deps         unchanged (no package.json change)
```

Run twice with identical results.

---

## 11. RECOMMENDATION

**READY FOR PHASE 23.**

The engine now has one coherent, independently verified interpretation of the
seed domain. D-001 and D-002 are both closed.
