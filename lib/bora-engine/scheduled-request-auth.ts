import { Receiver } from '@upstash/qstash';
import { timingSafeEqual } from 'node:crypto';

const MAX_SIGNED_REQUEST_BODY_BYTES = 4096;

export type ScheduledRequestAuthorization =
  | { readonly authorized: true }
  | {
      readonly authorized: false;
      readonly reason: 'unauthorized' | 'misconfigured';
    };

export async function authorizeScheduledRequest(
  request: Request,
): Promise<ScheduledRequestAuthorization> {
  const signature = request.headers.get('upstash-signature');
  if (signature) {
    const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
    const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;
    if (!currentSigningKey || !nextSigningKey) {
      return { authorized: false, reason: 'misconfigured' };
    }

    try {
      const body = await readSignedRequestBody(request);
      if (body === null) {
        return { authorized: false, reason: 'unauthorized' };
      }

      const receiver = new Receiver({
        currentSigningKey,
        nextSigningKey,
        devMode: false,
      });
      const authorized = await receiver.verify({
        signature,
        body,
        url: request.url,
      });
      return authorized
        ? { authorized: true }
        : { authorized: false, reason: 'unauthorized' };
    } catch {
      return { authorized: false, reason: 'unauthorized' };
    }
  }

  const secret = process.env.CRON_SECRET;
  if (!secret) return { authorized: false, reason: 'misconfigured' };

  const authorization = request.headers.get('authorization');
  if (!authorization) return { authorized: false, reason: 'unauthorized' };

  const expected = Buffer.from(`Bearer ${secret}`);
  const provided = Buffer.from(authorization);
  const authorized =
    expected.length === provided.length &&
    timingSafeEqual(expected, provided);
  return authorized
    ? { authorized: true }
    : { authorized: false, reason: 'unauthorized' };
}

async function readSignedRequestBody(
  request: Request,
): Promise<string | null> {
  const contentLength = Number(request.headers.get('content-length'));
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_SIGNED_REQUEST_BODY_BYTES
  ) {
    return null;
  }

  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_SIGNED_REQUEST_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}
