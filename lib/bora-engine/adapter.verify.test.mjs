import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const ROOT = path.resolve(process.cwd());
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'bora-adapter-'));
const SOURCES = [
  'lib/bora-engine/adapter.ts',
  'lib/bora-engine/bridge.ts',
  'engine/src/engine/evaluation/chart.ts',
  'engine/src/engine/window/hours.ts',
  'engine/src/engine/votes/threshold.ts',
  'engine/src/engine/seed/seed.ts',
  'engine/src/engine/kura/distribution.ts',
  'engine/src/engine/kura/persistent.ts',
  'engine/src/engine/platform/points.ts',
  'engine/src/engine/platform/window.ts',
  'engine/src/engine/score/boraScore.ts',
  'engine/src/engine/ranking/ranking.ts',
  'engine/src/engine/constants.ts',
];
function writeOne(rel) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const out = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const fixed = out.replace(/from\s+(['"])(\.[^'"]*?)(['"])/g, (m, q1, p, q2) => {
    if (p.endsWith('.js')) return 'from ' + q1 + p + q2;
    return 'from ' + q1 + p + '.js' + q2;
  });
  const dest = path.join(TMP, rel.replace(/\.ts$/, '.js'));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, fixed);
}
function writeStub() {
  const dest = path.join(TMP, 'lib', 'admin-actions.js');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, 'export async function getRegistry(){return globalThis.__ROWS??[];}');
}
let adapter, bridge, chart;
before(async () => {
  SOURCES.forEach(writeOne);
  writeStub();
  adapter = await import(pathToFileURL(path.join(TMP, 'lib/bora-engine/adapter.js')).href);
  bridge = await import(pathToFileURL(path.join(TMP, 'lib/bora-engine/bridge.js')).href);
  chart = await import(pathToFileURL(path.join(TMP, 'engine/src/engine/evaluation/chart.js')).href);
});
function completeRow(id, overrides = {}) {
  return {
    id,
    lifecycle: 'ACTIVE',
    k: 0,
    persistent_kura: 0,
    buckets: [],
    seedHours: [],
    platform: { youtube: [], spotify: [], boomplay: [] },
    ...overrides,
  };
}
describe('mapping', () => {
  it('accepts explicit empty histories and preserves valid zero state', () => {
    const rows = [completeRow('song-a')];
    const m = adapter.mapBackendSongsToEngineSongs(rows);
    assert.equal(m.songs.length, 1);
    assert.equal(m.skipped.length, 0);
    assert.deepEqual(m.gaps, []);
    assert.equal(m.songs[0].k, 0);
    assert.equal(m.songs[0].persistentKura, 0);
    assert.deepEqual(m.songs[0].buckets, []);
    assert.deepEqual(m.songs[0].seedHours, []);
    assert.deepEqual(m.songs[0].platform.youtube, []);
  });

  it('reports unavailable histories and state instead of fabricating defaults', () => {
    const m = adapter.mapBackendSongsToEngineSongs([{ id: 's1', momentum_score: 9999, yt_views: 777 }]);
    assert.equal(m.songs.length, 0);
    const unavailable = new Set(
      m.gaps.filter((gap) => gap.availability === 'unavailable').map((gap) => gap.field),
    );
    for (const field of [
      'k', 'persistentKura', 'lifecycle', 'buckets', 'seedHours',
      'youtubeObservations', 'spotifyObservations', 'boomplayObservations',
    ]) assert.ok(unavailable.has(field));
  });

  it('distinguishes invalid required state from unavailable state', () => {
    const m = adapter.mapBackendSongsToEngineSongs([
      completeRow('bad', { k: -1, persistent_kura: Number.NaN }),
    ]);
    assert.equal(m.songs.length, 0);
    assert.ok(m.gaps.some((gap) => gap.field === 'k' && gap.availability === 'invalid'));
    assert.ok(m.gaps.some((gap) => gap.field === 'persistentKura' && gap.availability === 'invalid'));
  });

  it('requires an explicit reference hour and explicit closed-hour state', () => {
    const built = adapter.buildEngineInputFromBackendRows(
      [completeRow('a')],
      undefined,
    );
    assert.equal(built.status, 'not-ready');
    assert.ok(built.gaps.some((gap) => gap.field === 'referenceHour'));
    assert.ok(built.gaps.some((gap) => gap.field === 'closedHourC'));
  });

  it('engine evaluates only complete prepared input and repeats identically', () => {
    const ref = adapter.toReferenceHour(1728000000000);
    const built = adapter.buildEngineInputFromBackendRows(
      [completeRow('a'), completeRow('b')],
      ref,
      { closedHourC: null },
    );
    assert.equal(built.status, 'ready');
    const input = bridge.toEngineInput(built.value);
    const out = chart.evaluateChart(input);
    assert.equal(out.ok, true);
    assert.deepEqual(out.value.ranked.map((r) => r.songId), ['a', 'b']);
    assert.deepEqual(out.value.ranked.map((r) => r.rank), [1, 2]);
    for (const e of out.value.ranked) { assert.equal(e.boraScore, 0); assert.equal(e.persistentKuraNext, null); }
    assert.deepEqual(chart.evaluateChart(input), out);
  });

  it('bridge reuses getRegistry shape', async () => {
    globalThis.__ROWS = [completeRow('x')];
    const res = await bridge.loadAndEvaluateBackendChart(
      (i) => chart.evaluateChart(i),
      { referenceHour: 480000, closedHourC: null },
    );
    assert.equal(res.status, 'ready');
    assert.equal(res.value.ranked.length, 1);
    delete globalThis.__ROWS;
  });

  it('does not invoke the evaluator for incomplete input', async () => {
    globalThis.__ROWS = [{ id: 'x' }];
    let invoked = false;
    const res = await bridge.loadAndEvaluateBackendChart(() => {
      invoked = true;
      return { ok: true, value: {} };
    }, { referenceHour: 480000, closedHourC: null });
    assert.equal(res.status, 'not-ready');
    assert.equal(invoked, false);
    delete globalThis.__ROWS;
  });

  it('does not treat an empty registry response as a publishable chart', async () => {
    globalThis.__ROWS = [];
    let invoked = false;
    const res = await bridge.loadAndEvaluateBackendChart(() => {
      invoked = true;
      return { ok: true, value: {} };
    }, { referenceHour: 480000, closedHourC: null });
    assert.equal(res.status, 'not-ready');
    assert.equal(invoked, false);
    assert.equal(res.gaps[0].field, 'songs');
    delete globalThis.__ROWS;
  });

  it('distinguishes evaluator exceptions and unusable results', async () => {
    globalThis.__ROWS = [completeRow('x')];
    const thrown = await bridge.loadAndEvaluateBackendChart(() => {
      throw new Error('evaluation boom');
    }, { referenceHour: 480000, closedHourC: null });
    assert.equal(thrown.status, 'evaluation-failed');
    assert.match(thrown.error.message, /threw/);

    const unusable = await bridge.loadAndEvaluateBackendChart(
      () => ({ ok: true, value: {} }),
      { referenceHour: 480000, closedHourC: null },
    );
    assert.equal(unusable.status, 'evaluation-failed');
    assert.match(unusable.error.message, /incomplete or inconsistent/);
    delete globalThis.__ROWS;
  });

  it('persistence blocked + idempotent', () => {
    bridge.__clearPersistedKeysForTests();
    const built = adapter.buildEngineInputFromBackendRows(
      [completeRow('a')],
      480001,
      { closedHourC: null },
    );
    assert.equal(built.status, 'ready');
    const input = bridge.toEngineInput(built.value);
    const out = chart.evaluateChart(input);
    assert.equal(out.ok, true);
    const key = bridge.buildPersistenceIdempotencyKey(input);
    const first = bridge.persistEngineEvaluation({ result: out.value, idempotencyKey: key });
    assert.equal(first.persisted, false);
    assert.equal(first.blocked, true);
    const second = bridge.persistEngineEvaluation({ result: out.value, idempotencyKey: key });
    assert.equal(second.duplicate, true);
  });
});
