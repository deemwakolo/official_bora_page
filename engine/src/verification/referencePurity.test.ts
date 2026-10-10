/**
 * BORA - PHASE 21 REFERENCE MODEL PURITY AND INDEPENDENCE
 * =============================================================
 *
 * Phase 21 section 26 and section 5, enforced mechanically.
 *
 * The independence of the reference model is not a convention anyone is asked
 * to respect - it is a set of properties this file checks on every run:
 *
 *   1. PURITY      the model contains no clock, no randomness, no globals, no
 *                  network, no filesystem, no storage, no React.
 *   2. ISOLATION   no file under src/verification/reference/ imports anything
 *                  from src/engine, src/sim, or src/testing.
 *   3. NO WRAPPERS the model never calls the production mathematical entry
 *                  points it is supposed to be checking.
 *
 * Property 3 deserves emphasis. An oracle that calls `distributeActiveC` is not
 * an oracle; it is a second test wrapper around one implementation, and every
 * bug it shares with that implementation is invisible to it. The check below is
 * what stops the reference model from quietly degrading into that.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const REFERENCE_DIR = join(process.cwd(), 'src', 'verification', 'reference');

function referenceFiles(): string[] {
  return readdirSync(REFERENCE_DIR)
    .filter((f) => f.endsWith('.ts'))
    .map((f) => join(REFERENCE_DIR, f));
}

function sourceOf(file: string): string {
  return readFileSync(file, 'utf8');
}

/** Strip comments and blank lines so documentation cannot mask real code. */
function codeOnly(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .filter((line) => !/^\s*\/\//.test(line))
    .join('\n');
}

describe('reference model purity', () => {
  it('finds the reference model files', () => {
    expect(referenceFiles().length).toBeGreaterThanOrEqual(4);
  });

  it('contains no clock, randomness, or global state', () => {
    const banned: Array<[string, RegExp]> = [
      ['Date.now', /\bDate\s*\.\s*now\s*\(/],
      ['new Date', /\bnew\s+Date\s*\(/],
      ['performance.now', /\bperformance\s*\.\s*now\s*\(/],
      ['Math.random', /\bMath\s*\.\s*random\s*\(/],
      ['globalThis', /\bglobalThis\b/],
      ['window', /\bwindow\s*\./],
      ['process', /\bprocess\s*\./],
    ];
    for (const file of referenceFiles()) {
      const code = codeOnly(sourceOf(file));
      for (const [label, pattern] of banned) {
        expect(pattern.test(code), `${label} found in ${file}`).toBe(false);
      }
    }
  });

  it('contains no storage, network, filesystem, or database access', () => {
    const banned = [
      'localStorage', 'sessionStorage', 'indexedDB',
      'fetch(', 'XMLHttpRequest', 'WebSocket',
      'require(', 'node:fs', 'readFile', 'writeFile',
      'supabase', 'createClient',
    ];
    for (const file of referenceFiles()) {
      const code = codeOnly(sourceOf(file));
      for (const token of banned) {
        expect(code, `${token} found in ${file}`).not.toContain(token);
      }
    }
  });

  it('imports no React or UI code', () => {
    for (const file of referenceFiles()) {
      const code = codeOnly(sourceOf(file));
      expect(code, `react import in ${file}`).not.toContain('react');
      expect(code, `jsx pragma in ${file}`).not.toContain('jsx');
    }
  });

  it('imports nothing from the production engine', () => {
    for (const file of referenceFiles()) {
      const source = sourceOf(file);
      const imports = source.match(/from\s+['"][^'"]+['"]/g) ?? [];
      for (const statement of imports) {
        expect(statement, `production import in ${file}: ${statement}`)
          .not.toMatch(/engine/);
        expect(statement, `simulation import in ${file}: ${statement}`)
          .not.toMatch(/\.\.\/sim/);
        expect(statement, `testing import in ${file}: ${statement}`)
          .not.toMatch(/testing/);
      }
      expect(source, `engine path in ${file}`).not.toContain('../../engine');
    }
  });

  it('never calls a production mathematical function', () => {
    const forbidden = [
      'calculateHourlyC',
      'sumActiveC',
      'getActiveWindow',
      'distributeActiveC',
      'evaluateActiveDistribution',
      'updatePersistentKura',
      'calculateDecay',
      'evaluatePlatformPoints',
      'normalizePlatform',
      'calculateBoraScore',
      'rankSongs',
      'evaluateChart',
      'rolloverHour',
      'createSeedRunway',
      'seedCPerHour',
      'addUpvotes',
      'addDownvotes',
    ];
    for (const file of referenceFiles()) {
      const code = codeOnly(sourceOf(file));
      for (const name of forbidden) {
        // A definition of the same name would also be a smell, but the
        // reference model deliberately uses the `ref` prefix everywhere, so a
        // bare call to any of these names is unambiguous.
        expect(code, `${name} called in ${file}`).not.toContain(`${name}(`);
      }
    }
  });

  it('re-exports nothing from the engine via a barrel', () => {
    for (const file of referenceFiles()) {
      const code = codeOnly(sourceOf(file));
      expect(code, `export * in ${file}`).not.toContain('export *');
    }
  });
});