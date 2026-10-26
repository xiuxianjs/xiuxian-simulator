import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import test from 'node:test';
import { mockBackendConfig } from './backend-config-helper';
import { requestBackend } from '../src/api/bot/client';
import { validatePlayerPreferences } from '../src/api/bot/player-preferences-queries';
import { getBackendFriendSettings, setBackendFriendSettings } from '../src/api/bot/friend-settings';
import { setBackendTeamPreference, type TeamPreferenceAction } from '../src/api/bot/team-preferences';
import { setBackendEnumPreference, type EnumPreferenceAction } from '../src/api/bot/enum-preferences';
import { setBackendConfirmationPreference, type ConfirmationPreferenceAction } from '../src/api/bot/confirmation-preferences';

// Actual Go services -> JSON -> SDK -> adapters. This is a transport contract, not deployed route/auth coverage.
test('player preference adapters preserve Go legacy values and verify fixed-field write receipts', async t => {
  const output = execFileSync('go', ['test', './internal/service', '-run', '^TestRobotPreferencesAdapterContractSerialization$', '-count=1', '-v'], {
    cwd: new URL('../../xiuxian-game-server/', import.meta.url),
    env: { ...process.env, GOMODCACHE: process.env.GOMODCACHE ?? '/tmp/xiuxian-go-mod-cache' },
    maxBuffer: 8 * 1024 * 1024
  }).toString();
  const encoded = output.split('\n').find(line => line.includes('PREFERENCE_ADAPTER_FIXTURES='))?.split('PREFERENCE_ADAPTER_FIXTURES=')[1];
  assert.ok(encoded, 'Go service fixtures missing');
  const fixtures = JSON.parse(encoded) as Record<string, Record<string, unknown>>;
  let payload: unknown;
  let lastBody: unknown;
  let lastURL = '';
  let calls = 0;
  const request = { requestId: 'preference-contract-request', idempotencyKey: 'preference-contract-key' };
  const server = createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    lastBody = body ? JSON.parse(body) : undefined;
    lastURL = req.url ?? '';
    calls++;
    if (req.method === 'PATCH') assert.equal(req.headers['idempotency-key'], request.idempotencyKey);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ data: payload }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  mockBackendConfig(t, { api_url: `http://127.0.0.1:${address.port}`, robot_auth_token: 'contract-token' });
  try {
    for (const [key, value] of Object.entries(fixtures).filter(([key]) => key.startsWith('read'))) {
      payload = value;
      const first = validatePlayerPreferences(await requestBackend('player', 'get_players_id_preferences', { path: { id: 1 } }));
      const second = validatePlayerPreferences(await requestBackend('player', 'get_players_id_preferences', { path: { id: 1 } }));
      assert.deepEqual(first, value, key);
      assert.deepEqual(second, first, 'repeated reads retain legacy JSON values');
      assert.equal(lastURL, '/api/v1/players/1/preferences');
    }
    const base = fixtures.read0;
    for (const field of Object.keys(base)) {
      if (field === 'meditationAutoBoost') continue;
      const missing = { ...base }; delete missing[field];
      assert.throws(() => validatePlayerPreferences(missing), /字段不完整/);
      assert.throws(() => validatePlayerPreferences({ ...base, [field]: undefined }), /字段不完整/);
      assert.equal(validatePlayerPreferences({ ...base, [field]: null })[field as keyof typeof base], null);
    }
    for (const value of [null, [], 'text', 1, true]) assert.throws(() => validatePlayerPreferences(value), /数据不完整/);
    assert.deepEqual(validatePlayerPreferences({ ...base, extra: 'excluded' }), base);
    for (const enabled of [false, true]) {
      for (const [key, type, field] of [
        ['approval', 'AUTO_APPROVE_FRIEND_TEAM', 'autoApproveFriendTeam'],
        ['invites', 'TEAM_INVITE_ENABLED', 'teamInviteEnabled'],
        ['energy', 'TEAM_DUNGEON_NO_MENTAL', 'teamDungeonNoMental']
      ] as const) {
        payload = fixtures[`${key}${enabled}`];
        const action = { type, enabled };
        assert.deepEqual(await setBackendTeamPreference('player', 1, action, request), action);
        assert.deepEqual(lastBody, { [field]: enabled });
        payload = { [field]: !enabled };
        await assert.rejects(setBackendTeamPreference('player', 1, action, request), /响应不完整/);
      }
    }
    for (const mode of ['auto', 'manual'] as const) {
      payload = fixtures[`mode${mode}`];
      const action = { type: 'DUNGEON_BATTLE_MODE', mode } as const;
      assert.deepEqual(await setBackendEnumPreference('player', 1, action, request), action);
      assert.deepEqual(lastBody, { dungeonBattleMode: mode });
    }
    for (const rule of ['none', 'all', 'friend', 'companion'] as const) {
      payload = fixtures[`rule${rule}`];
      const action = { type: 'TEAM_AUTO_ACCEPT_INVITE', rule } as const;
      assert.deepEqual(await setBackendEnumPreference('player', 1, action, request), action);
      assert.deepEqual(lastBody, { teamAutoAcceptInvite: rule });
    }
    for (const [key, type, field] of [
      ['spirit', 'CONFIRM_SPIRIT_CRYSTAL', 'confirmSpiritCrystal'],
      ['dao', 'CONFIRM_DAO_CRYSTAL', 'confirmDaoCrystal']
    ] as const) {
      for (const [index, threshold] of [Infinity, 0, 9007199254740992].entries()) {
        payload = fixtures[`${key}${index}`];
        const action = { type, threshold };
        assert.deepEqual(await setBackendConfirmationPreference('player', 1, action, request), action);
        assert.deepEqual(lastBody, { [field]: Number.isFinite(threshold) ? threshold : null });
      }
      for (const threshold of [NaN, -Infinity]) {
        payload = fixtures[`${key}0`];
        await setBackendConfirmationPreference('player', 1, { type, threshold }, request);
        assert.deepEqual(lastBody, { [field]: null });
      }
      payload = {};
      await assert.rejects(setBackendConfirmationPreference('player', 1, { type, threshold: 0 }, request), /响应不完整/);
    }
    for (const uid of [1, 2, 99]) {
      payload = fixtures[`friendRead${uid}`];
      assert.deepEqual(await getBackendFriendSettings('player', uid), payload);
      for (const enabled of [false, true]) {
        payload = fixtures[`friendWrite${uid}${enabled}`];
        assert.deepEqual(await setBackendFriendSettings('player', uid, enabled, request), payload);
        assert.deepEqual(lastBody, { friendRequestEnabled: enabled });
      }
    }
    payload = { canUseFifthLayerFeature: true, realmName: '', isEnabled: false };
    await assert.rejects(setBackendFriendSettings('player', 1, true, request), /状态不一致/);
    for (const value of [null, [], {}, { canUseFifthLayerFeature: true, realmName: undefined, isEnabled: true }]) {
      payload = value;
      await assert.rejects(getBackendFriendSettings('player', 1), /不完整/);
    }
    const beforeInvalidRequests = calls;
    for (const action of [{ type: 'INVALID', rule: 'all' }, { type: 'DUNGEON_BATTLE_MODE', mode: 'invalid' }, { type: 'TEAM_AUTO_ACCEPT_INVITE', rule: 'invalid' }]) {
      await assert.rejects(setBackendEnumPreference('player', 1, action as EnumPreferenceAction, request), /不支持|参数无效/);
    }
    for (const action of [{ type: 'INVALID', threshold: 1 }, ...[-1, 1.5, '1'].map(threshold => ({ type: 'CONFIRM_SPIRIT_CRYSTAL', threshold }))]) {
      await assert.rejects(setBackendConfirmationPreference('player', 1, action as ConfirmationPreferenceAction, request), /不支持|参数无效/);
    }
    await assert.rejects(setBackendTeamPreference('player', 1, { type: 'TEAM_INVITE_ENABLED', enabled: 'false' } as unknown as TeamPreferenceAction, request), /参数无效/);
    assert.equal(calls, beforeInvalidRequests, 'invalid preferences must not submit writes');
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
