import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
test('誓约预览通过 Expose 读取真实服务端结果，不提交升级', async t => {
  const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessCompanionCultivationOathV1PreviewConfirm$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
  const match = output.match(/ROBOT_OATH_EXPOSE=(.+)/);
  assert.ok(match);
  const envelope = JSON.parse(match[1]);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/companion.upgrade-oath');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, { confirmed: false });
    assert.equal(body.messageText, '/升级誓约');
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify({ data: envelope }) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_companion_oath_upgrade_preview', {}), 'ai-plugin');
  const run = await call();
  assert.deepEqual(run.errors, []);
  assert.equal(run.value.ok, true, JSON.stringify(run.value));
  if (run.value.ok) {
    const result = run.value.data as any;
    assert.equal(result.success, true);
    assert.equal(result.result.partnerId, envelope.data.partnerId);
    assert.equal(result.result.upgradedBlessingPercent, envelope.data.upgradedBlessingPercent);
  }
  await call();
  assert.notEqual(keys[0], keys[1]);
});

test('誓约升级引用从预览传至确认并保留服务端回执', async t => {
  const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessExposeOathReference$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
  const rows = [...output.matchAll(/ROBOT_COMPANION_CULTIVATION_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(row => ({ op: row[1], args: JSON.parse(row[2]), envelope: JSON.parse(row[4]) }));
  const prepare = rows.find(row => row.op === 'companion.oath-prepare-reference');
  const confirm = rows.find(row => row.op === 'companion.oath-confirm-reference');
  assert.ok(prepare && confirm);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    keys.push(request.headers['idempotency-key']);
    const op = new URL(request.url).pathname.split('/').at(-1);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    const fixture = op === prepare.op ? prepare : confirm;
    assert.equal(op, fixture.op);
    assert.deepEqual(body.arguments, fixture.args);
    return { status: 200, headers: {}, data: JSON.stringify(fixture.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (action: string, input: any) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
  const preview = await call('prepare_companion_oath_upgrade', {});
  assert.equal(preview.value.ok, true, JSON.stringify(preview.value));
  if (!preview.value.ok) return;
  const refreshed = await call('prepare_companion_oath_upgrade', {});
  assert.equal(refreshed.value.ok, true, JSON.stringify(refreshed.value));
  assert.notEqual(keys[0], keys[1]);
  const reference = (preview.value.data as any).result.reference;
  assert.equal(reference, confirm.args.reference);
  const result = await call('confirm_companion_oath_upgrade', { reference });
  assert.equal(result.value.ok, true, JSON.stringify(result.value));
  if (result.value.ok) assert.deepEqual((result.value.data as any).result, confirm.envelope.data.data);
});
