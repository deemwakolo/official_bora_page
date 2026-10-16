/**
 * T1 — Transition constant acceptance tests
 * (PHASE-TRANSITION-CONSTANT-API-AUDIT.md §5).
 *
 * Value and derivation pins for the Contract 5 transition boundary. These
 * are value pins, not behavioural tests: transition timing remains deferred
 * (R-41) and this file proves nothing about routing semantics.
 */
import { describe, expect, it } from 'vitest';
import {
  MINUTE_MS,
  TRANSITION_MINUTES,
  TRANSITION_MS,
} from './constants';

describe('T1: Contract 5 transition constants', () => {
  it('pins TRANSITION_MINUTES to 10 minutes', () => {
    expect(TRANSITION_MINUTES).toBe(10);
  });

  it('pins TRANSITION_MS to 600,000 milliseconds', () => {
    expect(TRANSITION_MS).toBe(600_000);
  });

  it('derives TRANSITION_MS from MINUTE_MS exactly', () => {
    expect(MINUTE_MS).toBe(60_000);
    expect(TRANSITION_MS).toBe(TRANSITION_MINUTES * MINUTE_MS);
  });

  it('is a whole number of minutes', () => {
    expect(TRANSITION_MS % MINUTE_MS).toBe(0);
  });
});
