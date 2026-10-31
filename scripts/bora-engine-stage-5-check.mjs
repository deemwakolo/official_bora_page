const HOUR_MS = 60 * 60 * 1000;
const TRANSITION_MS = 10 * 60 * 1000;
const PLATFORM_WINDOW_HOURS = 168;
const TARGET_HOUR = process.argv[2];
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY =
  process.env.BORA_ENGINE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function parseTargetHour(value) {
  if (!/^(0|[1-9]\d*)$/.test(value ?? '')) return null;
  const hour = Number(value);
  return Number.isSafeInteger(hour) && Number.isSafeInteger(hour * HOUR_MS)
    ? hour
    : null;
}

async function callRpc(name, closedHour) {
  const response = await fetch(
    `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/${name}`,
    {
      method: 'POST',
      headers: {
        apikey: SERVICE_ROLE_KEY,
        authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ p_closed_hour: closedHour }),
    },
  );
  if (!response.ok) {
    throw new Error(`${name} returned HTTP ${response.status}`);
  }
  return response.json();
}

async function main() {
  const closedHour = parseTargetHour(TARGET_HOUR);
  if (closedHour === null) {
    fail('Usage: node scripts/bora-engine-stage-5-check.mjs <closed-epoch-hour>');
    return;
  }
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    fail(
      'Set NEXT_PUBLIC_SUPABASE_URL and BORA_ENGINE_SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE_KEY).',
    );
    return;
  }

  const [readiness, targetCheck] = await Promise.all([
    callRpc('bora_engine_readiness', closedHour),
    callRpc('bora_engine_check_hour', closedHour),
  ]);
  const checks = readiness?.checks ?? {};
  const coverageNames = [
    'voteHistory',
    'seedHours',
    'youtube',
    'spotify',
    'boomplay',
  ];
  const sourceAssessments = [
    { platform: 'youtube', status: 'not-configured' },
    { platform: 'spotify', status: 'not-authorized' },
    { platform: 'boomplay', status: 'unsupported' },
  ];
  const coverage = coverageNames.map((name) => {
    const check = checks[name] ?? {};
    return {
      input: name,
      status: check.status ?? 'unresolved',
      expected: check.expected ?? null,
      complete: check.complete ?? null,
      missing: check.missing ?? null,
      unavailable: check.unavailable ?? null,
      failed: check.failed ?? null,
    };
  });
  const missingEvidence = coverage.filter(
    (item) =>
      item.status !== 'ready' ||
      item.missing !== 0 ||
      item.unavailable !== 0 ||
      item.failed !== 0,
  );
  if (targetCheck?.reason === 'coverage-evidence-incomplete') {
    missingEvidence.push({
      input: 'coverage-evidence',
      status: 'incomplete',
      expected: targetCheck.expected ?? null,
      complete: targetCheck.evidenced ?? null,
      missing: targetCheck.missing ?? null,
      unavailable: 0,
      failed: 0,
    });
  }
  const state = checks.initialState ?? {};
  const platformCoverageExpected = checks.youtube?.expected;
  const activeSongCount =
    state.status === 'ready' &&
    Number.isSafeInteger(platformCoverageExpected) &&
    platformCoverageExpected % PLATFORM_WINDOW_HOURS === 0
      ? platformCoverageExpected / PLATFORM_WINDOW_HOURS
      : null;
  const transitionEligibleAt =
    (closedHour + 1) * HOUR_MS + TRANSITION_MS;
  const transitionGraceElapsed = Date.now() >= transitionEligibleAt;
  const readinessReady =
    readiness?.status === 'ready' &&
    state.status === 'ready' &&
    state.referenceHour === closedHour &&
    activeSongCount !== null &&
    activeSongCount > 0 &&
    missingEvidence.length === 0;
  const targetCheckAllowsClaim =
    targetCheck?.status === 'ready' ||
    (targetCheck?.status === 'not-ready' &&
      targetCheck.reason === 'missing-hourly-run');
  const targetHourEligible =
    readinessReady &&
    targetCheckAllowsClaim &&
    sourceAssessments.every(
      (assessment) => assessment.status === 'available',
    ) &&
    transitionGraceElapsed;
  const missingSources = sourceAssessments.filter(
    (assessment) => assessment.status !== 'available',
  );

  console.log(
    JSON.stringify(
      {
        status: targetHourEligible ? 'ready' : 'not-ready',
        closedHour,
        referenceHour: state.referenceHour ?? null,
        activeSongCount,
        requiredCoverageCount: coverage.reduce(
          (total, item) => total + (item.expected ?? 0),
          0,
        ),
        completeCoverageCount: coverage.reduce(
          (total, item) => total + (item.complete ?? 0),
          0,
        ),
        coverage,
        missingEvidence,
        sourceAssessments,
        missingSources,
        bootstrapStatus:
          state.status === 'ready' && state.referenceHour === closedHour
            ? 'initialized'
            : state.status ?? 'unresolved',
        targetCheckStatus:
          targetCheck?.reason === 'missing-hourly-run'
            ? 'unclaimed'
            : targetCheck?.status ?? 'unresolved',
        targetCheckReason: targetCheck?.reason ?? null,
        transitionEligibleAt: new Date(transitionEligibleAt).toISOString(),
        transitionGraceElapsed,
        targetHourEligible,
      },
      null,
      2,
    ),
  );

  if (!targetHourEligible) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  fail(
    `BORA Engine readiness check failed: ${
      error instanceof Error ? error.message : 'unknown error'
    }`,
  );
});
