import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import axios from 'axios';
import { withEventContext } from 'alemonjs';
import { mockBackendConfig } from './backend-config-helper';
import App from '../src/response-apps/guild/checkin/app';
import { seedEventAccessFacts, getEventAccessFacts } from '../src/api/bot/access-facts';
import { createBackendRequestContext } from '../src/api/bot/context';
import type { GameEvent } from '../src/types/event';

for (const seeded of [false, true]) {
  for (const member of [false, true]) {
    test(`guild checkin ${member ? 'success' : 'not-member'} ${seeded ? 'with' : 'without'} entry facts retains authoritative checks`, async t => {
      mockBackendConfig(t, { api_url: 'https://checkin.test', robot_auth_token: 'test-token' });
      const event = { name: 'message.create', UserId: 'player', MessageId: 'checkin-message', Platform: 'qq-bot' } as GameEvent;
      const calls: string[] = [];
      t.mock.method(axios, 'create', () => ({ request: async (config: { method: string; url: string }) => {
        assert.equal(getEventAccessFacts(event, 'player', 1), undefined);
        calls.push(`${config.method} ${new URL(config.url).pathname}`);
        if (config.method === 'POST') {
          return member
            ? { status: 200, headers: {}, data: JSON.stringify({ data: { guildId: 1, contributionAdded: 1, prestigeAdded: 1, dailyActivityAdded: 1, weeklyActivityAdded: 1, weeklyBonusSpiritStone: 0, weeklyCheckinCount: 1, message: '签到成功' } }) }
            : { status: 409, headers: {}, data: JSON.stringify({ error: { code: 'GUILD_NOT_MEMBER', message: '尚未入宗' } }) };
        }
        return { status: 200, headers: {}, data: JSON.stringify({ data: { canCreateOrApplyGuild: true, realmName: '筑基初期' } }) };
      } }));
      if (seeded) seedEventAccessFacts(event, 'player', 1, { social: { ok: false, realmName: '炼气一层', realmNameValue: '炼气一层', canUseSecondLayerFeature: false, canUseFifthLayerFeature: false, canUseSpar: false, canCreateOrApplyGuild: false } });
      await withEventContext(event, () => {}, async () => {
        const result = await App({ bid: 'player', uid: 1, request: createBackendRequestContext(event) });
        assert.equal(result.code, member ? 'OK' : 'NOT_IN_GUILD');
        if (result.code === 'NOT_IN_GUILD') assert.equal(result.data.canCreateOrApplyGuild, true);
      });
      assert.deepEqual(calls, member ? ['POST /api/v1/players/1/guild/checkin'] : ['POST /api/v1/players/1/guild/checkin', 'GET /api/v1/players/1/social/access']);
    });
  }
}

test('checkin routes do not preload unused social facts', () => {
  const source = readFileSync(new URL('../src/router.ts', import.meta.url), 'utf8');
  assert.match(source, /xiuxian\.use\(\['宗门签到', '联盟签到'\], \(\) => import\('@src\/response\/guild\/checkin\/res'\)\)/);
});
