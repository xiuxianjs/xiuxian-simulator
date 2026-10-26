import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import { withEventContext } from 'alemonjs';
import { getDirectSend, setDirectSend } from '../node_modules/alemonjs/lib/application/runtime/cbp/processor/transport.js';
import { actionRequestResolves, actionRequestTimeouts } from '../node_modules/alemonjs/lib/application/runtime/cbp/processor/request-registry.js';
import { mockBackendConfig } from './backend-config-helper';
import invitees from '../src/response/referral/invitees/res';
import overview from '../src/response/referral/viewCode/res';
import { getReferralInvitees } from '../src/api/bot/referral-invitees';
import type { GameEvent } from '../src/types/event';

test('real referral handlers render unlimited invitation and actionable paged progress', async t => {
  mockBackendConfig(t, { api_url: 'http://referral.test', robot_auth_token: 'synthetic-token' });
  const emptyPanel = { pendingCount: 0, groups: [] };
  const row = { userId: 123, name: '测试道友', realmName: '测试境界', pendingRewards: 1, claimedRewards: 2,
    nextRealmReward: { goal: '被邀请者达到下一境界', rewards: ['SPIRIT_STONE ×300'] }, nextVipReward: null };
  let payload: unknown = { items: [row], total: 6, page: 1, pageSize: 5 };
  let calls: { method: string; url: string }[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (options: { method: string; url: string }) => {
    calls.push(options);
    const combined = options.url.includes('/robot/business/');
    const data = combined ? {
      success: true, branch: 'business', data: payload,
      middleware: { outcome: 'allow', reason: 'ALLOWED', identity: { bid: 'synthetic-owner', account: { status: 'registered', playerId: 7 } }, replies: [], contextWarnings: [], entry: { maintenance: { disabled: false }, routeAllowed: true, resourcesSettled: true, nativeComebackProcessed: false } }
    } : payload;
    return { status: 200, headers: {}, data: JSON.stringify({ data }) };
  } }));
  const originalSend = getDirectSend();
  let formats: unknown[] = [];
  setDirectSend((raw: { id: string; payload: { action: string; input: { params: { format: unknown } } } }) => {
    assert.equal(raw.payload.action, 'message.send');
    formats.push(structuredClone(raw.payload.input.params.format));
    setImmediate(() => {
      const resolve = actionRequestResolves.get(raw.id);
      const timer = actionRequestTimeouts.get(raw.id);
      if (timer) clearTimeout(timer);
      actionRequestTimeouts.delete(raw.id);
      actionRequestResolves.delete(raw.id);
      assert.ok(resolve);
      resolve([{ code: 2000, message: 'synthetic local receipt', data: null }]);
    });
  });
  t.after(() => setDirectSend(originalSend as Parameters<typeof setDirectSend>[0]));
  const run = async (handler: typeof invitees, text: string) => {
    formats = []; calls = [];
    const event = { name: 'message.create', UserId: 'synthetic-owner', uid: 7, MessageText: text, Platform: 'qq-bot',
      BotId: 'synthetic-bot', MessageId: 'synthetic-message', isPrivate: false, Target: { scope: 'group', targetId: 'synthetic-target' } } as unknown as GameEvent;
    await withEventContext(event, () => {}, () => handler.current(event as never));
    await new Promise<void>(resolve => setImmediate(resolve));
    assert.equal(formats.length, 1);
    return JSON.stringify(formats);
  };
  const rendered = await run(invitees, '/我的邀请');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method.toUpperCase(), 'POST');
  assert.match(calls[0].url, /api\/v2\/robot\/business\/referral\.invitees$/);
  for (const text of ['测试道友', '测试境界', '灵石 ×300', '/查看信息 123', '/邀请入队 123', '/我的邀请 2']) assert.ok(rendered.includes(text), text);
  assert.doesNotMatch(rendered, /SPIRIT_STONE|undefined|充值金额/);
  assert.doesNotMatch(rendered, /\/我的邀请 0/);
  for (const bad of [null, {}, { items: [row], total: 1, page: 2, pageSize: 5 }, { items: [{ ...row, userId: 0 }], total: 1, page: 1, pageSize: 5 }]) {
    payload = bad;
    await assert.rejects(getReferralInvitees('synthetic-owner', 7, 1), /不完整/);
  }
  payload = { code: 'tt-7', inviteCount: 36, inviteLimit: null, pendingRewards: 5,
    rulePanels: { count: emptyPanel, realm_level: emptyPanel, vip_level: emptyPanel } };
  const unlimited = await run(overview, '/邀请码');
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /api\/v2\/robot\/business\/referral\.code$/);
  assert.match(unlimited, /累计邀请：36 人/);
  assert.match(unlimited, /邀请人数无上限/);
  assert.match(unlimited, /分享给新人/);
  assert.doesNotMatch(unlimited, /填邀请码|36\/30/);
  assert.match(unlimited, /\/我的邀请/);
});
