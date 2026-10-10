/**
 * BORA Engine — lifecycle tests (Phase 13)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Coverage map:
 *   L-I  initial state
 *   L-V  vault: retains K, persistent Kura, history
 *   L-R  restore: resets persistent Kura, retains K + history, no seed
 *   L-T  the historical-retention contract (Vault ≠ deletion)
 *   L-N  invalid transitions rejected
 *   L-X  validation
 *   L-P  determinism, immutability, property tests
 *   L-G  structural: no clock, no seed, no evaluation
 */

import { describe, it, expect } from 'vitest';
import {
  createActiveSong,
  vaultSong,
  restoreSong,
} from './lifecycle';
import type { LifecycleState } from './lifecycle';
import type { Result, EngineError } from '../types';

/** The Phase 13 contract example: K=123, persistentKura=42.5, history. */
function contractSong(): LifecycleState {
  return {
    songId: 'song-1',
    lifecycle: 'ACTIVE',
    k: 123,
    persistentKura: 42.5,
    history: [
      { hour: 1, c: 2, source: 'ACTUAL' },
      { hour: 2, c: 1.5, source: 'ACTUAL' },
      { hour: 3, c: 1, source: 'SEED' },
    ],
  };
}

function ok<T>(r: Result<T, EngineError>): T {
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
}

function vaulted(state: LifecycleState): LifecycleState {
  return ok(vaultSong(state)).song;
}

function errOf<T>(r: Result<T, EngineError>): string {
  if (r.ok) throw new Error('expected rejection');
  return r.error.code;
}

/** Deterministic generator — no Math.random in the suite. */
function makeRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

// ───────────────────────────────────────────────────────────────────────────

describe('L-I: a new song starts ACTIVE', () => {
  it('creates an ACTIVE state with zeroed defaults', () => {
    const s = ok(createActiveSong('new-song'));
    expect(s.lifecycle).toBe('ACTIVE');
    expect(s.k).toBe(0);
    expect(s.persistentKura).toBe(0);
    expect(s.history).toEqual([]);
  });

  it('accepts explicit starting values', () => {
    const s = ok(createActiveSong('s', 10, 5, [{ hour: 1 }]));
    expect(s.k).toBe(10);
    expect(s.persistentKura).toBe(5);
    expect(s.history).toHaveLength(1);
  });
});

describe('L-V: vault retains everything', () => {
  it('transitions ACTIVE → VAULT', () => {
    const t = ok(vaultSong(contractSong()));
    expect(t.song.lifecycle).toBe('VAULT');
    expect(t.transition).toBe('VAULTED');
  });

  it('retains K unchanged', () => {
    expect(vaulted(contractSong()).k).toBe(123);
  });

  it('retains persistent Kura — does NOT zero it', () => {
    // A Vaulted song is dormant, not erased. A8: no hidden decay while dead.
    expect(vaulted(contractSong()).persistentKura).toBe(42.5);
  });

  it('retains historical data', () => {
    expect(vaulted(contractSong()).history).toHaveLength(3);
  });

  it('preserves song identity', () => {
    expect(vaulted(contractSong()).songId).toBe('song-1');
  });

  it('reports no persistent-Kura reset on vault', () => {
    const t = ok(vaultSong(contractSong()));
    expect(t.persistentKuraReset).toBe(false);
  });

  it('does not mutate the input state', () => {
    const input = contractSong();
    const snapshot = JSON.stringify(input);
    vaultSong(input);
    expect(JSON.stringify(input)).toBe(snapshot);
    expect(input.lifecycle).toBe('ACTIVE');
  });
});

