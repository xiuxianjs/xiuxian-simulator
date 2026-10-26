import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import test from 'node:test';
import { getBackendFlyMailMuteContext, setBackendFlyMailMute, commandBackendFlyMailMute } from '../src/api/bot/flymail-mute';
import { mockBackendConfig } from './backend-config-helper';

test('actual flymail mute qualification and committed state pass SDK', async t => {
  const output = execFileSync('go', ['test', './internal/service', '-run', '^TestFlyMailMute(ResponseContractSerialization|StateRestoreAndScope|StateRollback)$', '-count=1', '-v'], {
    cwd: new URL('../../xiuxian-game-server/', import.meta.url),
    env: { ...process.env, GOMODCACHE: process.env.GOMODCACHE ?? '/tmp/xiuxian-go-mod-cache' }, maxBuffer: 4 * 1024 * 1024
  }).toString();
  const encoded = output.match(/FLYMAIL_MUTE_RESPONSE_FIXTURES=(.+)/)?.[1];
  assert.ok(encoded);
  const fixtures = JSON.parse(encoded) as Record<string, { uid: number; targetId: number; targetUid: number; targetBid: string; muted: boolean; response: unknown }>;
  let payload: unknown;
  let lastURL = '';
  let lastBody: unknown;
  let calls = 0;
  const request = { requestId: 'mute-contract', idempotencyKey: 'mute-key' };
  const server = createServer(async (req, res) => {
    calls++;
    lastURL = req.url ?? '';
    let body = '';
    for await (const chunk of req) body += chunk;
    lastBody = body ? JSON.parse(body) : undefined;
    if (req.method !== 'GET') assert.equal(req.headers['idempotency-key'], request.idempotencyKey);
    res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ data: payload }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  mockBackendConfig(t, { api_url: `http://127.0.0.1:${address.port}`, robot_auth_token: 'contract-token' });
  try {
    assert.equal(Object.keys(fixtures).length, 24);
    for (const [name, fixture] of Object.entries(fixtures)) {
      payload = fixture.response;
      let result: unknown;
      if (name.startsWith('context')) {
        result = await getBackendFlyMailMuteContext('player', fixture.uid, fixture.targetBid);
        const url = new URL(lastURL, 'http://localhost');
        assert.equal(url.pathname, `/api/v1/players/${fixture.uid}/flymail/mute-context`);
        assert.equal(url.searchParams.get('targetBid'), fixture.targetBid || null);
      } else if (name.startsWith('state')) {
        result = await setBackendFlyMailMute('player', fixture.uid, fixture.targetId, fixture.muted, request);
        assert.equal(lastURL, `/api/v1/players/${fixture.uid}/flymail/mutes/${fixture.targetId}`);
      } else {
        result = await commandBackendFlyMailMute('player', fixture.uid, fixture.targetUid, fixture.targetBid, fixture.muted, request);
        assert.equal(lastURL, `/api/v1/players/${fixture.uid}/flymail/mute-command`);
        assert.deepEqual(lastBody, { targetUid: fixture.targetUid, ...(fixture.targetBid ? { targetBid: fixture.targetBid } : {}), muted: fixture.muted });
      }
      assert.deepEqual(result, fixture.response, name);
    }
    for (const field of ['outcome', 'targetName', 'realmName']) {
      const values: unknown[] = [undefined, 1, false, {}, []];
      if (field !== 'realmName') values.push(null, '');
      if (field === 'outcome') values.push('unknown');
      for (const value of values) {
        payload = { outcome: 'updated', targetName: '乙', realmName: '', [field]: value };
        await assert.rejects(setBackendFlyMailMute('player', 1, 2, true, request), /飞信禁言状态响应不完整/);
      }
    }
    for (const targetUid of [undefined, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, '2', false, {}, []]) {
      payload = { allowed: true, realmName: '', targetUid };
      await assert.rejects(getBackendFlyMailMuteContext('player', 1), /飞信禁言资格响应不完整/);
    }
    for (const outcome of ['locked', 'self', 'not_found']) {
      payload = { outcome, targetName: 'unexpected', realmName: null };
      await assert.rejects(setBackendFlyMailMute('player', 1, 2, true, request), /飞信禁言状态响应不完整/);
    }
    const before = calls;
    for (const bid of [undefined, '', '  ']) {
      await assert.rejects(getBackendFlyMailMuteContext(bid, 1), /缺少平台身份/);
      await assert.rejects(setBackendFlyMailMute(bid, 1, 2, true, request), /缺少平台身份/);
      await assert.rejects(commandBackendFlyMailMute(bid, 1, 0, 'two', true, request), /缺少平台身份/);
    }
    assert.equal(calls, before);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
