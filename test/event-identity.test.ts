import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import { mockBackendConfig } from './backend-config-helper';
import { getBackendRobotIdentity, getEventBackendRobotIdentity, invalidateEventBackendRobotIdentity, seedEventBackendRobotIdentity } from '../src/api/bot/identity';
import { requestBackend } from '../src/api/bot/client';
import { logger, withEventContext } from 'alemonjs';
import type { GameEvent } from '../src/types/event';

function setup(t: Parameters<typeof mockBackendConfig>[0]) {
  mockBackendConfig(t, { api_url: 'https://backend.test', robot_auth_token: 'test-only-token' });
  let calls = 0;
  let registered = true;
  t.mock.method(axios, 'create', () => ({ request: async (options: { headers: Record<string, string> }) => {
    calls++;
    const bid = new Headers(options.headers).get('X-Bid');
    return { status: 200, headers: {}, data: JSON.stringify({ data: { bid, account: { status: registered ? 'registered' : 'unregistered', playerId: registered ? 1 : null } } }) };
  } }));
  return { calls: () => calls, setRegistered: (value: boolean) => { registered = value; } };
}

test('five middleware identity reads and concurrent consumers use one request for the same event', async t => {
  const transport = setup(t);
  const event = { UserId: 'player-a' };
  const results = await Promise.all(Array.from({ length: 5 }, () => getEventBackendRobotIdentity(event)));
  assert.equal(transport.calls(), 1);
  assert.ok(results.every(result => result.account.playerId === 1));
  await getEventBackendRobotIdentity(event);
  assert.equal(transport.calls(), 1);
});

test('separate messages observe fresh mappings and account creation invalidates the current event', async t => {
  const transport = setup(t);
  const event = { UserId: 'player-a' };
  transport.setRegistered(false);
  assert.equal((await getEventBackendRobotIdentity(event)).account.status, 'unregistered');
  transport.setRegistered(true);
  assert.equal((await getEventBackendRobotIdentity({ UserId: 'player-a' })).account.status, 'registered');
  invalidateEventBackendRobotIdentity(event);
  assert.equal((await getEventBackendRobotIdentity(event)).account.status, 'registered');
  assert.equal(transport.calls(), 3);
});

test('a changed platform identity cannot reuse another account mapping', async t => {
  const transport = setup(t);
  const event = { UserId: 'player-a' };
  await getEventBackendRobotIdentity(event);
  event.UserId = 'player-b';
  assert.equal((await getEventBackendRobotIdentity(event)).bid, 'player-b');
  assert.equal(transport.calls(), 2);
  await assert.rejects(getEventBackendRobotIdentity({}), /平台身份缺失/);
  assert.equal(transport.calls(), 2);
});

test('business apps reuse the current event snapshot while other targets and standalone reads stay fresh', async t => {
  const transport = setup(t);
  const event = { name: 'message.create', UserId: 'player-a' } as GameEvent;
  seedEventBackendRobotIdentity(event, { bid: 'player-a', account: { status: 'registered', playerId: 1 } });
  await withEventContext(event, () => {}, async () => {
    assert.equal((await getBackendRobotIdentity('player-a')).account.playerId, 1);
    assert.equal(transport.calls(), 0);
    await getBackendRobotIdentity('player-b');
    await getBackendRobotIdentity('player-b');
    assert.equal(transport.calls(), 2);
    invalidateEventBackendRobotIdentity(event);
    await Promise.all([getBackendRobotIdentity('player-a'), getBackendRobotIdentity('player-a')]);
    assert.equal(transport.calls(), 3);
  });
  await getBackendRobotIdentity('player-a');
  await getBackendRobotIdentity('player-a');
  assert.equal(transport.calls(), 5);
  await withEventContext({ ...event }, () => {}, async () => {
    await getBackendRobotIdentity('player-a');
    assert.equal(transport.calls(), 6);
  });
});

test('diagnostic timings correlate operations without logging tokens or payloads', async t => {
  mockBackendConfig(t, { api_url: 'https://backend.test', robot_auth_token: 'private-token', log_api_timings: true });
  const logs: unknown[][] = [];
  t.mock.method(logger, 'info', (...args: unknown[]) => { logs.push(args); });
  t.mock.method(axios, 'create', () => ({ request: async () => ({ status: 200, headers: {}, data: '{"data":{}}' }) }));
  await requestBackend('private-bid', 'getRobotIdentity', { requestId: 'message-trace' });
  assert.equal(logs.length, 1);
  const serialized = JSON.stringify(logs);
  assert.match(serialized, /getRobotIdentity/);
  assert.match(serialized, /message-trace/);
  assert.doesNotMatch(serialized, /private-token|private-bid/);
});
