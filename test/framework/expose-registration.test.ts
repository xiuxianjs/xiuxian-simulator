import presentGuide from '../../src/response/resGuide';
import type { GameEvent } from '../../src/types/event';
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotGuideButtonsAfterRegistrationAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const rows = [...output.matchAll(/ROBOT_GUIDE_EXPOSE=([^|]+)\|([^|]+)\|(.+)/g)];
assert.equal(rows.length, 3);
const bid = rows[0][1];
const envelopes = Object.fromEntries(rows.map(row => [row[2], JSON.parse(row[3])]));

test('注册和剧情引导使用服务端真实回执并保留引导结果', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const requests: any[] = [];
  let damageDetails = false;
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    requests.push(request);
    const operation = new URL(request.url).pathname.split('/').at(-1);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    const key = operation === 'account.register' ? 'register' : operation === 'guide.continue' ? 'continue' : 'skip';
    assert.equal(body.messageText, { register: '/我是 XXx 男', continue: '/继续', skip: '/跳过引导' }[key]);
    assert.deepEqual(body.arguments, key === 'register' ? { region: '' } : {});
    const envelope = structuredClone(envelopes[key]);
    if (damageDetails && key === 'skip') envelope.data.middleware.guide.completion.renameCards = 'invalid';
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: bid });
  const call = (action: string, input = {}) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
  const registration = await call('register_player', { name: 'XXx', gender: '男' });
  assert.equal(registration.value.ok, true, JSON.stringify(registration.value));
  if (registration.value.ok) {
    const value = registration.value.data as any;
    assert.equal(value.result.code, 'OK');
    assert.equal(value.presentation.protocol, 'system-guide.v1');
    assert.ok(value.presentation.text.includes('系统 · 初入仙途'));
    assert.ok(value.presentation.text.includes('陨星荒野'));
    assert.ok(value.presentation.text.includes('/跳过引导'));
  }
  await call('register_player', { name: 'XXx', gender: '男' });
  assert.equal(requests[0].headers['idempotency-key'], requests[1].headers['idempotency-key']);
  const continued = await call('continue_registration_guide');
  assert.equal(continued.value.ok, true, JSON.stringify(continued.value));
  if (continued.value.ok) {
    assert.equal((continued.value.data as any).guide.action, 'step-3');
    assert.equal((continued.value.data as any).presentation.protocol, 'system-guide.v1');
    assert.ok((continued.value.data as any).presentation.text.includes('宋玉'));
    assert.ok((continued.value.data as any).presentation.text.includes('寻找破绽 · /继续'));
    assert.deepEqual((continued.value.data as any).guide.progress.version, envelopes.continue.data.middleware.guide.progress.version);
  }
  const firstIntentIndex = requests.length;
  assert.equal((await call('continue_registration_guide', { intentId: 'step-1' })).value.ok, true);
  assert.equal((await call('continue_registration_guide', { intentId: 'step-1' })).value.ok, true);
  assert.equal((await call('continue_registration_guide', { intentId: 'step-2' })).value.ok, true);
  assert.equal(requests[firstIntentIndex].headers['idempotency-key'], requests[firstIntentIndex + 1].headers['idempotency-key']);
  assert.notEqual(requests[firstIntentIndex].headers['idempotency-key'], requests[firstIntentIndex + 2].headers['idempotency-key']);
  const beforeInvalidIntent = requests.length;
  assert.equal((await call('continue_registration_guide', { intentId: 'bad intent' })).value.ok, false);
  assert.equal(requests.length, beforeInvalidIntent);
  const skipped = await call('skip_registration_guide');
  assert.equal(skipped.value.ok, true, JSON.stringify(skipped.value));
  if (skipped.value.ok) {
    const guide = (skipped.value.data as any).guide;
    assert.equal(guide.action, 'skipped');
    assert.ok((skipped.value.data as any).presentation.text.includes('/继续引导'));
    assert.deepEqual(guide.completion, envelopes.skip.data.middleware.guide.completion);
    assert.equal(guide.detailsIncomplete, false);
  }
  damageDetails = true;
  const damaged = await call('skip_registration_guide');
  assert.equal(damaged.value.ok, true, JSON.stringify(damaged.value));
  if (damaged.value.ok) {
    assert.equal((damaged.value.data as any).guide.detailsIncomplete, true);
    assert.equal((damaged.value.data as any).guide.completion, undefined);
    assert.equal((damaged.value.data as any).guide.action, 'skipped');
  }
  const before = requests.length;
  assert.equal((await call('register_player', { name: 'XXx\n另一个', gender: '男' })).value.ok, false);
  assert.equal(requests.length, before);
});


test('无 AI 的序章实际气泡先呈现场景，阶段按钮沿用原指令', async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: bid });
  const result = await app.invoke(event, () => presentGuide(event as GameEvent, envelopes.continue.data.middleware));
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 1);
  const text = result.messages[0].text;
  assert.ok(text.includes('序章 · 剑光截雾'));
  assert.ok(text.includes('先将你挡在身后'));
  const nodes = JSON.stringify(result.messages[0].nodes);
  assert.ok(nodes.includes('寻找破绽'));
  assert.ok(nodes.includes('/继续'));
  assert.ok(nodes.includes('/跳过引导'));
  assert.ok(result.actions[result.messages[0].actionIndex].results?.every(receipt => receipt.code === 2000));
});
