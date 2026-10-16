/**
 * T2/T3 — Transition-constant integration contract
 * (PHASE-TRANSITION-CONSTANT-API-AUDIT.md §5).
 *
 * STRUCTURAL tests over source text: they pin the import path, the boundary
 * expression, and the DB/app 600-second correspondence. They do NOT execute
 * the consumers or PostgreSQL; behavioural eligibility tests remain deferred
 * until a harness includes `lib/`.
 */
import { describe, expect, it } from 'vitest';
import {
  MINUTE_MS,
  TRANSITION_MINUTES,
  TRANSITION_MS,
} from './constants';

async function readRepoFile(relFromRepoRoot: string): Promise<string> {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  return readFileSync(
    fileURLToPath(new URL(`../../../${relFromRepoRoot}`, import.meta.url)),
    'utf8',
  );
}

/** Strip block and line comments so documentation cannot trip scans. */
function stripTsComments(raw: string): string {
  return raw
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:'"])\/\/[^\n]*/g, '$1 ');
}

/** Strip SQL block and line comments so documentation cannot trip scans. */
function stripSqlComments(raw: string): string {
  return raw
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ');
}

const CONSUMERS = [
  'lib/bora-engine/hour-entry.ts',
  'lib/bora-engine/hourly-runner.ts',
  'lib/bora-engine/source-readiness.ts',
] as const;

describe('T2: lib consumers import the transition constant through the engine constants module', () => {
  for (const rel of CONSUMERS) {
    it(`${rel} imports TRANSITION_MS from engine constants`, async () => {
      const src = stripTsComments(await readRepoFile(rel));
      expect(src).toMatch(
        /import\s*\{[^}]*\bTRANSITION_MS\b[^}]*\}\s*from\s*'\.\.\/\.\.\/engine\/src\/engine\/constants'/,
      );
    });

    it(`${rel} computes the boundary as (hour + 1) * HOUR_MS + TRANSITION_MS`, async () => {
      const src = stripTsComments(await readRepoFile(rel));
      expect(src).toContain('+ 1) * HOUR_MS + TRANSITION_MS');
      expect(src).toContain('Number.isSafeInteger(eligibleAtMs)');
    });

    it(`${rel} does not inline the 600,000 ms literal`, async () => {
      const src = await readRepoFile(rel);
      expect(src).not.toMatch(/600[,_]000/);
    });
  }
});

describe('T3: migration 0014 encodes the same boundary as 600 seconds', () => {
  it('TRANSITION_MINUTES * 60 equals the SQL literal 600', () => {
    expect(TRANSITION_MINUTES * 60).toBe(600);
    expect(TRANSITION_MS).toBe(TRANSITION_MINUTES * MINUTE_MS);
  });

  it('claim_hour still contains the (hour + 1) * 3600 + 600 eligibility instant', async () => {
    const raw = await readRepoFile(
      'supabase/migrations/0014_bora_engine_hourly_atomic_operations.sql',
    );
    const sql = stripSqlComments(raw);
    const start = sql.indexOf(
      'create function public.bora_engine_claim_hour(',
    );
    expect(start, 'claim_hour function not found').toBeGreaterThan(-1);
    const end = sql.indexOf('$$;', start);
    expect(end, 'claim_hour closing dollar-quote not found').toBeGreaterThan(
      start,
    );
    expect(sql.slice(start, end)).toMatch(/\* 3600 \+ 600/);
  });
});