describe('L-R: restore rewinds active score but never history', () => {
  const vaultedState = vaulted(contractSong());

  it('transitions VAULT → ACTIVE', () => {
    const t = ok(restoreSong(vaultedState));
    expect(t.song.lifecycle).toBe('ACTIVE');
    expect(t.transition).toBe('RESTORED');
  });

  it('resets persistent Kura to EXACTLY 0', () => {
    expect(ok(restoreSong(vaultedState)).song.persistentKura).toBe(0);
  });

  it('keeps K exactly unchanged', () => {
    expect(ok(restoreSong(vaultedState)).song.k).toBe(123);
  });

  it('keeps historical data unchanged', () => {
    expect(ok(restoreSong(vaultedState)).song.history).toHaveLength(3);
    expect(ok(restoreSong(vaultedState)).song.history).toEqual(
      contractSong().history,
    );
  });

  it('preserves song identity — restore is not a new song', () => {
    expect(ok(restoreSong(vaultedState)).song.songId).toBe('song-1');
  });

  it('reports the persistent-Kura reset explicitly', () => {
    expect(ok(restoreSong(vaultedState)).persistentKuraReset).toBe(true);
  });

  it('does NOT create a seed', () => {
    expect(ok(restoreSong(vaultedState)).seedCreated).toBe(false);
  });

  it('does not mutate the input state', () => {
    const snapshot = JSON.stringify(vaultedState);
    restoreSong(vaultedState);
    expect(JSON.stringify(vaultedState)).toBe(snapshot);
    expect(vaultedState.lifecycle).toBe('VAULT');
    expect(vaultedState.persistentKura).toBe(42.5);
  });
});

describe('L-T: the historical-retention contract (Vault ≠ deletion)', () => {
  it('retains K, persistent Kura, and history through vault', () => {
    const before = contractSong();
    const after = vaulted(before);

    expect(before.k).toBe(123);
    expect(before.persistentKura).toBe(42.5);
    expect(before.history).toHaveLength(3);

    expect(after.k).toBe(123);
    expect(after.persistentKura).toBe(42.5);
    expect(after.history).toHaveLength(3);
    expect(after.lifecycle).toBe('VAULT');
  });

  it('resets only persistent Kura through restore', () => {
    const after = ok(restoreSong(vaulted(contractSong()))).song;

    expect(after.k).toBe(123);
    expect(after.persistentKura).toBe(0);
    expect(after.history).toHaveLength(3);
    expect(after.lifecycle).toBe('ACTIVE');
  });

  it('completes ACTIVE → VAULT → ACTIVE with K and history intact', () => {
    const original = contractSong();
    const restored = ok(restoreSong(vaulted(original))).song;

    expect(restored.k).toBe(original.k);
    expect(restored.history).toEqual(original.history);
    expect(restored.persistentKura).toBe(0);
    expect(restored.lifecycle).toBe('ACTIVE');
  });

  it('preserves history by reference, never copying or filtering it', () => {
    const original = contractSong();
    const after = ok(restoreSong(vaulted(original))).song;
    // Same array identity: nothing was rebuilt or pruned along the way.
    expect(after.history).toBe(original.history);
  });
});

describe('L-N: invalid transitions are rejected', () => {
  it('rejects VAULT → VAULT (vaulting a Vaulted song)', () => {
    const v = vaulted(contractSong());
    expect(errOf(vaultSong(v))).toBe('ILLEGAL_LIFECYCLE_OPERATION');
  });

  it('rejects ACTIVE → ACTIVE (restoring an Active song)', () => {
    expect(errOf(restoreSong(contractSong()))).toBe(
      'ILLEGAL_LIFECYCLE_OPERATION',
    );
  });

  it('rejects a double-vault instead of silently succeeding', () => {
    // A repeated event handler must surface as an error, not a no-op success.
    const once = vaulted(contractSong());
    const twice = vaultSong(once);
    expect(twice.ok).toBe(false);
    expect('value' in twice).toBe(false);
  });

  it('rejects a double-restore instead of silently succeeding', () => {
    const restored = ok(restoreSong(vaulted(contractSong()))).song;
    expect(errOf(restoreSong(restored))).toBe('ILLEGAL_LIFECYCLE_OPERATION');
  });

  it('reuses the existing ILLEGAL_LIFECYCLE_OPERATION code', () => {
    // No new error code was invented for this; the Phase 1 contract already
    // defines one for exactly this meaning.
    const r = vaultSong(vaulted(contractSong()));
    if (r.ok) throw new Error('expected rejection');
    expect(r.error.code).toBe('ILLEGAL_LIFECYCLE_OPERATION');
  });
});

