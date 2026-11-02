import { guideText } from '../../src/response/onboarding/aiNarration';
import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import axios from 'axios';
import { Expose, Format, useMessage, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
for (const step of ['unregistered', 4, null] as const) {
  test(`guidance state read is side effect free: ${step}`, async t => {
    const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
    t.after(() => app.dispose());
    await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
    const requests: any[] = [];
    t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
      requests.push(request);
      assert.equal(request.method.toLowerCase(), 'get');
      assert.ok(!request.url.includes('/business/'));
      const data = request.url.includes('/identity')
        ? { bid: 'guide-player', account: step === 'unregistered' ? { status: 'unregistered', playerId: null } : { status: 'registered', playerId: 123 } }
        : { step, version: 8, expiresAt: null };
      return { status: 200, headers: {}, data: JSON.stringify({ data }) };
    } }));
    const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'guide-player' });
    for (let i = 0; i < 2; i++) {
      const result = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_guidance_state', {}), 'ai-plugin');
      assert.equal(result.value.ok, true, JSON.stringify(result.value));
      if (result.value.ok) {
        const data = result.value.data as any;
        assert.equal(data.protocol, 'plugin-guidance.v1');
        assert.equal(data.flow, step === 'unregistered' ? 'registration' : step === null ? 'onboarding' : 'prologue');
        assert.equal(data.accountExists, step !== 'unregistered');
      }
    }
    assert.equal(requests.length, step === 'unregistered' ? 2 : 4);
  });
}

test('manual guide resolves narrator slot through optional provider without changing story or commands', async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  await app.mount({ expose: Expose.create().provide({
    name: 'agent-link.game-narration.v1', version: '1.0.0', description: 'fixture',
    actions: { narrator: Expose.action({
      effect: 'read', description: 'name',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      outputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'], additionalProperties: false },
      handler: async () => ({ name: '大肥鱼' })
    }) }
  }) }, undefined, 'alemonjs-agent-link');
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'name-test' });
  const result = await app.invoke(event, async () => {
    const [message] = useMessage();
    await message.send({ format: Format.create().addText(await guideText('系统：宋玉护在你身前。\n{{guide.name}} · 引导\n/继续')) });
  }, 'xiuxian-game');
  assert.deepEqual(result.errors, []);
  assert.ok(result.messages[0].text.includes('大肥鱼：宋玉'));
  assert.ok(result.messages[0].text.includes('大肥鱼 · 引导'));
  assert.ok(result.messages[0].text.includes('/继续'));
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, 2000);
});

test('name selection calls validation without gender and rejects injected registration arguments', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const requests: any[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    requests.push(request);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.messageText, '/我是 清霜');
    const middleware = { outcome: 'allow', reason: 'UNREGISTERED', identity: { bid: 'name-player', account: { status: 'unregistered', playerId: null } }, replies: [], contextWarnings: [] };
    return { status: 200, headers: {}, data: JSON.stringify({ data: { success: true, branch: 'business', middleware, data: { code: 'NEED_GENDER', data: { playerName: '清霜' } } } }) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'name-player' });
  const call = (name: string) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'choose_registration_name', { name }), 'ai-plugin');
  const valid = await call('清霜');
  assert.equal(valid.value.ok, true, JSON.stringify(valid.value));
  if (valid.value.ok) assert.equal((valid.value.data as any).result.code, 'NEED_GENDER');
  for (const name of ['清霜 男', '清霜\n女', ' 清霜']) assert.equal((await call(name)).value.ok, false);
  assert.equal(requests.length, 1);
});
