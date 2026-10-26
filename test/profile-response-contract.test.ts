import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { validatePlayerProfile } from '../src/api/bot/player-profile-query';
import { getBackendPublicPlayerProfile } from '../src/api/bot/public-player-profile-query';
import { setBackendProfileVisibility } from '../src/api/bot/profile-visibility';
import { requestBackend } from '../src/api/bot/client';
import { mockBackendConfig } from './backend-config-helper';

type Fixture = { operation: string; uid: number; target: number; hidden: boolean; data: Record<string, unknown> };

test('actual own and public profile visibility projections pass robot SDK', async t => {
  const output = execFileSync('go', ['test', './internal/service', '-run', '^TestProfileResponseContractSerialization$', '-v', '-count=1'], {
    cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 1024 * 1024
  });
  const match = output.match(/PROFILE_RESPONSE_FIXTURES=(.+)/);
  assert.ok(match, 'Go profile responses missing');
  const fixtures = JSON.parse(match[1]) as Record<string, Fixture>;
  let payload: unknown;
  const server = createServer((_request, response) => {
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ data: payload }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  mockBackendConfig(t, { api_url: `http://127.0.0.1:${address.port}`, robot_auth_token: 'local-profile-contract' });
  const context = { requestId: 'profile-contract', idempotencyKey: 'profile-contract' };
  const run = async (entry: Fixture) => {
    if (entry.operation === 'own') return validatePlayerProfile(await requestBackend('bid', 'get_players_id_profile', { path: { id: entry.uid } }));
    if (entry.operation === 'set') return setBackendProfileVisibility('bid', entry.uid, entry.hidden, context);
    return getBackendPublicPlayerProfile('bid', entry.uid, entry.target);
  };
  try {
    for (const [key, entry] of Object.entries(fixtures)) {
      payload = entry.data;
      const expected = { ...entry.data };
      if (entry.operation === 'public' && expected.profile) {
        const { avatarKey: _avatarKey, ...display } = expected.profile as Record<string, unknown>;
        expected.profile = display;
      }
      assert.deepEqual(await run(entry), expected, key);
    }
    const own = fixtures.ownFractional.data;
    assert.equal((own.user as Record<string, unknown>).experience, 101.5);
    assert.equal((own.qi as Record<string, unknown>).current, 7.5);
    assert.equal((own.mental as Record<string, unknown>).current, 499.9);
    for (const key of ['setVisible', 'setHidden']) {
      for (const invalid of [undefined, null, !fixtures[key].hidden, 'false', []]) {
        payload = { hideProfile: invalid };
        await assert.rejects(() => run(fixtures[key]), /信息隐藏配置响应不完整/);
      }
    }
    for (const field of ['found', 'hideProfile']) {
      for (const invalid of [undefined, null, 0, 'true', []]) {
        payload = { ...fixtures.publicVisible.data, [field]: invalid };
        await assert.rejects(() => run(fixtures.publicVisible), /查看信息接口数据不完整/);
      }
    }
    payload = { ...fixtures.publicHidden.data, detail: fixtures.publicVisible.data.detail };
    await assert.rejects(() => run(fixtures.publicHidden), /查看信息接口数据不完整/);
    payload = { ...fixtures.publicVisible.data, detail: undefined };
    await assert.rejects(() => run(fixtures.publicVisible), /查看信息接口数据不完整/);
    for (const field of ['id', 'gender', 'realmId']) {
      payload = { ...own, user: { ...(own.user as Record<string, unknown>), [field]: Number.MAX_SAFE_INTEGER + 1 } };
      await assert.rejects(() => run(fixtures.ownFractional), /我的资料响应不完整/);
    }
    for (const resource of ['mental', 'qi']) {
      for (const field of ['cap', 'regenIntervalMinutes']) {
        payload = { ...own, [resource]: { ...(own[resource] as Record<string, unknown>), [field]: 0.5 } };
        await assert.rejects(() => run(fixtures.ownFractional), /我的资料响应不完整/);
      }
    }
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
