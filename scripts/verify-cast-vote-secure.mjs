#!/usr/bin/env node
// ============================================================================
// Focused, repeatable verification harness for public.cast_vote_secure.
//
// Phase 2B requires verifying the hardened guest-vote RPC end-to-end through a
// REAL Supabase anonymous guest session (JS client), in an ISOLATED environment.
// This harness does that — and refuses to run against production or without an
// explicitly isolated target (hard stops, no silent fallback to handle_song_vote).
//
// USAGE:
//   node scripts/verify-cast-vote-secure.mjs --selftest
//       Pure result-classification unit tests. No DB, no network. Safe anywhere.
//   node scripts/verify-cast-vote-secure.mjs
//       Full isolated integration matrix. Requires:
//         CAST_VOTE_TEST_URL, CAST_VOTE_TEST_ANON_KEY, CAST_VOTE_TEST_SONG_ID
//       pointing at a NON-production project with anonymous sign-in ENABLED
//       and migration 0010 applied.
// ============================================================================
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

// --- Pure result classifier (no DB). Distinguishes accepted/duplicate/rejected.
export function classifyCastVoteResult({ data, error }) {
  if (error) {
    const code = error.code || '';
    const reason =
      code === 'P0001' ? 'rate_limited' :
      code === 'P0002' ? 'song_not_found' :
      code === '23505' ? 'idempotency_conflict' :
      code === '28000' ? 'auth_required' :
      code === '22023' ? 'invalid_input' : 'rejected';
    return { status: 'rejected', reason, code, message: error.message || '' };
  }
  if (data && data.status === 'accepted') return { status: 'accepted', eventId: data.event_id, reason: 'ok' };
  if (data && data.status === 'duplicate') return { status: 'duplicate', eventId: data.event_id, reason: 'already_processed' };
  return { status: 'rejected', reason: 'unexpected_shape', code: '', message: JSON.stringify(data ?? null) };
}

