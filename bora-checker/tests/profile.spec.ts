import { createHash, randomUUID } from 'node:crypto';
import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

import { expect, test, type Page, type TestInfo } from '@playwright/test';

const artifactRoot = path.resolve(process.cwd(), '.bora-checker', 'runs');
const zeroHash = '0'.repeat(64);

interface ChainEvent {
  readonly sequence: number;
  readonly timestamp: string;
  readonly type: string;
  readonly previousHash: string;
  readonly payload: Record<string, unknown>;
  readonly hash: string;
}

let runDirectory = '';
let chainPath = '';
let previousHash = zeroHash;
let sequence = 0;
let errorCount = 0;
let failedRequestCount = 0;
let runId = '';

function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function safePath(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return '[invalid-url]';
  }
}

function redact(value: string): string {
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[token]')
    .replace(/(token|password|secret|apikey)=([^&\s]+)/gi, '$1=[redacted]');
}

function record(type: string, payload: Record<string, unknown>): ChainEvent {
  const unsigned = {
    sequence: sequence++,
    timestamp: new Date().toISOString(),
    type,
    previousHash,
    payload,
  };
  const hash = sha256(JSON.stringify(unsigned));
  const event: ChainEvent = { ...unsigned, hash };
  appendFileSync(chainPath, `${JSON.stringify(event)}\n`, 'utf8');
  previousHash = hash;
  return event;
}

async function checkpoint(page: Page, name: string): Promise<void> {
  const index = String(sequence).padStart(3, '0');
  const snapshotFile = `${index}-${name}.json`;
  const screenshotFile = `${index}-${name}.png`;
  const snapshotPath = path.join(runDirectory, snapshotFile);
  const screenshotPath = path.join(runDirectory, screenshotFile);

  const snapshot = await page.evaluate(() => {
    const text = (document.body?.innerText ?? '').replace(/\s+/g, ' ').trim();
    const fields = Array.from(
      document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        'input, textarea',
      ),
    ).map((field) => ({
      id: field.id,
      type: field instanceof HTMLInputElement ? field.type : 'textarea',
      label:
        field.labels?.[0]?.innerText?.trim() ??
        field.getAttribute('aria-label') ??
        '',
      value:
        field instanceof HTMLInputElement &&
        ['password', 'email'].includes(field.type)
          ? '[redacted]'
          : field.value,
    }));

    return {
      title: document.title,
      path: window.location.pathname,
      text: text.slice(0, 30000),
      headings: Array.from(document.querySelectorAll('h1,h2,h3')).map(
        (heading) => heading.textContent?.trim() ?? '',
      ),
      buttons: Array.from(document.querySelectorAll('button')).map(
        (button) => ({
          text: button.innerText.trim(),
          ariaLabel: button.getAttribute('aria-label'),
          current: button.getAttribute('aria-current'),
          disabled: button.disabled,
        }),
      ),
      fields,
    };
  });

  const snapshotBuffer = Buffer.from(
    `${JSON.stringify(snapshot, null, 2)}\n`,
    'utf8',
  );
  writeFileSync(snapshotPath, snapshotBuffer);
  await page.screenshot({ path: screenshotPath });

  record('snapshot', {
    name,
    snapshotFile,
    snapshotSha256: sha256(snapshotBuffer),
    screenshotFile,
    screenshotSha256: sha256(readFileSync(screenshotPath)),
  });
}

function attachBrowserLogs(page: Page): void {
  page.on('request', (request) => {
    const url = safePath(request.url());
    if (
      request.method() !== 'GET' ||
      request.isNavigationRequest() ||
      /\/auth(?:\/|$)/i.test(url)
    ) {
      record('request-started', {
        method: request.method(),
        url,
      });
    }
  });

  page.on('console', (message) => {
    if (message.type() !== 'error' && message.type() !== 'warning') return;
    if (message.type() === 'error') errorCount += 1;
    record('browser-console', {
      level: message.type(),
      text: redact(message.text()).slice(0, 2000),
      location: safePath(message.location().url),
    });
  });

  page.on('pageerror', (error) => {
    errorCount += 1;
    record('page-error', { message: redact(error.message).slice(0, 2000) });
  });

  page.on('requestfailed', (request) => {
    failedRequestCount += 1;
    record('request-failed', {
      method: request.method(),
      url: safePath(request.url()),
      error: redact(request.failure()?.errorText ?? 'unknown').slice(0, 1000),
    });
  });

  page.on('response', (response) => {
    const request = response.request();
    if (
      response.status() < 400 &&
      request.method() === 'GET' &&
      !request.isNavigationRequest() &&
      !['fetch', 'xhr'].includes(request.resourceType())
    ) {
      return;
    }
    record(response.status() >= 400 ? 'http-error' : 'request-completed', {
      status: response.status(),
      method: request.method(),
      url: safePath(response.url()),
    });
  });
}

