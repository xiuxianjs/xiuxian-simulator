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
    const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'guide-player', text: step === 4 ? '继续一段序章，不要跳过' : '' });
    for (let i = 0; i < 2; i++) {
      const result = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_guidance_state', {}), 'ai-plugin');
      assert.equal(result.value.ok, true, JSON.stringify(result.value));
      if (result.value.ok) {
        const data = result.value.data as any;
        assert.equal(data.protocol, 'plugin-guidance.v1');
        assert.equal(data.flow, step === 'unregistered' ? 'registration' : step === null ? 'onboarding' : 'prologue');
        assert.equal(data.accountExists, step !== 'unregistered');
        if (step === 4) {
          assert.ok(!data.actions.some((action: any) => action.capability === 'skip_registration_guide'));
          assert.ok(data.goal.includes('不要再要求玩家发送'));
        }
      }
    }
    assert.equal(requests.length, step === 'unregistered' ? 2 : 4);
  });
}

for (const registered of [false, true]) {
  test(`plugin owns overview and only starts after player choice: registered=${registered}`, async t => {
    const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
    t.after(() => app.dispose());
    await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
    const requests: any[] = [];
    t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
      requests.push(request);
      assert.equal(request.method.toLowerCase(), 'get');
      const data = request.url.includes('/identity')
        ? { bid: 'intro-player', account: registered ? { status: 'registered', playerId: 123 } : { status: 'unregistered', playerId: null } }
        : { step: 4, version: 8, expiresAt: null };
      return { status: 200, headers: {}, data: JSON.stringify({ data }) };
    } }));
    const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'intro-player', text: '修仙怎么玩' });
    const read = (requestText: string) => app.invoke({ ...event, MessageText: requestText }, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_guidance_state', { requestText }), 'ai-plugin');
    const introduction = await read('修仙怎么玩');
    assert.equal(introduction.value.ok, true, JSON.stringify(introduction.value));
    if (introduction.value.ok) {
      const state = introduction.value.data as any;
      assert.equal(state.flow, 'overview');
      assert.equal(state.accountExists, registered);
      assert.ok(state.dialogue.text.includes('炼丹'));
      assert.ok(!state.actions.some((action: any) => action.capability === 'register_player'));
    }
    assert.equal(requests.length, 1, 'overview reads identity only');
    const forged = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_guidance_state', { requestText: '开始修仙', conversationMode: 'gameplay' }), 'ai-plugin');
    assert.equal(forged.value.ok, true, JSON.stringify(forged.value));
    if (forged.value.ok) assert.equal((forged.value.data as any).flow, 'overview', 'model paraphrase cannot replace the actual inquiry');
    if (registered) {
      const count = requests.length;
      const ordinary = await app.invoke({ ...event, MessageText: '看看背包' }, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_guidance_state', { conversationMode: 'gameplay' }), 'ai-plugin');
      assert.equal(ordinary.value.ok, true, JSON.stringify(ordinary.value));
      if (ordinary.value.ok) assert.equal((ordinary.value.data as any).flow, 'gameplay');
      assert.equal(requests.length, count + 1, 'ordinary play does not read or progress tutorial');
    }

    const start = await read(registered ? '继续修仙' : '开始修仙');
    assert.equal(start.value.ok, true, JSON.stringify(start.value));
    if (start.value.ok) assert.equal((start.value.data as any).flow, registered ? 'prologue' : 'registration');
    assert.ok(requests.every(request => !request.url.includes('/business/')));
  });
}