// --- Pure unit tests. Run with --selftest. No DB, no network.
export function runSelftest() {
  const cases = [
    ['accepted', classifyCastVoteResult({ data: { status: 'accepted', event_id: 'e1' }, error: null }), 'accepted'],
    ['duplicate', classifyCastVoteResult({ data: { status: 'duplicate', event_id: 'e1' }, error: null }), 'duplicate'],
    ['rate_limited', classifyCastVoteResult({ data: null, error: { code: 'P0001' } }), 'rejected'],
    ['song_not_found', classifyCastVoteResult({ data: null, error: { code: 'P0002' } }), 'rejected'],
    ['idem_conflict', classifyCastVoteResult({ data: null, error: { code: '23505' } }), 'rejected'],
    ['auth_required', classifyCastVoteResult({ data: null, error: { code: '28000' } }), 'rejected'],
    ['invalid_type', classifyCastVoteResult({ data: null, error: { code: '22023' } }), 'rejected'],
    ['bad_shape', classifyCastVoteResult({ data: { weird: 1 }, error: null }), 'rejected'],
  ];
  let pass = 0;
  for (const [name, got, want] of cases) {
    const ok = got.status === want;
    if (ok) pass++;
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name} -> status=${got.status} reason=${got.reason}`);
  }
  const rateReason = classifyCastVoteResult({ data: null, error: { code: 'P0001' } }).reason;
  const rateOk = rateReason === 'rate_limited';
  console.log(`  ${rateOk ? 'PASS' : 'FAIL'}  rate_limit_reason_distinguished (reason=${rateReason})`);
  if (rateOk) pass++;
  console.log(`SELFTEST ${pass}/${cases.length + 1} passed`);
  return pass === cases.length + 1;
}


// ---------------------------------------------------------------------------
// Isolated integration matrix. Guarded: refuses to touch production.
// ---------------------------------------------------------------------------
function readProdRef() {
  try {
    const t = fs.readFileSync('.env.local', 'utf8');
    const m = t.match(/NEXT_PUBLIC_SUPABASE_URL=.*?https:\/\/([a-z0-9]+)\.supabase\.co/);
    return m ? m[1] : null;
  } catch { return null; }
}

export function resolveIsolatedConfig() {
  const url = process.env.CAST_VOTE_TEST_URL;
  const anon = process.env.CAST_VOTE_TEST_ANON_KEY;
  const songId = process.env.CAST_VOTE_TEST_SONG_ID;
  const missing = [];
  if (!url) missing.push('CAST_VOTE_TEST_URL');
  if (!anon) missing.push('CAST_VOTE_TEST_ANON_KEY');
  if (!songId) missing.push('CAST_VOTE_TEST_SONG_ID');
  if (missing.length) {
    return { ok: false, error: `NO_ISOLATED_ENV: missing ${missing.join(', ')}. Refusing to run integration tests.` };
  }
  const ref = (url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/) || [])[1] || null;
  const prodRef = readProdRef();
  if (ref && prodRef && ref === prodRef) {
    return { ok: false, error: `TARGET_IS_PRODUCTION: CAST_VOTE_TEST_URL points at the production project (${ref}). Refusing to run.` };
  }
  return { ok: true, url, anon, songId, ref, prodRef };
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function signInGuest(supabase) {
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data?.session) return { ok: false, stage: error?.message || 'no_session' };
  const claims = (() => { try { return JSON.parse(Buffer.from(data.session.access_token.split('.')[1], 'base64').toString()); } catch { return {}; } })();
  return { ok: true, uid: data.user?.id, isAnonymous: claims.is_anonymous === true };
}

export async function runIntegration() {
  const cfg = resolveIsolatedConfig();
  if (!cfg.ok) {
    console.error('STOP:', cfg.error);
    console.error('Integration tests require a dedicated isolated Supabase project');
    console.error('with anonymous sign-in ENABLED, a dedicated test song row, and');
    console.error('migration 0010 applied. Set CAST_VOTE_TEST_URL / CAST_VOTE_TEST_ANON_KEY / CAST_VOTE_TEST_SONG_ID.');
    return false;
  }
  const cls = classifyCastVoteResult;
  const results = [];
  const assert = (name, ok, detail) => { results.push([name, !!ok]); console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' :: ' + detail : ''}`); };

  const supabase = createClient(cfg.url, cfg.anon, { auth: { persistSession: false } });
  const guest = await signInGuest(supabase);
  assert('anonymous_signin', guest.ok && guest.isAnonymous, `uid_present=${!!guest.uid} is_anonymous=${guest.isAnonymous}`);
  if (!guest.ok) { console.error('STOP: anonymous sign-in failed/disabled ->', guest.stage); return false; }

  const rpc = (songId, type, key) => supabase.rpc('cast_vote_secure', { p_song_id: songId, p_vote_type: type, p_idempotency_key: key });

  // valid upvote
  const k1 = uuid();
  const r1 = cls(await rpc(cfg.songId, 'up', k1));
  assert('valid_upvote_accepted', r1.status === 'accepted', `reason=${r1.reason}`);

  // exact retry -> duplicate, no counter change
  const r2 = cls(await rpc(cfg.songId, 'up', k1));
  assert('exact_retry_duplicate', r2.status === 'duplicate', `reason=${r2.reason}`);

  // same key, different type -> idempotency conflict
  const r3 = cls(await rpc(cfg.songId, 'down', k1));
  assert('same_key_diff_payload_conflict', r3.status === 'rejected' && r3.reason === 'idempotency_conflict', `reason=${r3.reason}`);

  // invalid vote type
  const r4 = cls(await rpc(cfg.songId, 'sideways', uuid()));
  assert('invalid_vote_type', r4.status === 'rejected' && r4.reason === 'invalid_input', `reason=${r4.reason}`);

  // concurrency: 8 concurrent identical requests, one key
  const kc = uuid();
  const many = await Promise.all(Array.from({ length: 8 }, () => rpc(cfg.songId, 'up', kc).then(cls)));
  const accepted = many.filter((x) => x.status === 'accepted').length;
  const dups = many.filter((x) => x.status === 'duplicate').length;
  const clean = many.every((x) => x.status === 'accepted' || x.status === 'duplicate');
  assert('concurrent_same_key_one_accepted', accepted === 1 && dups === 7 && clean, `accepted=${accepted} duplicate=${dups}`);

  // per-voter namespace: a second guest reuses the same key -> also accepted
  const supabase2 = createClient(cfg.url, cfg.anon, { auth: { persistSession: false } });
  const guest2 = await signInGuest(supabase2);
  const sharedKey = uuid();
  const a1 = cls(await rpc(cfg.songId, 'up', sharedKey));
  const a2 = cls(await supabase2.rpc('cast_vote_secure', { p_song_id: cfg.songId, p_vote_type: 'up', p_idempotency_key: sharedKey }));
  assert('two_guests_same_key_both_accepted', guest2.ok && a1.status === 'accepted' && a2.status === 'accepted', `g1=${a1.status} g2=${a2.status}`);

  // no JWT -> auth_required (proves no silent fallback)
  await supabase.auth.signOut();
  const noJwt = cls(await supabase.rpc('cast_vote_secure', { p_song_id: cfg.songId, p_vote_type: 'up', p_idempotency_key: uuid() }));
  assert('no_jwt_auth_required', noJwt.status === 'rejected' && noJwt.reason === 'auth_required', `reason=${noJwt.reason}`);

  const passed = results.filter((x) => x[1]).length;
  console.log(`INTEGRATION ${passed}/${results.length} passed`);
  console.log('Cleanup: delete test song ' + cfg.songId + ' + its vote_events from the ISOLATED project, then delete anonymous test users.');
  return passed === results.length;
}

import { pathToFileURL } from 'node:url';
const isMain = typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  if (process.argv.includes('--selftest')) process.exit(runSelftest() ? 0 : 1);
  runIntegration().then((ok) => process.exit(ok ? 0 : 1));
}

