// ============================================================================
// BORA ADMINISTRATOR AUTHORIZATION — SOURCE-LEVEL VERIFICATION
// ============================================================================
//
// Focused checks for the Phase 2 administrator authorization policy.
//
// WHAT THIS RUNS WITHOUT A DATABASE (pure decision core):
//   - parseAdministratorUserIds  (allowlist parsing, fail-closed)
//   - authorizeAdministratorUserId (the authorization decision)
//
// WHAT IS INTENTIONALLY BLOCKED (requires a live isolated Supabase
// project and is NOT run here):
//   - Unauthenticated caller denied at the RPC boundary.
//   - Ordinary authenticated caller denied at the RPC boundary.
//   - Authorized administrator allowed end-to-end.
//   - Direct RPC invocation denied for ordinary authenticated users.
//   These depend on deployed grants, RLS, the `app_metadata.role`
//   claim, and a verified JWT. See the "LIVE DATABASE CHECKS" section
//   at the bottom for exactly what would be required.
//
// Run with:  node scripts/verify-bora-administrator-authorization.mjs
// (Node >= 22 runs the imported TypeScript directly.)
// ============================================================================

import assert from 'node:assert/strict';

import {
  ADMINISTRATOR_ROLE_CLAIM,
  authorizeAdministratorUserId,
  parseAdministratorUserIds,
} from '../lib/administrator-allowlist.ts';

const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-8222-222222222222';
const UUID_A_UPPER = UUID_A.toUpperCase();

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  PASS  ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`  FAIL  ${name}`);
    console.error(
      `        ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// ---------------------------------------------------------------------------
// parseAdministratorUserIds
// ---------------------------------------------------------------------------
console.log('\nparseAdministratorUserIds');

check('returns a normalized lower-cased set for a valid list', () => {
  const set = parseAdministratorUserIds(`${UUID_A}, ${UUID_B}`);
  assert.ok(set);
  assert.equal(set.size, 2);
  assert.ok(set.has(UUID_A));
  assert.ok(set.has(UUID_B));
});

check('trims surrounding whitespace on each entry', () => {
  const set = parseAdministratorUserIds(`  ${UUID_A}  ,  ${UUID_B}  `);
  assert.ok(set);
  assert.equal(set.size, 2);
  assert.ok(set.has(UUID_A));
  assert.ok(set.has(UUID_B));
});

check('lower-cases upper-case UUIDs', () => {
  const set = parseAdministratorUserIds(UUID_A_UPPER);
  assert.ok(set);
  assert.ok(set.has(UUID_A));
});

check('fails closed (null) when undefined', () => {
  assert.equal(parseAdministratorUserIds(undefined), null);
});

check('fails closed (null) when empty string', () => {
  assert.equal(parseAdministratorUserIds(''), null);
});

check('fails closed (null) when only separators/whitespace', () => {
  assert.equal(parseAdministratorUserIds('  ,  , '), null);
});

check('fails closed (null) when any entry is not a UUID', () => {
  assert.equal(parseAdministratorUserIds(`${UUID_A},not-a-uuid`), null);
});

// ---------------------------------------------------------------------------
// authorizeAdministratorUserId
// ---------------------------------------------------------------------------
console.log('\nauthorizeAdministratorUserId');

check('no session -> unauthenticated', () => {
  const result = authorizeAdministratorUserId(null, UUID_A);
  assert.deepEqual(result, { status: 'unauthenticated' });
});

check('listed user -> authorized', () => {
  const result = authorizeAdministratorUserId(UUID_B, `${UUID_A},${UUID_B}`);
  assert.deepEqual(result, { status: 'authorized' });
});

check('listed user matches case-insensitively', () => {
  const result = authorizeAdministratorUserId(UUID_A_UPPER, UUID_A);
  assert.deepEqual(result, { status: 'authorized' });
});

check('valid session not on the list -> forbidden', () => {
  const result = authorizeAdministratorUserId(UUID_B, UUID_A);
  assert.equal(result.status, 'forbidden');
});

check('valid session with missing allowlist -> authorization-unavailable (fail closed)', () => {
  const result = authorizeAdministratorUserId(UUID_A, undefined);
  assert.equal(result.status, 'authorization-unavailable');
});

check('valid session with malformed allowlist -> authorization-unavailable (fail closed)', () => {
  const result = authorizeAdministratorUserId(UUID_A, 'not-a-uuid');
  assert.equal(result.status, 'authorization-unavailable');
});

check('non-UUID verified identity -> authorization-unavailable (fail closed)', () => {
  const result = authorizeAdministratorUserId('not-a-uuid', UUID_A);
  assert.equal(result.status, 'authorization-unavailable');
});

check('administrator role claim constant is the expected non-empty value', () => {
  assert.equal(ADMINISTRATOR_ROLE_CLAIM, 'bora_administrator');
});

// ---------------------------------------------------------------------------
// LIVE DATABASE CHECKS — BLOCKED
// ---------------------------------------------------------------------------
console.log('\nLive database checks');

const liveConfigured = Boolean(
  process.env.BORA_ADMIN_VERIFY_URL &&
    process.env.BORA_ADMIN_VERIFY_ANON_KEY &&
    process.env.BORA_ADMIN_VERIFY_ADMIN_USER_ID &&
    process.env.BORA_ADMIN_VERIFY_NONADMIN_EMAIL &&
    process.env.BORA_ADMIN_VERIFY_NONADMIN_PASSWORD,
);

if (!liveConfigured) {
  console.log('  BLOCKED  Live RPC-boundary checks require a dedicated, isolated');
  console.log('           Supabase project (NOT production) with migrations');
  console.log('           0002-0018 applied and the following environment set:');
  console.log('             BORA_ADMIN_VERIFY_URL');
  console.log('             BORA_ADMIN_VERIFY_ANON_KEY');
  console.log('             BORA_ADMIN_VERIFY_ADMIN_USER_ID  (app_metadata.role=bora_administrator)');
  console.log('             BORA_ADMIN_VERIFY_NONADMIN_EMAIL');
  console.log('             BORA_ADMIN_VERIFY_NONADMIN_PASSWORD');
  console.log('           No live database was accessed by this run.');
} else {
  console.log('  BLOCKED  Live harness not implemented in this script by design.');
}

// ---------------------------------------------------------------------------
console.log(
  `\n${passed} passed, ${failed} failed (source-level pure-logic checks).`,
);

if (failed > 0) {
  process.exitCode = 1;
}

