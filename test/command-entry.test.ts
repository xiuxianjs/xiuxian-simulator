import { getEventAccessFacts } from '../src/api/bot/access-facts';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import { mockBackendConfig } from './backend-config-helper';
import { getEventCommandEntry, invalidateEventCommandEntry } from '../src/api/bot/command-entry';
import { getEventBackendRobotIdentity } from '../src/api/bot/identity';
import { resolveCommandTransportProfile } from '../src/router';
import type { GameEvent } from '../src/types/event';

const event = (text = '/储物袋'): GameEvent => ({ name: 'message.create', UserId: 'player', MessageText: text, MessageId: 'message-1', Platform: 'qq-bot', Target: { scope: 'group', targetId: 'group' } }) as GameEvent;
const normal = { identity: { bid: 'player', account: { status: 'registered', playerId: 1 } },
  guide: { step: null, version: 0, expiresAt: null },
  captcha: { outcome: 'not_pending', failureCount: 0, remainingAttempts: 3, passedTtlSeconds: -2, muteCount: 0, muteTtlSeconds: -2, muteUnlockTime: '' },
  mute: { muted: false, claimed: false, replyCount: 0, muteTtlSeconds: -2, replyTtlSeconds: -2, muteUnlockTime: '' },
  entry: { maintenance: { disabled: false }, routeAllowed: true, resourcesSettled: false, nativeComebackProcessed: false, featureGuard: { blocked: false } }
};

test('real route matching distinguishes queries, public routes, operations and global task handlers', () => {
  assert.deepEqual(resolveCommandTransportProfile(event()), { checkMute: true, playerEntry: true, trackOperation: false });
  assert.deepEqual(resolveCommandTransportProfile(event('/帮助')), { checkMute: true, playerEntry: false, trackOperation: false, accessFacts: ['realm'] });
  assert.deepEqual(resolveCommandTransportProfile(event('/突破')), { checkMute: true, playerEntry: true, trackOperation: true });
  assert.deepEqual(resolveCommandTransportProfile(event('/主线扫荡 31-4 10')), { checkMute: true, playerEntry: true, trackOperation: true, guards: ['teamMatch', 'seclusion', 'meditation'] });
  for (const text of ['/任务 扫荡', '/任务面板', '/不存在的指令']) {
    assert.deepEqual(resolveCommandTransportProfile(event(text)), { checkMute: false, playerEntry: false, trackOperation: false });
  }
  const interaction = { ...event('/突破'), name: 'interaction.create' } as GameEvent;
  assert.equal(resolveCommandTransportProfile(interaction).trackOperation, false);
});

test('battle guard snapshots share the entry request and require each executed stage', async t => {
  mockBackendConfig(t, { api_url: 'https://guards.test', robot_auth_token: 'test-token' });
  let calls = 0;
  let data: object = { ...normal,
    operation: { checksDisabled: false, challengeRequired: false, operationCount: 1, operationLimit: 100, passedTtlSeconds: -2 },
    teamMatch: { blocked: false }, seclusion: { inSeclusion: false, allowed: true }, meditation: { active: false, allowed: true }
  };
  t.mock.method(axios, 'create', () => ({ request: async (options: { data: string }) => {
    calls++;
    assert.deepEqual(JSON.parse(options.data).guards, ['teamMatch', 'seclusion', 'meditation']);
    return { status: 200, headers: {}, data: JSON.stringify({ data }) };
  } }));
  const e = event('/主线扫荡 31-4 10');
  const result = await getEventCommandEntry(e, resolveCommandTransportProfile(e));
  assert.equal(result?.meditation?.allowed, true);
  for (let i=0; i<3; i++) assert.equal(await getEventCommandEntry(e), result);
  assert.equal((await getEventBackendRobotIdentity(e)).account.playerId, 1);
  assert.equal(calls, 1);
  data = { ...data, meditation: undefined };
  await assert.rejects(getEventCommandEntry(event('/主线扫荡 31-4 10'), resolveCommandTransportProfile(e)), /响应不完整/);
  assert.equal(calls, 2);
  data = { ...data, seclusion: { inSeclusion: true, allowed: false } };
  assert.equal((await getEventCommandEntry(event('/主线扫荡 31-4 10'), resolveCommandTransportProfile(e)))?.seclusion?.inSeclusion, true);
  assert.equal(calls, 3);
});

