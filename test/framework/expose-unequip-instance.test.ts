import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
test('按实例卸下装备保留成功、未穿戴和缓存失败状态', async t => {
  const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposeUnequipInstance$', '-v', '-count=1'], {
    cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8'
  }).toString();
  const rows = [...output.matchAll(/EXPOSE_UNEQUIP_INSTANCE=([^|]+)\|(.+)/g)].map(match => ({ state: match[1], envelope: JSON.parse(match[2]) }));
  assert.equal(rows.length, 5);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0];
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/equipment.unequip-instance');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, { instanceId: 1 });
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (input: any) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'unequip_equipment_by_id', input), 'ai-plugin');
  for (current of rows) {
    const result = await call({ instanceId: 1 });
    assert.equal(result.value.ok, true, JSON.stringify(result.value));
    if (result.value.ok) assert.deepEqual((result.value.data as any).result, current.envelope.data.data);
    if (current.state === 'cache-fault' && result.value.ok) assert.equal((result.value.data as any).result.stage, 'updated');
    if (current.state === 'write-fault' && result.value.ok) assert.equal((result.value.data as any).result.stage, 'write_uncertain');
  }
  assert.equal(new Set(keys).size, 1);
  const invalid = await call({ instanceId: 0 });
  assert.equal(invalid.value.ok, false);
  assert.equal(keys.length, 5);
  current = { ...rows[0], envelope: structuredClone(rows[0].envelope) };
  current.envelope.data.data.stage = 'updated';
  const malformed = await call({ instanceId: 1 });
  assert.equal(malformed.value.ok, false);
});

test('装备详情到按实例卸下：旧状态拒绝后刷新并卸下当前实例', async t => {
  const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposeUnequipDetailChain$', '-v', '-count=1'], {
    cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8'
  }).toString();
  const extract = (name: string) => { const match = output.match(new RegExp(`EXPOSE_UNEQUIP_CHAIN_${name}=(.+)`)); assert.ok(match); return JSON.parse(match[1]); };
  const fixtures = [extract('OLD'), extract('STALE'), extract('FRESH'), extract('DONE')];
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let step = 0;
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    const detail = step === 0 || step === 2;
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${detail ? 'equipment.detail' : 'equipment.unequip-instance'}`);
    assert.deepEqual(body.arguments, detail ? { typeName: '武器' } : { instanceId: step === 1 ? 1 : 2 });
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(fixtures[step++]) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (name: string, input: any) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', name, input), 'ai-plugin');
  const old = await call('get_equipped_detail', { typeName: '武器' });
  assert.equal(old.value.ok, true, JSON.stringify(old.value));
  if (!old.value.ok) return;
  const stale = await call('unequip_equipment_by_id', { instanceId: (old.value.data as any).result.item.id });
  assert.equal(stale.value.ok, true, JSON.stringify(stale.value));
  if (stale.value.ok) assert.equal((stale.value.data as any).result.outcome, 'not_equipped');
  const fresh = await call('get_equipped_detail', { typeName: '武器' });
  assert.equal(fresh.value.ok, true, JSON.stringify(fresh.value));
  if (!fresh.value.ok) return;
  assert.notEqual(keys[0], keys[2]);
  const done = await call('unequip_equipment_by_id', { instanceId: (fresh.value.data as any).result.item.id });
  assert.equal(done.value.ok, true, JSON.stringify(done.value));
  if (done.value.ok) assert.equal((done.value.data as any).result.outcome, 'unequipped');
});
