import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { after, before, describe, it } from 'node:test';

const ROOT = process.cwd();
const TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'bora-youtube-persistence-'));
const require = createRequire(import.meta.url);
const ts = require('typescript');
const originalLoad = Module._load;
let createBoraEnginePersistence;

const snapshot = {
  songId: '00000000-0000-4000-8000-000000000001',
  videoId: 'abcdefghijk',
  metric: 'cumulative_views',
  unit: 'views_total',
  value: '100',
  retrievedAt: '2026-10-31T12:00:00.000Z',
  provider: 'youtube-data-api-v3',
  sourceStatus: 'observed',
  snapshotIdentity: {
    sourceSystem: 'youtube-data-api-v3',
    sourceObservationId: '00000000-0000-4000-8000-000000000002',
  },
  version: 0,
  supersedesSnapshotId: null,
};

function makeClient({ existingSnapshot = null, mapping = snapshot.videoId } = {}) {
  const tablesRead = [];
  const inserts = [];
  const client = {
    from(table) {
      tablesRead.push(table);
      const filters = {};
      const builder = {
        select() {
          return builder;
        },
        eq(column, value) {
          filters[column] = value;
          return builder;
        },
        async maybeSingle() {
          if (table === 'songs') {
            return {
              data: mapping ? { id: snapshot.songId, youtube_id: mapping } : null,
              error: null,
            };
          }
          return { data: existingSnapshot, error: null };
        },
        async insert(row) {
          inserts.push({ table, row });
          return { error: null };
        },
      };
      return builder;
    },
  };
  return { client, tablesRead, inserts };
}

before(() => {
  const source = fs.readFileSync(
    path.join(ROOT, 'lib/bora-engine/persistence.ts'),
    'utf8',
  );
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const compiledPath = path.join(TEMP, 'persistence.cjs');
  fs.writeFileSync(compiledPath, output);

  const stubs = {
    'server-only': {},
    '@supabase/supabase-js': { createClient: () => null },
    './adapter': { buildEngineInputFromBackendRows: () => null },
    './coverage-evidence': {
      isCoverageEvidenceAuthority: () => false,
      isCoverageEvidenceRecord: () => false,
    },
    '../supabase/secure-vote-source': {
      SECURE_VOTE_SOURCE_COLUMNS: '',
      toCanonicalSecureVoteEvent: () => null,
    },
    './vote-event-ingestion': {
      assessVoteEventIngestionRetry: () => null,
      classifyVoteEventIngestionRpcResult: () => null,
      validateVoteEventIngestionRequest: () => null,
    },
    './publication-transaction': {
      unknownPublicationCommit: () => null,
      validatePublicationRequest: () => null,
    },
  };

  Module._load = function (request, parent, isMain) {
    if (Object.hasOwn(stubs, request)) return stubs[request];
    return originalLoad.call(this, request, parent, isMain);
  };
  ({ createBoraEnginePersistence } = require(compiledPath));
  Module._load = originalLoad;
});

after(() => {
  Module._load = originalLoad;
  fs.rmSync(TEMP, { recursive: true, force: true });
});

describe('YouTube cumulative snapshot persistence', () => {
  it('records a baseline without creating hourly observations or coverage', async () => {
    const fake = makeClient();
    const persistence = createBoraEnginePersistence(fake.client);

    const result = await persistence.persistYouTubeSnapshot(snapshot);

    assert.deepEqual(result, {
      status: 'recorded',
      sourceObservationId: snapshot.snapshotIdentity.sourceObservationId,
    });
    assert.deepEqual(fake.inserts.map(({ table }) => table), [
      'bora_engine_youtube_snapshot_history',
    ]);
    assert.deepEqual([...new Set(fake.tablesRead)], [
      'songs',
      'bora_engine_youtube_snapshot_history',
    ]);
  });

  it('treats a retry with the same identity and payload as already recorded', async () => {
    const fake = makeClient({
      existingSnapshot: {
        song_id: snapshot.songId,
        video_id: snapshot.videoId,
        provider: snapshot.provider,
        metric: snapshot.metric,
        unit: snapshot.unit,
        source_status: 'OBSERVED',
        view_count: snapshot.value,
        retrieved_at: snapshot.retrievedAt,
        source_observation_id: snapshot.snapshotIdentity.sourceObservationId,
        version: snapshot.version,
        supersedes_snapshot_id: null,
      },
    });
    const persistence = createBoraEnginePersistence(fake.client);

    const result = await persistence.persistYouTubeSnapshot(snapshot);

    assert.deepEqual(result, {
      status: 'already-recorded',
      sourceObservationId: snapshot.snapshotIdentity.sourceObservationId,
    });
    assert.deepEqual(fake.inserts, []);
  });

  it('rejects reusing a snapshot identity with a different value', async () => {
    const fake = makeClient({
      existingSnapshot: {
        song_id: snapshot.songId,
        video_id: snapshot.videoId,
        provider: snapshot.provider,
        metric: snapshot.metric,
        unit: snapshot.unit,
        source_status: 'OBSERVED',
        view_count: '101',
        retrieved_at: snapshot.retrievedAt,
        source_observation_id: snapshot.snapshotIdentity.sourceObservationId,
        version: snapshot.version,
        supersedes_snapshot_id: null,
      },
    });
    const persistence = createBoraEnginePersistence(fake.client);

    const result = await persistence.persistYouTubeSnapshot(snapshot);

    assert.deepEqual(result, {
      status: 'error',
      reason: 'conflicting-source-identity',
    });
    assert.deepEqual(fake.inserts, []);
  });
});