test('only the known pre-execution rejection permits legacy guard transport', async t => {
  mockBackendConfig(t, { api_url: 'https://old-guards.test', robot_auth_token: 'test-token' });
  const bodies: Record<string, unknown>[] = [];
  const legacy = { ...normal, operation: { checksDisabled: false, challengeRequired: false, operationCount: 1, operationLimit: 100, passedTtlSeconds: -2 } };
  t.mock.method(axios, 'create', () => ({ request: async (options: { data: string }) => {
    const body = JSON.parse(options.data);
    bodies.push(body);
    return body.guards ? { status: 400, headers: {}, data: JSON.stringify({ error: { code: 'INVALID_ARGUMENT', message: '指令入口参数无效' } }) }
      : { status: 200, headers: {}, data: JSON.stringify({ data: legacy }) };
  } }));
  const e = event('/主线扫荡 31-4 10');
  assert.equal((await getEventCommandEntry(e, resolveCommandTransportProfile(e)))?.teamMatch, undefined);
  assert.equal(bodies.length, 2);
  assert.ok(bodies[0].guards);
  assert.equal(bodies[1].guards, undefined);
  await getEventCommandEntry(event('/主线扫荡 31-4 10'), resolveCommandTransportProfile(e));
  assert.equal(bodies.length, 3);
  assert.equal(bodies[2].guards, undefined);
});

test('other invalid arguments do not retry potentially executed stages', async t => {
  mockBackendConfig(t, { api_url: 'https://bad-guards.test', robot_auth_token: 'test-token' });
  let calls = 0;
  t.mock.method(axios, 'create', () => ({ request: async () => {
    calls++;
    return { status: 400, headers: {}, data: JSON.stringify({ error: { code: 'INVALID_ARGUMENT', message: '机器人指令限制阶段顺序无效' } }) };
  } }));
  const e = event('/主线扫荡 31-4 10');
  await assert.rejects(getEventCommandEntry(e, resolveCommandTransportProfile(e)), /阶段顺序无效/);
  assert.equal(calls, 1);
});

test('one aggregate request supplies all stages and identities without extra HTTP requests', async t => {
  mockBackendConfig(t, { api_url: 'https://aggregate.test', robot_auth_token: 'test-token' });
  let calls = 0;
  t.mock.method(axios, 'create', () => ({ request: async (options: { url: string; headers: Record<string,string>; data: string }) => {
    calls++;
    assert.equal(options.url, 'https://aggregate.test/api/v1/robot/command-entry');
    assert.ok(new Headers(options.headers).get('Idempotency-Key'));
    assert.deepEqual(JSON.parse(options.data), { messageText: '/储物袋', checkMute: true, playerEntry: true, trackOperation: false });
    return { status: 200, headers: {}, data: JSON.stringify({ data: normal }) };
  } }));
  const e = event();
  const profile = resolveCommandTransportProfile(e);
  const first = await getEventCommandEntry(e, profile);
  for (let i=0;i<4;i++) assert.equal(await getEventCommandEntry(e), first);
  assert.equal((await getEventBackendRobotIdentity(e)).account.playerId, 1);
  assert.equal(calls, 1);
});

test('cleared guide starts a new idempotency phase and reads fresh state', async t => {
  mockBackendConfig(t, { api_url: 'https://aggregate.test', robot_auth_token: 'test-token' });
  const keys: (string|null)[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (options: { headers: Record<string,string> }) => {
    keys.push(new Headers(options.headers).get('Idempotency-Key'));
    return { status: 200, headers: {}, data: JSON.stringify({ data: keys.length===1 ? { identity: normal.identity, guide: { step: 2, version: 1, expiresAt: null } } : normal }) };
  } }));
  const e = event(); const profile = resolveCommandTransportProfile(e);
  assert.equal((await getEventCommandEntry(e, profile))?.guide?.step, 2);
  invalidateEventCommandEntry(e);
  assert.equal((await getEventCommandEntry(e, profile))?.guide?.step, null);
  assert.equal(keys[1], `${keys[0]}:phase-1`);
});

test('timeouts and malformed snapshots never run legacy state mutations as a retry', async t => {
  mockBackendConfig(t, { api_url: 'https://aggregate.test', robot_auth_token: 'test-token' });
  let calls = 0;
  t.mock.method(axios, 'create', () => ({ request: async () => { calls++; return { status: 200, headers: {}, data: JSON.stringify({ data: { ...normal, mute: undefined } }) }; } }));
  await assert.rejects(getEventCommandEntry(event(), resolveCommandTransportProfile(event())), /响应不完整/);
  assert.equal(calls, 1);
});

