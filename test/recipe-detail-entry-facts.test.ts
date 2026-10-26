import axios from 'axios';
import { mockBackendConfig } from './backend-config-helper';
import { getEventCommandEntry } from '../src/api/bot/command-entry';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveCommandTransportProfile } from '../src/router';
import type { GameEvent } from '../src/types/event';

const event = (MessageText: string): GameEvent => ({ name: 'message.create', UserId: 'player', MessageText, MessageId: 'recipe-message', Platform: 'qq-bot', Target: { scope: 'group', targetId: 'group' } }) as GameEvent;

for (const text of ['/丹方详情', '/丹方详情   ', '/丹方详情 abc', '/丹方详情 0', '/丹方详情 -1', '/丹方详情 0x10', '/丹方详情 0.5', '!丹方详情 abc', '＃丹方详情 0']) {
  test(`recipe parameter hint omits only unused alchemy facts: ${text}`, () => {
    assert.deepEqual(resolveCommandTransportProfile(event(text)), { checkMute: true, playerEntry: true, trackOperation: false });
  });
}

for (const text of ['/丹方详情 1', '/丹方详情 1x', '/丹方详情 01', '/丹方详情 +1', '/丹方详情 1.5', '/丹方详情 1 ignored', '/丹方详情 ' + '9'.repeat(400)]) {
  test(`recipe detail preserves renderer parseInt access semantics: ${text.slice(0, 35)}`, () => {
    assert.deepEqual(resolveCommandTransportProfile(event(text)), { checkMute: true, playerEntry: true, trackOperation: false, accessFacts: ['alchemy'] });
  });
}

test('other alchemy commands retain entry facts and their normal checks', () => {
  for (const text of ['/丹方', '/查看丹方', '/丹方列表', '/炼丹师进阶', '/一键炼丹']) {
    assert.deepEqual(resolveCommandTransportProfile(event(text)).accessFacts, ['alchemy']);
  }
  assert.deepEqual(resolveCommandTransportProfile(event('/不存在')), { checkMute: false, playerEntry: false, trackOperation: false });
});

test('valid and parameter-hint commands keep one entry HTTP call and all safety stages', async t => {
  mockBackendConfig(t, { api_url: 'https://recipe-entry.test', robot_auth_token: 'test-token' });
  const bodies: Record<string, unknown>[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (options: { data: string }) => {
    const body = JSON.parse(options.data);
    bodies.push(body);
    const data = {
      identity: { bid: 'player', account: { status: 'registered', playerId: 1 } },
      guide: { step: null, version: 0, expiresAt: null },
      captcha: { outcome: 'not_pending', failureCount: 0, remainingAttempts: 3, passedTtlSeconds: -2, muteCount: 0, muteTtlSeconds: -2, muteUnlockTime: '' },
      mute: { muted: false, claimed: false, replyCount: 0, muteTtlSeconds: -2, replyTtlSeconds: -2, muteUnlockTime: '' },
      entry: { maintenance: { disabled: false }, routeAllowed: true, resourcesSettled: false, nativeComebackProcessed: false, featureGuard: { blocked: false } },
      ...(body.accessFacts ? { accessFacts: { alchemy: { canUse: true, needGuide: false, currentStep: null, message: '', reasonCode: 'ACCESS_OK' } } } : {})
    };
    return { status: 200, headers: {}, data: JSON.stringify({ data }) };
  } }));
  for (const text of ['/丹方详情', '/丹方详情 abc', '/丹方详情 0', '/丹方详情 -1', '/丹方详情 1x']) {
    const e = event(text);
    const before = bodies.length;
    const result = await getEventCommandEntry(e, resolveCommandTransportProfile(e));
    assert.equal(result?.entry?.routeAllowed, true);
    assert.equal(bodies.length - before, 1);
    assert.equal(bodies.at(-1)?.checkMute, true);
    assert.equal(bodies.at(-1)?.playerEntry, true);
    assert.equal(bodies.at(-1)?.trackOperation, false);
    assert.deepEqual(bodies.at(-1)?.accessFacts, text.endsWith('1x') ? ['alchemy'] : undefined);
  }
});
