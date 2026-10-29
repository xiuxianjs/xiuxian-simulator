import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { readFileSync } from 'node:fs';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
// Responses captured from the Go robot business tests, including real settlement fields.
const fixtures = JSON.parse(readFileSync(new URL('../fixtures/expose-master.json', import.meta.url), 'utf8'));
test('师门查询、批量传功和称号领取保留服务端回执与幂等语义', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = { op: 'master.info', action: 'get_master_info', envelope: fixtures.info };
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${current.op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, {});
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (current of [current, { op: 'master.teach-all', action: 'teach_all_disciples', envelope: fixtures.teach }, { op: 'master.title-claim', action: 'claim_master_title', envelope: fixtures.title }]) {
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', current.action, {}), 'ai-plugin');
    const run = await call();
    assert.deepEqual(run.errors, []);
    assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (run.value.ok) {
      const result = (run.value.data as any).result;
      if (current.op === 'master.info') {
        assert.deepEqual(result.discipleIds, [3]);
        assert.deepEqual(JSON.parse(result.infoJson), fixtures.info.data.data);
      } else if (current.op === 'master.teach-all') {
        assert.deepEqual(result.items, fixtures.teach.data.data.items);
        assert.equal(result.count, 3);
      } else assert.equal(result.title, fixtures.title.data.data.title);
    }
    await call();
    if (current.op === 'master.info') assert.notEqual(keys.at(-1), keys.at(-2));
    else assert.equal(keys.at(-1), keys.at(-2));
  }
});

test('单个徒弟操作和拜师传递真实目标，拒绝错误回执并保留失败', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let op = 'master.teach';
  let response: any;
  let expectedArgs: Record<string, unknown> = {};
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, expectedArgs);
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(response) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (const [operation, action, input] of [
    ['master.teach', 'teach_disciple', { targetUid: 2 }],
    ['master.bless', 'bless_disciple', { targetUid: 2 }],
    ['master.gift', 'gift_disciple_pill', { targetUid: 2, itemKey: 'zhuji' }],
    ['master.apply', 'apply_for_master', { targetUid: 2 }]
  ] as const) {
    op = operation; response = fixtures[op];
    expectedArgs = { targetArg: '2', ...('itemKey' in input ? { itemKey: input.itemKey } : {}) };
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
    const run = await call();
    assert.deepEqual(run.errors, []); assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (run.value.ok) assert.equal((run.value.data as any).result.targetUid, 2);
    await call(); assert.equal(keys.at(-1), keys.at(-2));
    response = structuredClone(fixtures[op]); response.data.data.targetUid = 3;
    const mismatch = await call();
    assert.equal(mismatch.value.ok, false);
  }
  op = 'master.teach'; expectedArgs = { targetArg: '2' };
  response = structuredClone(fixtures.teach); response.data.success = false; delete response.data.data;
  const rejected = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'teach_disciple', { targetUid: 2 }), 'ai-plugin');
  assert.equal(rejected.value.ok, true, JSON.stringify(rejected.value));
  if (rejected.value.ok) assert.equal((rejected.value.data as any).success, false);
  const invalid = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'teach_disciple', { targetUid: 0 }), 'ai-plugin');
  assert.equal(invalid.value.ok, false);
  op = 'master.graduation-apply'; expectedArgs = {};
  response = structuredClone(fixtures.title); response.data.data = { message: '申请已提交' };
  const run = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'apply_master_graduation', {}), 'ai-plugin');
  assert.equal(run.value.ok, true, JSON.stringify(run.value));
  if (run.value.ok) assert.equal((run.value.data as any).result.message, '申请已提交');
});