test('manual guide resolves narrator slot through optional provider without changing story or commands', async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  await app.mount({ expose: Expose.create().provide({
    name: 'agent.presentation.v1', version: '1.0.0', description: 'fixture',
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

test('conversation contract is plugin-owned static data without identity or progression queries', async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => { throw new Error('conversation contract must not contact backend'); });
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'contract-reader' });
  const result = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_conversation_contract', {}), 'ai-plugin');
  assert.equal(result.value.ok, true, JSON.stringify(result.value));
  if (result.value.ok) {
    const data = result.value.data as any;
    assert.equal(data.protocol, 'plugin-conversation.v1');
    assert.equal(data.provider, 'xiuxian-game');
    const inventory = await app.invoke(event, () => Expose.create().list(), 'ai-plugin');
    const provider = inventory.value.find(item => item.name === 'xiuxian-game' && item.protocol === GAME_EXPOSE_PROTOCOL);
    assert.ok(provider);
    assert.ok(data.confirmations.length > 0);
    for (const action of ['get_peiyuan_confirmation', 'preview_shop_purchase', 'prepare_market_purchase', 'preview_treasure_exploration', 'preview_treasure_free_daily_pack']) assert.equal(data.confirmations.find((item: any) => item.previewAction === action).requiresPreview, true);
    assert.equal(data.preparations.length, 3);
    for (const preparation of data.preparations) {
      assert.equal(provider.actions[preparation.action]?.effect, 'write');
      for (const followup of preparation.followups ?? []) assert.equal(provider.actions[followup.action]?.effect, 'write');
    }
    assert.deepEqual(data.preparations.find((item: any) => item.action === 'consume_item').followups, [{ action: 'get_peiyuan_confirmation', inputField: 'snapshot', resultPath: ['peiyuanPending', 'snapshot'] }]);
    assert.ok(data.preparations.find((item: any) => item.action === 'consume_item').notice.includes('{quantity}'));
    for (const declaration of data.confirmations) {
      assert.ok(provider.actions[declaration.previewAction], declaration.previewAction);
      assert.equal(provider.actions[declaration.action]?.effect, 'write', declaration.action);
      if (declaration.cancelAction) assert.equal(provider.actions[declaration.cancelAction]?.effect, 'write');
    }
    assert.equal(data.confirmations.find((item: any) => item.previewAction === 'preview_soul_path_choose').inputField, 'token');
    assert.equal(data.confirmations.find((item: any) => item.previewAction === 'preview_treasure_exploration').inputField, 'confirmationRef');

    const text = data.rules.join('\n');
    assert.ok(text.includes('branchMenu'));
    assert.ok(text.includes('milestone-handoff'));
    assert.ok(text.includes('放弃也不返还'));
    assert.ok(text.includes('宋玉'));
  }
  assert.equal(result.messages.length, 0);
});

test('plugin request routing uses actual message without backend access', async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => { throw new Error('routing must not contact backend'); });
  for (const [message, active, expected] of [
    ['修仙怎么玩', false, 'matched'], ['看看炼丹', false, 'matched'],
    ['今天天气怎么样', true, 'unmatched'], ['/我', true, 'unmatched'],
    ['男修', true, 'matched'], ['叶飞雨', true, 'ambiguous'],
    ['继续', true, 'ambiguous'], ['你好', false, 'unmatched']
  ] as const) {
    const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'route-player', text: message });
    const result = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'route_conversation', { active, flow: 'registration', hasNameDraft: true, choices: [] }), 'ai-plugin');
    assert.equal(result.value.ok, true, JSON.stringify(result.value));
    if (result.value.ok) assert.equal((result.value.data as any).decision, expected, message);
  }
});

test('plugin execution policy preserves registered observation effects and operation keys without backend access', async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => { throw new Error('execution policy must not contact backend'); });
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'policy-player' });
  const result = await app.invoke(event, async () => {
    const client = Expose.create();
    return { policy: await client.call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_execution_policy', {}), definition: client.list().find(item => item.name === 'xiuxian-game' && item.protocol === GAME_EXPOSE_PROTOCOL) };
  }, 'ai-plugin');
  assert.equal(result.value.policy.ok, true, JSON.stringify(result.value.policy));
  if (result.value.policy.ok) {
    const data = result.value.policy.data as any;
    assert.equal(data.protocol, 'plugin-execution-policy.v1');
    assert.deepEqual(data.actions.filter((item: any) => ['get_onboarding', 'continue_registration_guide', 'perform_onboarding_action'].includes(item.action)), [
      { action: 'get_onboarding', mode: 'fresh' },
      { action: 'continue_registration_guide', mode: 'operation', keyField: 'intentId' },
      { action: 'perform_onboarding_action', mode: 'operation', keyField: 'intentId' }
    ]);
    assert.ok(data.actions.some((item: any) => item.action === 'get_alchemy_recipes' && item.mode === 'fresh'));
    assert.ok(!data.actions.some((item: any) => item.action === 'confirm_alchemy'));
    assert.equal(new Set(data.actions.map((item: any) => item.action)).size, data.actions.length);
    const observations = new Set(['get_meditation_progress', 'get_realm', 'get_emails', 'get_checkin_status', 'get_profile', 'get_storyline_chapters', 'get_storyline_chapter', 'get_cave', 'get_dungeons']);
    assert.deepEqual(data.actions.filter((item: any) => observations.has(item.action)).map((item: any) => item.action).sort(), [...observations].sort());
    for (const declaration of data.actions) {
      const action = result.value.definition!.actions[declaration.action];
      assert.ok(action, `Unregistered policy action: ${declaration.action}`);
      assert.equal(action.effect, observations.has(declaration.action) ? 'unknown' : 'write', declaration.action);
      if (observations.has(declaration.action)) {
        assert.equal(declaration.mode, 'fresh');
        assert.equal(declaration.keyField, undefined);
      }
      if (declaration.keyField) assert.equal((action.inputSchema as any).properties[declaration.keyField].type, 'string');
    }
  }
});
