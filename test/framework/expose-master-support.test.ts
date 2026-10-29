import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { readFileSync } from 'node:fs';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const fixture = JSON.parse(readFileSync(new URL('../fixtures/expose-master.json', import.meta.url), 'utf8')).teach;
test('批量扶持预览和原计划确认保留明细并复用幂等键', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const plan = 'a'.repeat(64); let op = ''; let confirm = false; const keys: string[] = [];
  let data: any;
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, { plan: confirm ? plan : '' }); keys.push(request.headers['idempotency-key']);
    const envelope = structuredClone(fixture); envelope.data.data = data;
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (const action of ['bless', 'gift']) {
    op = `master.${action}-all`; confirm = false;
    const previewAction = action === 'bless' ? 'preview_bless_all_disciples' : 'preview_gift_all_disciples';
    const confirmAction = action === 'bless' ? 'confirm_bless_all_disciples' : 'confirm_gift_all_disciples';
    data = { message: '服务端预览', plan, canConfirm: true, count: 2, items: [{ discipleId: 3, count: 2, ...(action === 'gift' ? { itemKey: 'zhuji' } : {}) }] };
    const preview = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', previewAction, {}), 'ai-plugin');
    const first = await preview(); assert.equal(first.value.ok, true, JSON.stringify(first.value));
    if (first.value.ok) assert.deepEqual((first.value.data as any).result, data);
    await preview(); assert.notEqual(keys.at(-1), keys.at(-2));
    confirm = true; data = { ...data, canConfirm: false, count: 1, items: [{ ...data.items[0], count: 1, reason: '次数已满' }] };
    const execute = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', confirmAction, { plan }), 'ai-plugin');
    const done = await execute(); assert.equal(done.value.ok, true, JSON.stringify(done.value));
    if (done.value.ok) assert.deepEqual((done.value.data as any).result, data);
    await execute(); assert.equal(keys.at(-1), keys.at(-2));
    data = { ...data, plan: 'b'.repeat(64) };
    const mismatch = await execute(); assert.equal(mismatch.value.ok, false);
    const invalid = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', confirmAction, { plan: 'short' }), 'ai-plugin');
    assert.equal(invalid.value.ok, false);
  }
});
