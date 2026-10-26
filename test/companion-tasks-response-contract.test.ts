import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import test from 'node:test';
import { getBackendCompanionTasks } from '../src/api/bot/companion-tasks-queries';
import { mockBackendConfig } from './backend-config-helper';

test('actual companion task reads preserve date, historical counts and empty eligibility branches', async t => {
  const output = execFileSync('go', ['test', './internal/service', '-run', '^TestCompanionTasks(ResponseContractSerialization|QueryReadOnlyIdentityDateAndFacts)$', '-count=1', '-v'], {
    cwd: new URL('../../xiuxian-game-server/', import.meta.url),
    env: { ...process.env, GOMODCACHE: process.env.GOMODCACHE ?? '/tmp/xiuxian-go-mod-cache' }, maxBuffer: 4 * 1024 * 1024
  }).toString();
  const encoded = output.match(/COMPANION_TASKS_RESPONSE_FIXTURES=(.+)/)?.[1]; assert.ok(encoded);
  const fixtures = JSON.parse(encoded) as Record<string, { uid: number; response: { tasks: Array<Record<string, unknown>> } }>;
  let payload: unknown;
  let expectedUID = 1;
  let calls = 0;
  const server = createServer((req, res) => {
    calls++; assert.equal(req.method, 'GET'); assert.equal(req.url, `/api/v1/players/${expectedUID}/companion/tasks`);
    res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ data: payload }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  mockBackendConfig(t, { api_url: `http://127.0.0.1:${address.port}`, robot_auth_token: 'contract-token' });
  try {
    assert.equal(Object.keys(fixtures).length, 5);
    for (const fixture of Object.values(fixtures)) {
      payload = fixture.response; expectedUID = fixture.uid;
      assert.deepEqual(await getBackendCompanionTasks('player', fixture.uid), fixture.response);
    }
    expectedUID = 1;
    for (const field of ['limit', 'completedCount', 'earnedTongxin']) {
      for (const invalid of [undefined, null, 1.5, Number.MAX_SAFE_INTEGER + 1, '1', false, {}, []]) {
        const fixture = structuredClone(fixtures.uid1.response); fixture.tasks[0][field] = invalid; payload = fixture;
        await assert.rejects(getBackendCompanionTasks('player', 1), /道侣任务字段不完整/);
      }
    }
    for (const invalid of [undefined, null, 1.5, Number.MAX_SAFE_INTEGER + 1, '1', false, {}, []]) {
      const fixture = structuredClone(fixtures.uid1.response); fixture.tasks[0].rewardAmounts = [invalid]; payload = fixture;
      await assert.rejects(getBackendCompanionTasks('player', 1), /道侣任务字段不完整/);
    }
    for (const invalid of [undefined, null, 0, false, {}, [], 'unknown']) {
      const fixture = structuredClone(fixtures.uid1.response); fixture.tasks[0].taskType = invalid; payload = fixture;
      await assert.rejects(getBackendCompanionTasks('player', 1), /道侣任务字段不完整/);
    }
    for (const invalid of [null, false, 1, {}, []]) {
      payload = { access: invalid, hasCompanion: true, tasks: [] };
      await assert.rejects(getBackendCompanionTasks('player', 1), /道侣任务数据不完整/);
      payload = { access: { canUseFifthLayerFeature: true, realmName: null }, hasCompanion: true, tasks: [invalid] };
      await assert.rejects(getBackendCompanionTasks('player', 1), /道侣任务字段不完整/);
    }
    const fixture = structuredClone(fixtures.uid1.response); fixture.tasks[0].rewardAmounts = []; payload = fixture;
    assert.deepEqual((await getBackendCompanionTasks('player', 1)).tasks[0].rewardAmounts, []);
    const before = calls;
    for (const bid of [undefined, '', '  ']) await assert.rejects(getBackendCompanionTasks(bid, 1), /缺少平台身份/);
    assert.equal(calls, before);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
