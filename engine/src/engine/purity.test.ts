/**
 * BORA Engine — ARCHITECTURE GUARD (purity enforcement)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This test converts the project's central architectural rule from a
 * convention into a mechanically enforced invariant.
 *
 *   src/engine/** must be PURE:
 *     · no real clock            (Date.now, new Date, performance.now)
 *     · no randomness            (Math.random) — determinism (Contract 45)
 *     · no ambient state         (localStorage, sessionStorage, globalThis)
 *     · no network               (fetch, XMLHttpRequest)
 *     · no Supabase / production BORA imports
 *     · no dependency on sim/ui  (the engine must not import the stateful layer)
 *
 * Rationale: Phase 3 requires the engine to depend on a deterministic
 * simulated clock, and Phase 45 requires property tests to be reproducible.
 * A single `Date.now()` inside the engine would silently break both, and would
 * be invisible in review. This guard makes that failure loud instead.
 *
 * It also protects Gate 0: nothing in the laboratory may reach the network or
 * a production database, so an accidental import fails here rather than at
 * runtime.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ENGINE_DIR = fileURLToPath(new URL('.', import.meta.url));

/**
 * Recursively collect every engine .ts file EXCEPT test files.
 *
 * Test files are excluded deliberately: the guard's own source necessarily
 * imports `node:fs` to perform the scan, and including it would make the guard
 * fail on itself. The invariant under test applies to shipped engine code.
 */
function collectSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry.endsWith('.test.ts') || entry.endsWith('.test.tsx')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectSourceFiles(full));
    } else if (/\.tsx?$/.test(entry) && !entry.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Strip comments and string/template literals so that a banned identifier
 * mentioned in a doc comment (e.g. "never call Date.now() here") is not
 * reported as a violation. Only executable code is scanned.
 */
function stripCommentsAndStrings(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ') // block comments
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ') // line comments
    .replace(/`(?:\\.|[^`\\])*`/g, '""') // template literals
    .replace(/'(?:\\.|[^'\\\n])*'/g, '""') // single-quoted strings
    .replace(/"(?:\\.|[^"\\\n])*"/g, '""'); // double-quoted strings
}

const files = collectSourceFiles(ENGINE_DIR);

const codeOf = (file: string) =>
  stripCommentsAndStrings(readFileSync(file, 'utf8'));

const rel = (file: string) => relative(ENGINE_DIR, file).split(sep).join('/');

describe('engine purity guard', () => {
  it('finds engine source files to scan', () => {
    // A silent empty scan would make every assertion below vacuously pass.
    expect(files.length).toBeGreaterThan(0);
    expect(files.map(rel)).toContain('constants.ts');
    expect(files.map(rel)).toContain('types.ts');
  });

  const banned: Array<[label: string, pattern: RegExp]> = [
    ['real clock (Date.now)', /\bDate\s*\.\s*now\b/],
    ['real clock (new Date)', /\bnew\s+Date\b/],
    ['real clock (performance.now)', /\bperformance\s*\.\s*now\b/],
    ['real clock (hrtime)', /\bhrtime\b/],
    ['randomness (Math.random)', /\bMath\s*\.\s*random\b/],
    ['ambient storage (localStorage)', /\blocalStorage\b/],
    ['ambient storage (sessionStorage)', /\bsessionStorage\b/],
    ['globalThis state', /\bglobalThis\b/],
    ['network (fetch)', /\bfetch\s*\(/],
    ['network (XMLHttpRequest)', /\bXMLHttpRequest\b/],
    ['Supabase import', /from\s+['"][^'"]*supabase/i],
    ['production BORA import', /from\s+['"][^'"]*(bora-?prod|production)/i],
    ['engine process access', /\bprocess\s*\./],
  ];

  for (const [label, pattern] of banned) {
    it(`engine contains no ${label}`, () => {
      const violations = files
        .filter((f) => pattern.test(codeOf(f)))
        .map((f) => rel(f));
      expect(violations, `found ${label} in: ${violations.join(', ')}`).toEqual([]);
    });
  }

  it('engine never imports from the stateful sim layer', () => {
    const violations = files
      .filter((f) => /from\s+['"][^'"]*\/sim\//.test(codeOf(f)))
      .map((f) => rel(f));
    expect(violations, `engine must not import sim/: ${violations.join(', ')}`).toEqual([]);
  });

  it('engine never imports from the UI layer', () => {
    const violations = files
      .filter((f) => /from\s+['"][^'"]*\/ui\//.test(codeOf(f)))
      .map((f) => rel(f));
    expect(violations, `engine must not import ui/: ${violations.join(', ')}`).toEqual([]);
  });

  it('engine never imports React', () => {
    const violations = files
      .filter((f) => /from\s+['"]react/.test(codeOf(f)))
      .map((f) => rel(f));
    expect(violations, `engine must stay React-free: ${violations.join(', ')}`).toEqual([]);
  });

  it('engine does not import node built-ins (it must run anywhere)', () => {
    // node: imports are stripped from string literals, so this checks the
    // module specifier itself via the raw source.
    const violations = files
      .filter((f) => /from\s+['"]node:/.test(readFileSync(f, 'utf8')))
      .map((f) => rel(f));
    expect(violations, `engine must not use node built-ins: ${violations.join(', ')}`).toEqual([]);
  });
});