describe('L-X: validation', () => {
  it('rejects a negative K', () => {
    expect(errOf(vaultSong({ ...contractSong(), k: -1 }))).toBe('INVALID_K');
  });

  it('rejects a non-finite K', () => {
    expect(errOf(vaultSong({ ...contractSong(), k: Number.NaN }))).toBe(
      'INVALID_K',
    );
    expect(
      errOf(restoreSong({ ...contractSong(), lifecycle: 'VAULT', k: Infinity })),
    ).toBe('INVALID_K');
  });

  it('rejects a negative persistent Kura', () => {
    expect(errOf(vaultSong({ ...contractSong(), persistentKura: -0.5 }))).toBe(
      'INVALID_MEASUREMENT',
    );
  });

  it('rejects a non-finite persistent Kura', () => {
    expect(
      errOf(vaultSong({ ...contractSong(), persistentKura: Number.NaN })),
    ).toBe('INVALID_MEASUREMENT');
    expect(
      errOf(vaultSong({ ...contractSong(), persistentKura: Infinity })),
    ).toBe('INVALID_MEASUREMENT');
  });

  it('rejects an invalid lifecycle state', () => {
    const bad = { ...contractSong(), lifecycle: 'RETIRED' as never };
    expect(errOf(vaultSong(bad))).toBe('ILLEGAL_LIFECYCLE_OPERATION');
  });

  it('rejects an empty or missing songId', () => {
    expect(errOf(vaultSong({ ...contractSong(), songId: '' }))).toBe(
      'INVALID_SONG_ID',
    );
  });

  it('rejects a malformed history', () => {
    const bad = {
      ...contractSong(),
      history: 'not-an-array' as unknown as unknown[],
    };
    expect(errOf(vaultSong(bad))).toBe('INVALID_MEASUREMENT');
  });

  it('rejects invalid input in createActiveSong', () => {
    expect(errOf(createActiveSong(''))).toBe('INVALID_SONG_ID');
    expect(errOf(createActiveSong('s', -1))).toBe('INVALID_K');
    expect(errOf(createActiveSong('s', 0, Number.NaN))).toBe(
      'INVALID_MEASUREMENT',
    );
  });

  it('never coerces an invalid value to zero', () => {
    const r = vaultSong({ ...contractSong(), persistentKura: Number.NaN });
    expect(r.ok).toBe(false);
    expect('value' in r).toBe(false);
  });
});

describe('L-P: determinism, immutability, and property tests', () => {
  it('is deterministic: same input + same operation = identical result', () => {
    const s = contractSong();
    const first = ok(vaultSong(s));
    for (let i = 0; i < 10; i++) {
      expect(ok(vaultSong(s))).toEqual(first);
    }
  });

  it('leaves nested historical records untouched', () => {
    const history = [
      { hour: 1, nested: { deep: [1, 2, 3] } },
      { hour: 2, nested: { deep: [4, 5, 6] } },
    ];
    const state: LifecycleState = {
      songId: 's',
      lifecycle: 'ACTIVE',
      k: 5,
      persistentKura: 1,
      history,
    };
    const snapshot = JSON.stringify(history);

    vaultSong(state);
    restoreSong(vaulted(state));

    expect(JSON.stringify(history)).toBe(snapshot);
    expect(history[0]).toEqual({ hour: 1, nested: { deep: [1, 2, 3] } });
  });

  it('returns a new state object, never the input reference', () => {
    const s = contractSong();
    const result = ok(vaultSong(s));
    expect(result.song).not.toBe(s);
    expect(ok(restoreSong(vaulted(s))).song).not.toBe(s);
  });

  it('holds the transition invariants across generated states', () => {
    const rng = makeRng(31337);

    for (let i = 0; i < 300; i++) {
      const history = Array.from({ length: Math.floor(rng() * 5) }, (_, h) => ({
        hour: h,
        c: rng() * 2,
      }));
      const active: LifecycleState = {
        songId: `song-${i}`,
        lifecycle: 'ACTIVE',
        k: rng() * 1000,
        persistentKura: rng() * 100,
        history,
      };
      const snapshot = JSON.stringify(active);

      // vault: state flips, K and persistent Kura and history all retained.
      const v = ok(vaultSong(active));
      expect(v.song.lifecycle).toBe('VAULT');
      expect(v.song.k).toBe(active.k);
      expect(v.song.persistentKura).toBe(active.persistentKura);
      expect(v.song.history).toBe(active.history);

      // restore: state flips back, K and history retained, Kura zeroed.
      const r = ok(restoreSong(v.song));
      expect(r.song.lifecycle).toBe('ACTIVE');
      expect(r.song.k).toBe(active.k);
      expect(r.song.persistentKura).toBe(0);
      expect(r.song.history).toBe(active.history);

      // Input never mutated at any point.
      expect(JSON.stringify(active)).toBe(snapshot);
      expect(active.lifecycle).toBe('ACTIVE');
    }
  });

  it('rejects every invalid transition across generated states', () => {
    const rng = makeRng(24680);
    for (let i = 0; i < 100; i++) {
      const state: LifecycleState = {
        songId: `s${i}`,
        lifecycle: 'ACTIVE',
        k: Math.floor(rng() * 100),
        persistentKura: Math.floor(rng() * 10),
        history: [],
      };
      // ACTIVE → ACTIVE is never a transition.
      expect(restoreSong(state).ok).toBe(false);
      // VAULT → VAULT is never a transition.
      expect(vaultSong(vaulted(state)).ok).toBe(false);
    }
  });

  it('survives repeated ACTIVE → VAULT → ACTIVE cycles with stable K', () => {
    let state = ok(createActiveSong('cycler', 500, 25));
    for (let cycle = 0; cycle < 5; cycle++) {
      state = vaulted(state);
      expect(state.persistentKura).toBe(cycle === 0 ? 25 : 0);
      state = ok(restoreSong(state)).song;
      expect(state.lifecycle).toBe('ACTIVE');
      expect(state.k).toBe(500); // K never changes across cycles
      expect(state.persistentKura).toBe(0);
    }
  });
});

