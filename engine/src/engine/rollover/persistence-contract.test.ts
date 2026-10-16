/**
 * DB-C: `bora_engine_commit_hour` reconciles rollover steps with persisted
 * input (Engine contract: `resolveHourC` in `rollover/rollover.ts`).
 *
 * These are STRUCTURAL contract tests over the migration source, in the same
 * spirit as the R-X block in `rollover.test.ts`: they pin the validation
 * rules, their stable error codes, and their position relative to the
 * transaction's locks and writes. They do NOT execute PostgreSQL, so they do
 * not prove transaction behaviour — a rejected commit's atomicity follows
 * from the `raise exception` semantics of plpgsql inside the single
 * transaction that `commit_hour` runs, which only a database can demonstrate.
 */
import { describe, expect, it } from 'vitest';

/** Strip SQL block and line comments so documentation cannot trip scans. */
function stripSqlComments(raw: string): string {
  return raw
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ');
}

/** Extract the `bora_engine_commit_hour` function body (up to its closing $$). */
function commitHourBody(sql: string): string {
  const start = sql.indexOf('create function public.bora_engine_commit_hour(');
  expect(start, 'commit_hour function not found').toBeGreaterThan(-1);
  const end = sql.indexOf('$$;', start);
  expect(end, 'commit_hour closing dollar-quote not found').toBeGreaterThan(
    start,
  );
  return sql.slice(start, end);
}

describe('DB-C: commit_hour validates rollover steps against persisted input', () => {
  async function commit(): Promise<string> {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const raw = readFileSync(
      fileURLToPath(
        new URL(
          '../../../../supabase/migrations/0014_bora_engine_hourly_atomic_operations.sql',
          import.meta.url,
        ),
      ),
      'utf8',
    );
    return commitHourBody(stripSqlComments(raw));
  }

  it('derives ACTUAL C from the persisted bucket with the locked vote tiers', async () => {
    const body = await commit();
    // calculateHourlyC (Contract 9): C_U = 0/1/2, C_D = 0/0.5/1, max(0, ·).
    expect(body).toContain('when b.upvotes = 0 then 0');
    expect(body).toContain('when b.upvotes < 5 then 1');
    expect(body).toContain('when b.downvotes = 0 then 0');
    expect(body).toContain('when b.downvotes < 5 then 0.5');
    expect(body).toMatch(/greatest\(/);
  });

  it('applies the locked precedence: actual replaces seed, never adds', async () => {
    const body = await commit();
    const actual = body.indexOf('when b.song_id is not null then');
    const seed = body.indexOf('when sh.song_id is not null then');
    const none = body.indexOf('else 0');
    expect(actual).toBeGreaterThan(-1);
    expect(seed).toBeGreaterThan(actual);
    expect(none).toBeGreaterThan(seed);
  });

  it('resolves an ARCHIVED seed to zero and NONE to exactly zero', async () => {
    const body = await commit();
    expect(body).toContain("when sh.lifecycle = 'ARCHIVED' then 0");
    // The no-input rule is exactly 0, never a fabricated or missing value.
    expect(body).toMatch(/else 0\s*end/);
  });

  it('rejects steps whose C disagrees with the persisted resolution', async () => {
    const body = await commit();
    expect(body).toContain('BORA_ENGINE_ROLLOVER_INPUT_MISMATCH');
    // The comparison is total: a NULL C can never slip past it.
    expect(body).toContain('x."closedHourC" is distinct from case');
  });

  it('rejects missing or out-of-domain step fields with a stable code', async () => {
    const body = await commit();
    expect(body).toContain('BORA_ENGINE_INVALID_ROLLOVER_STEP');
    for (const field of [
      'closedHourC',
      'freshInjected',
      'decayRate',
      'persistentBefore',
      'persistentAfter',
    ]) {
      expect(body, `missing null guard for ${field}`).toContain(
        `x."${field}" is null`,
      );
    }
    // Only closedHourC and decayRate carry both bounds here. Per documented
    // PG numeric ordering (NaN above every ordinary value, ±Infinity beyond
    // it), NaN fails `> 2` / `> 0.0025` and -Infinity fails `< 0` — but
    // whether jsonb can carry non-finite numerics at all is server-version
    // dependent and not verified without a database. The remaining fields
    // keep lower bounds only; their upper/domain rejection is enforced by
    // the 0012 closure-table checks at insert.
    expect(body).toContain('x."closedHourC" < 0');
    expect(body).toContain('x."closedHourC" > 2');
    expect(body).toContain('x."decayRate" > 0.0025');
  });


  it('validates after the share locks and before any write', async () => {
    const body = await commit();
    const shareLocks = body.indexOf(
      'lock table public.bora_engine_vote_buckets in share mode',
    );
    const malformed = body.indexOf('BORA_ENGINE_INVALID_ROLLOVER_STEP');
    const mismatch = body.indexOf('BORA_ENGINE_ROLLOVER_INPUT_MISMATCH');
    const closureInsert = body.indexOf(
      'insert into public.bora_engine_hourly_closures',
    );
    const stateUpdate = body.indexOf('update public.bora_engine_song_state');
    const headUpdate = body.indexOf(
      'update public.bora_engine_hourly_state_head',
    );
    const runUpdate = body.indexOf("set status = 'completed'");
    expect(shareLocks).toBeGreaterThan(-1);
    expect(malformed).toBeGreaterThan(shareLocks);
    expect(mismatch).toBeGreaterThan(malformed);
    expect(closureInsert).toBeGreaterThan(mismatch);
    expect(stateUpdate).toBeGreaterThan(closureInsert);
    expect(headUpdate).toBeGreaterThan(stateUpdate);
    expect(runUpdate).toBeGreaterThan(headUpdate);
  });

  it('records closure provenance from the persisted rows, not the caller', async () => {
    const body = await commit();
    // The Engine's RolloverStep carries no version fields, so versions can
    // only be stamped from the locked bucket/seed rows at validation time.
    expect(body).toMatch(/^\s*source_bucket_version,\s*$/m);
    expect(body).toMatch(/^\s*b\.version,\s*$/m);
    expect(body).toContain(
      'case when b.song_id is null then sh.version else null end',
    );
  });

  it('keeps replay protection intact around the new validation', async () => {
    const body = await commit();
    expect(body).toContain("'status', 'already-completed'");
    expect(body).toContain("'status', 'stale-lease'");
    expect(body).toContain("'status', 'stale-state'");
    expect(body).toContain('BORA_ENGINE_STALE_LEASE');
    expect(body).toContain('BORA_ENGINE_STATE_HEAD_CONFLICT');
  });

  it('leaves no mutation reachable before a validation rejection', async () => {
    const body = await commit();
    // Every mutation statement must occur after both validation raises, so a
    // rejected commit cannot have inserted or updated anything yet.
    const mismatch = body.indexOf('BORA_ENGINE_ROLLOVER_INPUT_MISMATCH');
    const firstMutation = body.search(
      /insert into|update public|delete from/i,
    );
    expect(firstMutation).toBeGreaterThan(mismatch);
  });
});