test.beforeEach(async ({ page }, testInfo) => {
  runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`;
  runDirectory = path.join(artifactRoot, runId);
  mkdirSync(runDirectory, { recursive: true });
  chainPath = path.join(runDirectory, 'events.jsonl');
  previousHash = zeroHash;
  sequence = 0;
  errorCount = 0;
  failedRequestCount = 0;
  writeFileSync(chainPath, '', 'utf8');
  record('run-started', {
    runId,
    test: testInfo.title,
    baseURL: process.env.BORA_CHECKER_BASE_URL ?? 'http://127.0.0.1:3000',
    credentialsConfigured: Boolean(
      process.env.BORA_CHECKER_EMAIL && process.env.BORA_CHECKER_PASSWORD,
    ),
  });
  attachBrowserLogs(page);
});

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== 'passed' && !page.isClosed()) {
    try {
      await checkpoint(page, 'failure');
    } catch (error) {
      record('snapshot-failed', {
        message:
          error instanceof Error ? redact(error.message).slice(0, 1000) : 'unknown',
      });
    }
  }

  const completion = record('run-finished', {
    status: testInfo.status,
    expectedStatus: testInfo.expectedStatus,
    errorCount,
    failedRequestCount,
  });
  writeFileSync(
    path.join(runDirectory, 'summary.json'),
    `${JSON.stringify(
      {
        runId,
        status: testInfo.status,
        eventCount: sequence,
        headHash: completion.hash,
        errorCount,
        failedRequestCount,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
});

test('profile editor changes reach the rendered profile and reset', async ({
  page,
}) => {
  test.setTimeout(300_000);
  const email = process.env.BORA_CHECKER_EMAIL;
  const password = process.env.BORA_CHECKER_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'Set BORA_CHECKER_EMAIL and BORA_CHECKER_PASSWORD before running the checker.',
    );
  }

  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Enter Control Room' }).click();
  await expect(page.getByText('Authentication Verified')).toBeVisible();
  await checkpoint(page, 'admin-authenticated');

  await page.goto('/admin/control-room');
  await expect(page).toHaveURL(/\/admin\/control-room/);
  await page.getByRole('button', { name: 'Profile' }).click();
  await expect(page.getByRole('heading', { name: 'Profile Editor' })).toBeVisible();
  await checkpoint(page, 'profile-loaded');

  const marker = `BORA Checker ${runId.slice(-8)}`;
  await page.getByLabel('Display Name').fill(marker);
  await expect(page.locator('[data-bora-ui="public-profile-name"]')).toHaveText(marker);
  await page.getByLabel('Username').fill('bora_checker_test');
  await expect(page.locator('[data-bora-ui="public-profile-handle"]')).toHaveText(
    '@bora_checker_test',
  );
  await page.getByLabel('Bio').fill('BORA checker preview verified.');
  await expect(page.locator('[data-bora-ui="public-profile-header"]')).toContainText(
    'BORA checker preview verified.',
  );
  await checkpoint(page, 'identity-edit-reached-preview');

  await page.getByLabel('Song 1 · Title').fill(`${marker} Song`);
  await page.getByRole('button', { name: 'Songs' }).click();
  await expect(
    page.locator('[data-bora-ui="public-profile-song-title"]').first(),
  ).toHaveText(`${marker} Song`);
  await checkpoint(page, 'song-edit-reached-songs-tab');

  await page.getByLabel('Artist 1 · Name').first().fill(`${marker} Favorite`);
  await expect(
    page.locator('[data-bora-ui="public-profile-favorite"]').first(),
  ).toContainText(`${marker} Favorite`);
  await checkpoint(page, 'favorite-artist-edit-reached-header');

  await page.getByLabel('Artist 1 · Name').last().fill(`${marker} Supported`);
  await page.getByRole('button', { name: 'Artists' }).click();
  await expect(
    page.locator('[data-bora-ui="public-profile-artists"]'),
  ).toContainText(`${marker} Supported`);
  await checkpoint(page, 'supported-artist-edit-reached-artists-tab');

  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.getByLabel('Display Name')).toHaveValue('Dee');
  await expect(page.locator('[data-bora-ui="public-profile-name"]')).toHaveText('Dee');
  await expect(page.getByLabel('Username')).toHaveValue('deemwakolo');
  await checkpoint(page, 'reset-restored-default-profile');
});
