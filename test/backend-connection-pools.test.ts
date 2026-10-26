import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';
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
