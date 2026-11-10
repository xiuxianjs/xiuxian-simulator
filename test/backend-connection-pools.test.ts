import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { AxiosError, type AxiosAdapter } from 'axios';
import { createClient } from '../src/api/core/client';
import { backendConnectionPools } from '../src/api/bot/connection-pools';

test('shared socket pools reuse connections while concurrent clients keep separate identities and traces', async () => {
  const requests: { bid: string; token: string; trace: string; port?: number }[] = [];
  const server = createServer((request, response) => {
    requests.push({ bid: String(request.headers['x-bid']), token: String(request.headers.authorization), trace: String(request.headers['x-request-id']), port: request.socket.remotePort });
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ data: { found: true } }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const client = (bid: string) => createClient({ baseUrl, identity: { kind: 'robot', bid, token: `token-${bid}` }, connectionPools: backendConnectionPools });
    await client('first').request('getRobotIdentity', { requestId: 'first-trace' });
    await client('second').request('getRobotIdentity', { requestId: 'second-trace' });
    assert.equal(requests[0].port, requests[1].port);
    await Promise.all([
      client('third').request('getRobotIdentity', { requestId: 'third-trace' }),
      client('fourth').request('getRobotIdentity', { requestId: 'fourth-trace' })
    ]);
    assert.deepEqual(requests.map(({ bid, token, trace }) => ({ bid, token, trace })), [
      { bid: 'first', token: 'Bearer token-first', trace: 'first-trace' },
      { bid: 'second', token: 'Bearer token-second', trace: 'second-trace' },
      { bid: 'third', token: 'Bearer token-third', trace: 'third-trace' },
      { bid: 'fourth', token: 'Bearer token-fourth', trace: 'fourth-trace' }
    ]);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

test('SDK replaces the API prefix on the same origin and rejects non-API operations before transport', async () => {
  const urls: string[] = [];
  for (const apiBase of [undefined, '/channel-api']) {
    const client = createClient({
      baseUrl: 'https://backend.test',
      apiBase,
      identity: { kind: 'robot', bid: 'test-bid', token: 'test-token' },
      adapter: async config => {
        urls.push(config.url ?? '');
        return { status: 200, statusText: 'OK', data: '{"data":{"found":true}}', headers: {}, config };
      }
    });
    await client.request('getRobotIdentity');
    await assert.rejects(client.request('get_healthz'), /SDK operations must use the \/api\/ prefix/);
  }
  assert.deepEqual(urls, [
    'https://backend.test/api/v1/robot/identity',
    'https://backend.test/channel-api/v1/robot/identity'
  ]);
  assert.throws(() => createClient({ baseUrl: 'https://backend.test', apiBase: '//other.test' }), /apiBase/);
});

test('HTTP and HTTPS pools are distinct and TLS verification remains enabled', () => {
  assert.notEqual(backendConnectionPools.httpAgent, backendConnectionPools.httpsAgent);
  assert.equal((backendConnectionPools.httpAgent as unknown as { options: { keepAlive?: boolean } }).options.keepAlive, true);
  assert.equal(backendConnectionPools.httpsAgent.options.keepAlive, true);
  assert.notEqual((backendConnectionPools.httpsAgent as unknown as { options: { rejectUnauthorized?: boolean } }).options.rejectUnauthorized, false);
});

test('an aborted slow request releases its socket and a later request completes without retry', async () => {
  let calls = 0;
  const ports: (number | undefined)[] = [];
  const server = createServer((request, response) => {
    calls++;
    ports.push(request.socket.remotePort);
    if (calls === 1) return;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ data: { found: true } }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const client = createClient({ baseUrl: `http://127.0.0.1:${address.port}`, identity: { kind: 'robot', bid: 'timeout', token: 'test-token' }, connectionPools: backendConnectionPools });
    await assert.rejects(client.request('getRobotIdentity', { timeoutMs: 2000 }), (error: unknown) => {
      assert.equal((error as { code: string }).code, 'SDK_TIMEOUT');
      return true;
    });
    await client.request('getRobotIdentity', { timeoutMs: 10000 });
    assert.equal(calls, 2);
    assert.notEqual(ports[0], ports[1]);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

test('queries retry transient failures once after six seconds with the same request ID', async () => {
  await Promise.all([502, 503, 504, 'ECONNREFUSED'].map(async failure => {
    const attempts: { time: number; url?: string; requestId: unknown }[] = [];
    const adapter: AxiosAdapter = async config => {
      attempts.push({ time: performance.now(), url: config.url, requestId: config.headers.get('X-Request-ID') });
      if (attempts.length === 1 && typeof failure === 'string') {
        throw new AxiosError('Connection refused', failure);
      }
      const status = attempts.length === 1 ? Number(failure) : failure === 504 ? 503 : 200;
      return { status, statusText: '', data: '{"data":{"found":true}}', headers: {}, config };
    };
    const client = createClient({
      baseUrl: 'https://backend.test',
      identity: { kind: 'robot', bid: 'test-bid', token: 'test-token' },
      adapter
    });
    const result = client.request('getRobotIdentity', { requestId: 'query-trace', timeoutMs: 1000 });
    if (failure === 504) {
      await assert.rejects(result, { status: 503 });
    } else {
      assert.deepEqual(await result, { found: true });
    }
    assert.equal(attempts.length, 2);
    assert.ok(attempts[1].time - attempts[0].time >= 5950);
    assert.equal(attempts[1].url, attempts[0].url);
    assert.deepEqual(attempts.map(attempt => attempt.requestId), ['query-trace', 'query-trace']);
  }));
});

test('writes and permanent query errors send once, and a cancelled query skips retry', async () => {
  const controller = new AbortController();
  const attempts: string[] = [];
  const client = createClient({
    baseUrl: 'https://backend.test',
    identity: { kind: 'robot', bid: 'test-bid', token: 'test-token' },
    adapter: async config => {
      const id = String(config.headers.get('X-Request-ID'));
      attempts.push(id);
      if (id === 'cancel') {
        setTimeout(() => controller.abort(), 20);
      }
      return { status: id === 'auth-error' ? 401 : 502, statusText: '', data: '', headers: {}, config };
    }
  });
  await Promise.all([
    assert.rejects(client.request('post_auth_login', { requestId: 'write', body: { uid: 1, email: 'player@example.test', password: 'example' } }), { status: 502 }),
    assert.rejects(client.request('getRobotIdentity', { requestId: 'auth-error' }), { status: 401 }),
    assert.rejects(client.request('getRobotIdentity', { requestId: 'cancel', signal: controller.signal }), { code: 'SDK_ABORTED' })
  ]);
  assert.deepEqual(attempts.sort(), ['auth-error', 'cancel', 'write']);
});
