import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import test from 'node:test';
import { queryBackendBattleLog } from '../src/api/bot/battle-log-query';
import { mockBackendConfig } from './backend-config-helper';

test('actual battle log Redis reads preserve text, expiry, missing and failure through SDK', async t => {
  const output = execFileSync('go', ['test', './internal/service', '-run', '^TestBattleLog(ResponseContractSerialization|QueryPreservesTextExpiryAndNamespace|QueryProjectsGoEngineJSONForRenderer)$', '-count=1', '-v'], {
    cwd: new URL('../../xiuxian-game-server/', import.meta.url),
    env: { ...process.env, GOMODCACHE: process.env.GOMODCACHE ?? '/tmp/xiuxian-go-mod-cache' }, maxBuffer: 4 * 1024 * 1024
  }).toString();
  const encoded = output.match(/BATTLE_LOG_RESPONSE_FIXTURES=(.+)/)?.[1]; assert.ok(encoded);
  const fixtures = JSON.parse(encoded) as Record<string, { logId: string; response: unknown }>;
  let payload: unknown;
  let lastBody: unknown;
  let calls = 0;
  const server = createServer(async (req, res) => {
    calls++; assert.equal(req.method, 'POST'); assert.equal(req.url, '/api/v1/players/1/battle-log-query');
    let body = ''; for await (const chunk of req) body += chunk; lastBody = JSON.parse(body);
    res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ data: payload }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  mockBackendConfig(t, { api_url: `http://127.0.0.1:${address.port}`, robot_auth_token: 'contract-token' });
  try {
    assert.equal(Object.keys(fixtures).length, 8);
    for (const fixture of Object.values(fixtures)) {
      payload = fixture.response;
      assert.deepEqual(await queryBackendBattleLog('player', 1, fixture.logId, '查看战斗过程'), fixture.response);
      assert.deepEqual(lastBody, { logId: fixture.logId });
    }
    for (const field of ['logId', 'text', 'readFailed']) {
      const values: unknown[] = [undefined, 1, {}, []];
      if (field !== 'text') values.push(null);
      if (field === 'logId') values.push('other');
      if (field === 'text') values.push(false);
      if (field === 'readFailed') values.push('false');
      for (const invalid of values) {
        payload = { logId: 'test', text: null, readFailed: false, [field]: invalid };
        await assert.rejects(queryBackendBattleLog('player', 1, 'test', '查看战斗过程'), /战斗日志响应不完整/);
      }
    }
    payload = { logId: 'test', text: 'unexpected', readFailed: true };
    await assert.rejects(queryBackendBattleLog('player', 1, 'test', '查看战斗过程'), /战斗日志响应不完整/);
    payload = { logId: '  ', text: null, readFailed: false };
    assert.deepEqual(await queryBackendBattleLog('player', 1, '  ', '查看战斗过程'), payload);
    assert.deepEqual(lastBody, { logId: '  ' }, 'log ID whitespace is server-owned identity');
    const before = calls;
    for (const bid of [undefined, '', '  ']) await assert.rejects(queryBackendBattleLog(bid, 1, 'test', ''), /缺少平台身份/);
    for (const uid of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) await assert.rejects(queryBackendBattleLog('player', uid, 'test', ''), /战斗日志查询参数无效/);
    await assert.rejects(queryBackendBattleLog('player', 1, '', ''), /战斗日志查询参数无效/);
    assert.equal(calls, before);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
