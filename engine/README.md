# BORA Engine

An isolated, deterministic, independently verified implementation of the BORA
chart mathematics.

This repository is a **mathematical authority**, not an application. It has no
database, no UI, no network access, and no dependency on the production BORA
application. Production is intended to *consume* this engine, never to define
the mathematics.

---

## PIPELINE

```
REAL EVENTS
  -> hourly C                 (votes/threshold.ts)
  -> 72-hour active C         (window/hours.ts)
  -> XP                       (kura/distribution.ts)
  -> fresh Kura
  -> persistent Kura + decay  (kura/persistent.ts)
  -> platform points          (platform/*)
  -> BORA Score               (score/boraScore.ts)
  -> ranking                  (ranking/ranking.ts)
```

The engine does **not** assess popularity, scrape platforms, generate seed
values, or touch a database. It converts an explicit state into an explicit
result.

---

## CANONICAL CONTRACT

**[`BORA-ENGINE-SPEC-V1.md`](./BORA-ENGINE-SPEC-V1.md) is the normative contract (V1.0, BASELINED).**
It is the authoritative statement of the mathematics. Where any earlier document
disagrees with it, the specification governs.

Phase history, retained as the record of how the contract was reached:
[`PHASE-20R-RATIFICATION.md`](./PHASE-20R-RATIFICATION.md),
[`PHASE-21-VERIFICATION.md`](./PHASE-21-VERIFICATION.md),
[`PHASE-22-SEED-DOMAIN.md`](./PHASE-22-SEED-DOMAIN.md),
[`PHASE-23-RECONCILIATION.md`](./PHASE-23-RECONCILIATION.md),
[`PHASE-24-SPEC-FREEZE.md`](./PHASE-24-SPEC-FREEZE.md).

Changing the mathematics requires a controlled specification revision - see
section 26 of the specification.

### Headline rules

| Subject | Rule |
|---|---|
| K | Historical upvotes. Permanent, non-decaying. Excluded from BORA Score. Ranking tie-break #2. |
| Hourly C | `max(0, C_U - C_D)`; `C_MAX = 2`; actual values live on `{0, 0.5, 1, 1.5, 2}` |
| Active window | Exactly 72 clock-hours, `H-71 .. H`, inclusive of the current hour |
| XP | `C_i / T_C` over the active population; `T_C = 0` gives `XP = 0`, never NaN |
| Fresh Kura | `XP * 50` |
| Persistent Kura | `(persistent + fresh) * (1 - D_h)` — inject BEFORE decay |
| Decay | `D_h = 0.0025 * (1 - C_h / 2)`, from the just-closed hour, applied exactly once |
| Platform points | 7 clock-day windows; 30 / 15 / 5; normalized per platform; idle contributes zero; no redistribution |
| BORA Score | `persistentKura + youtube + spotify + boomplay`. **K excluded.** |
| Ranking | Score, then K, then platform performance, then songId UTF-16 ascending. Deterministic. |
| Seed | Supplied externally as exact-hour values, `0 <= C <= 2`. The engine never invents a seed. |
| Seed precedence | `ACTUAL > SEED > 0`. An actual `C = 0` still overrides a seed. |
| Rollover | Exactly one clock-hour per call. Pure evaluation never mutates state. |

---

## DETERMINISM

Engine mathematics are pure: no `Date.now()`, `new Date()`, `performance.now()`,
`Math.random()`, `localStorage`, `globalThis`, `fetch`, Supabase, React, or Node
runtime dependency. This is enforced mechanically by `src/engine/purity.test.ts`,
not by convention.

---

## VERIFICATION

| Layer | File | Purpose |
|---|---|---|
| Unit / contract | `src/engine/**/*.test.ts` | Per-subsystem contract tests |
| Simulation | `src/sim/**` | Scenarios, adversarial, property, endurance |
| Conformance | `src/verification/conformance.test.ts` | Engine vs an INDEPENDENT reference model |
| Metamorphic | `src/verification/metamorphic.test.ts` | Transformations that must not change the result |
| Reference purity | `src/verification/referencePurity.test.ts` | The oracle must not import the engine |

The reference model in `src/verification/reference/` is a deliberately separate
implementation of the same written contract. It imports nothing from
`src/engine`, and that independence is enforced by test — so agreement between
the two is evidence, not tautology.

```bash
npm test        # full suite
npm run typecheck
```

---

## STATUS

Phases 1-23 complete. The mathematical contract is internally consistent and
reconciled across documentation, implementation, tests, and reference model.

Production integration, shadow mode, differential production comparison, and
cutover have **not** begun.

---

## TECH

React + TypeScript + Vite, Vitest. React is present only as scaffolding from the
project template; the engine imports no UI.