test('definitely unsupported backends fall back without probing on every message', async t => {
  mockBackendConfig(t, { api_url: 'https://legacy.test', robot_auth_token: 'test-token' });
  let calls = 0;
  t.mock.method(axios, 'create', () => ({ request: async () => { calls++; return { status: 404, headers: {}, data: '{}' }; } }));
  assert.equal(await getEventCommandEntry(event(), resolveCommandTransportProfile(event())), null);
  assert.equal(await getEventCommandEntry(event(), resolveCommandTransportProfile(event())), null);
  assert.equal(calls, 1);
});

test('a redispatched command on the same event receives fresh checks and a different receipt key', async t => {
  mockBackendConfig(t, { api_url: 'https://redispatch.test', robot_auth_token: 'test-token' });
  const keys: (string|null)[] = [];
  const texts: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (options: { headers: Record<string,string>; data: string }) => {
    keys.push(new Headers(options.headers).get('Idempotency-Key')); texts.push(JSON.parse(options.data).messageText);
    return { status: 200, headers: {}, data: JSON.stringify({ data: normal }) };
  } }));
  const e = event();
  await getEventCommandEntry(e, resolveCommandTransportProfile(e));
  e.MessageText = '/储物袋 道具 丹药';
  await getEventCommandEntry(e, resolveCommandTransportProfile(e));
  assert.deepEqual(texts, ['/储物袋', '/储物袋 道具 丹药']);
  assert.equal(keys[1], `${keys[0]}:phase-1`);
});

test('an uncertain timeout does not issue any fallback request', async t => {
  mockBackendConfig(t, { api_url: 'https://timeout.test', robot_auth_token: 'test-token', api_timeout_ms: 1000 });
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let calls=0;
  t.mock.method(axios, 'create', () => ({ request: (options: {signal: AbortSignal}) => {
    calls++;
    return new Promise((_resolve,reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted')), {once:true}));
  } }));
  const pending = getEventCommandEntry(event(),resolveCommandTransportProfile(event()));
  t.mock.timers.tick(1000);
  await assert.rejects(pending);
  assert.equal(calls,1);
});

test('actual Go aggregate JSON is accepted by the robot SDK and public-route adapter', async t => {
  const output = execFileSync('go', ['test', './internal/httpapi', '-run', '^TestRobotCommandEntryRouteReplayDoesNotRepeatCaptchaFailure$', '-v', '-count=1'], {
    cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024
  });
  const fixture = output.match(/ROBOT_COMMAND_ENTRY_FIXTURE=(.+)/)?.[1];
  assert.ok(fixture);
  mockBackendConfig(t, { api_url: 'https://go-fixture.test', robot_auth_token: 'test-token' });
  t.mock.method(axios, 'create', () => ({ request: async () => ({status: 200, headers: {}, data: fixture}) }));
  const e=event('/帮助');
  const result=await getEventCommandEntry(e,resolveCommandTransportProfile(e));
  assert.equal(result?.identity.account.status,'registered');
  assert.equal(result?.captcha?.outcome,'not_pending');
  assert.equal(result?.mute?.muted,false);
  assert.equal(result?.entry,undefined);
});

test('achievement dispatcher declares social facts and entry validates all social eligibility fields before seeding', async t => {
  const routed = event('/成就 战力 领取');
  assert.ok(resolveCommandTransportProfile(routed).accessFacts?.includes('social'));
  mockBackendConfig(t, { api_url: 'https://social-facts.test', robot_auth_token: 'test-token' });
  let social: object = { ok: true, realmName: '未知', realmNameValue: null, canUseSecondLayerFeature: true, canUseFifthLayerFeature: true, canUseSpar: false, canCreateOrApplyGuild: false };
  t.mock.method(axios, 'create', () => ({ request: async () => ({ status: 200, headers: {}, data: JSON.stringify({ data: { ...normal, accessFacts: { social } } }) }) }));
  const e = event('/我的好友');
  await getEventCommandEntry(e, { checkMute: true, playerEntry: true, trackOperation: false, accessFacts: ['social'] });
  assert.deepEqual(getEventAccessFacts(e, 'player', 1)?.social, social);
  const complete = social;
  for (const incomplete of [{ ok: true, realmName: '未知' }, { ...complete, canUseSpar: undefined }, { ...complete, realmNameValue: 1 }, { ...complete, ok: false }]) {
    social = incomplete;
    const invalid = event('/我的好友');
    await assert.rejects(getEventCommandEntry(invalid, { checkMute: true, playerEntry: true, trackOperation: false, accessFacts: ['social'] }), /社交准入事实响应不完整/);
    assert.equal(getEventAccessFacts(invalid, 'player', 1), undefined);
  }
});
