import { once } from 'node:events';
import { createServer } from 'node:http';
import type { TestContext } from 'node:test';
import { createTestApp } from 'alemonjs/testing';

export type BusinessRequest = { path: string; bid: string; body: Record<string, unknown>; idempotencyKey: string };

/** Real project HTTP/parsers/hooks; only the backend response and platform are simulated. */
export async function gameFixture(t: TestContext, respond: (request: BusinessRequest) => unknown, statusCode = 200) {
  const requests: BusinessRequest[] = [];
  const server = createServer(async (req, res) => {
    try {
      req.setEncoding('utf8');
      let body = '';
      for await (const chunk of req) body += chunk;
      const request = {
        path: req.url ?? '',
        bid: String(req.headers['x-bid'] ?? ''),
        idempotencyKey: String(req.headers['idempotency-key'] ?? ''),
        body: JSON.parse(body || '{}')
      };
      requests.push(request);
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = statusCode;
      res.end(JSON.stringify(statusCode >= 400 ? { error: respond(request) } : { data: respond(request) }));
    } catch {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: { code: 'TEST_FIXTURE_ERROR', message: 'Test fixture rejected request' } }));
    }
  });
  // Bind only to loopback; instance configuration never reads a production YAML.
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No fixture address');
  const app = createTestApp({
    config: {
      processor: { repeated_user_time: 0 },
      'xiuxian-game': { backend: { api_url: `http://127.0.0.1:${address.port}`, robot_auth_token: 'offline-fixture-token' } }
    }
  });
  t.after(async () => {
    try {
      await app.dispose();
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
    }
  });
  return { app, requests };
}

export function businessEnvelope(bid: string, data: unknown, replies: Array<Record<string, unknown>> = []) {
  return {
    success: data !== undefined,
    branch: 'business',
    middleware: {
      outcome: 'allow',
      reason: 'ALLOWED',
      identity: { bid, account: { status: 'registered', playerId: 1 } },
      replies,
      contextWarnings: [],
      entry: { routeAllowed: true, maintenance: { disabled: false }, resourcesSettled: false, nativeComebackProcessed: false }
    },
    ...(data === undefined ? {} : { data })
  };
}
