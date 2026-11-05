import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const runRoot = path.resolve(root, '..', '.bora-checker', 'runs');
const requestedRun = process.argv[2];

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function verifyRun(runDirectory) {
  const eventsPath = path.join(runDirectory, 'events.jsonl');
  const lines = readFileSync(eventsPath, 'utf8').split(/\r?\n/).filter(Boolean);
  let previousHash = '0'.repeat(64);

  for (let index = 0; index < lines.length; index += 1) {
    const event = JSON.parse(lines[index]);
    const { hash, ...unsigned } = event;
    if (
      event.sequence !== index ||
      event.previousHash !== previousHash ||
      sha256(JSON.stringify(unsigned)) !== hash
    ) {
      throw new Error(`Broken event chain at sequence ${index}`);
    }

    if (event.type === 'snapshot') {
      for (const [fileKey, hashKey] of [
        ['snapshotFile', 'snapshotSha256'],
        ['screenshotFile', 'screenshotSha256'],
      ]) {
        const content = readFileSync(path.join(runDirectory, event.payload[fileKey]));
        if (sha256(content) !== event.payload[hashKey]) {
          throw new Error(
            `Snapshot artifact hash mismatch at sequence ${index}: ${event.payload[fileKey]}`,
          );
        }
      }
    }

    previousHash = hash;
  }

  const summary = JSON.parse(
    readFileSync(path.join(runDirectory, 'summary.json'), 'utf8'),
  );
  if (
    summary.eventCount !== lines.length ||
    summary.headHash !== previousHash
  ) {
    throw new Error('Run summary does not match the verified event chain');
  }

  return {
    runId: path.basename(runDirectory),
    events: lines.length,
    status: summary.status,
    headHash: previousHash,
    artifactsVerified: lines
      .map((line) => JSON.parse(line))
      .filter((event) => event.type === 'snapshot').length,
  };
}

try {
  const runs = requestedRun
    ? [path.join(runRoot, requestedRun)]
    : readdirSync(runRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => path.join(runRoot, entry.name));

  if (runs.length === 0) throw new Error('No checker runs found.');
  for (const runDirectory of runs) {
    console.log(JSON.stringify(verifyRun(runDirectory)));
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Chain verification failed');
  process.exitCode = 1;
}
