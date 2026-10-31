# BORA Engine Stage 3 persistence contract

## Vote ingestion

The application adapter sends one `p_event` JSONB argument to
`bora_engine_ingest_vote_event`. Its nine fields come from the validated
canonical event: source system, source event ID, song ID, vote type, committed
timestamp, voter reference, identity method, identity version, and idempotency
key. The adapter does not write vote buckets separately. The database remains
the authority for event verification, deduplication, bucket increments, and
coverage invalidation.

The adapter maps database `accepted` to `ingested` and `duplicate` to
`already-ingested`. Identity conflicts remain unsuccessful. Whole-transaction
retries stay bounded; transport failures whose commit outcome cannot be proven
remain `commit-unknown`.

## Readiness

Migration 0026 evaluates complete vote and seed history windows of 72 hours and
platform windows of 168 hours. The adapter preserves each database check and
the database's top-level `ready` / `not-ready` status. Vote-history duplicate
counts are parsed for diagnostics and do not alter readiness criteria.

## Security and migration provenance

Readiness migration 0026 and rollover migration 0032 revoke execution from
`public`, `anon`, and `authenticated` and grant execution to `service_role`.
The vote-ingestion function is not represented by the same signature in the
repository: migration 0018 defines the historical nine-argument function,
while the inspected live contract uses `bora_engine_ingest_vote_event(jsonb)`.
Migrations 0027–0031 are absent from this migration directory. Treat this as a
migration-provenance gap; do not rewrite migration 0018 or add a replacement
SQL migration until the missing applied history and deployed privileges have
been recovered and verified.

No Stage 3 repair changes scoring mathematics, readiness thresholds, bootstrap
behavior, or the live `SECURITY DEFINER` functions.

## Regression coverage

`engine/src/testing/persistence-contract.test.ts` exercises the application
adapter with a mocked Supabase client, including the JSONB envelope, all nine
canonical fields, accepted/duplicate mapping, identity conflict, unknown
commit, bounded retry, readiness preservation, and duplicate diagnostics.
These tests run under the Engine Vitest harness; they are adapter-level tests,
not production ingestion or bootstrap operations. Deployment-level signature
and privilege verification remains a separate operational check.

`engine/src/engine/rollover/persistence-contract.test.ts` structurally checks
the effective `bora_engine_commit_hour` definition from migration 0032,
including its rollover validation, locking, write ordering, and replay
protection. This source contract does not execute PostgreSQL; transaction and
concurrency behavior still require an isolated database integration suite.