describe('L-G: structural boundaries', () => {
  async function sourceOf(file: string): Promise<string> {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    return readFileSync(
      fileURLToPath(new URL(file, import.meta.url)),
      'utf8',
    );
  }

  it('contains no clock, randomness, storage, or network', async () => {
    const code = (await sourceOf('./lifecycle.ts'))
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

    expect(code).not.toMatch(
      /\bDate\s*\.\s*now\b|\bnew\s+Date\b|\bperformance\s*\.\s*now\b/,
    );
    expect(code).not.toMatch(/\bMath\s*\.\s*random\b|\bfetch\s*\(/);
    expect(code).not.toMatch(/\bglobalThis\b|\blocalStorage\b/);
    expect(code).not.toMatch(/supabase/i);
  });

  it('does not import the seed module or any evaluation layer', async () => {
    // Comments are stripped: this file's own documentation discusses the seed
    // rule at length, and that prose must not fail the check. The word-boundary
    // patterns below then match only real identifiers.
    const code = (await sourceOf('./lifecycle.ts'))
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

    // No seed, ranking, score, platform, Kura, window, or votes maths.
    expect(code).not.toMatch(
      /from '\.\.\/(seed|ranking|score|platform|kura|window|votes)/,
    );
    expect(code).not.toMatch(
      /\bseedC\(|\bexternalStrength\(|\brankSongs\(|\bcalculateBoraScore\(|\bupdatePersistentKura\(|\bcalculateDecay\(|\bsumActiveC\(/,
    );
  });

  it('imports only the engine domain types', async () => {
    const code = await sourceOf('./lifecycle.ts');
    const statements = code.match(/import[\s\S]*?from\s+'[^']+'\s*;?/g) ?? [];
    const specifiers = statements.map(
      (s) => /from\s+'([^']+)'/.exec(s)?.[1] ?? '',
    );
    expect(specifiers).toEqual(['../types']);
  });

  it('exposes no seed-creating operation in its public API', async () => {
    const code = await sourceOf('./lifecycle.ts');
    const exported = code
      .split('\n')
      .filter((l) => /^export function/.test(l))
      .map((l) => /export function (\w+)/.exec(l)?.[1] ?? '')
      .sort();
    // Exactly the three documented operations — nothing that could seed.
    expect(exported).toEqual([
      'createActiveSong',
      'restoreSong',
      'vaultSong',
    ]);
    expect(exported.some((n) => /seed/i.test(n))).toBe(false);
  });

  it('reports seedCreated === false on every transition', () => {
    // Structural proof that restore never seeds, without importing the seed
    // module just to observe it.
    expect(ok(vaultSong(contractSong())).seedCreated).toBe(false);
    expect(ok(restoreSong(vaulted(contractSong()))).seedCreated).toBe(false);
  });
});