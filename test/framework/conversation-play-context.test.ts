import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { gameExpose } from '../../src/expose';
import { isFreshObservation } from '../../src/expose/execution-policy';
import { gameGuidance } from '../../src/agent-play/game-guidance';
import { rememberGameplay, guidanceSession, rememberDeliveredDialogue, gameConversationContinuation } from '../../src/agent-play/guidance-session';

after(() => shutdownLogger());
const config = { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'fixture' } } };

for (const [text, expected] of [
  ['带我修行', 'matched'], ['带我继续修行', 'matched'], ['带我接着修行', 'matched'],
  ['/带我继续修行', 'unmatched'], ['翻译带我继续修行', 'unmatched']
]) test(`manual-to-dialogue handoff without a prior session: ${text}`, async t => {
  const app = createTestApp({ config });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => { throw new Error('Routing must not query or advance the game'); });
  const result = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'manual-handoff', text }),
    () => Expose.create().call('xiuxian.player.v1', 'xiuxian-game', 'route_conversation', { active: false }), 'alemonjs-agent-link');
  assert.equal(result.value.ok, true);
  assert.equal((result.value as any).data.decision, expected);
  assert.deepEqual(result.messages, []);
});

test('real registry supplies play directory, exact effects and explicit observation policy without backend access', async t => {
  const app = createTestApp({ config });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => { throw new Error('catalog must not read backend'); });
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'play-catalog', text: '看看炼丹' });
  const run = await app.invoke(event, async () => {
    const client = Expose.create();
    const catalog = client.list('xiuxian.player.v1')[0];
    const result = await client.call('xiuxian.player.v1', 'xiuxian-game', 'get_play_context', {});
    assert.equal(result.ok, true, JSON.stringify(result));
    const context = (result as any).data;
    assert.equal(context.topic, 'alchemy');
    assert.ok(context.directory.length >= 10);
    for (const capability of context.capabilities) {
      assert.equal(capability.effect, catalog.actions[capability.action].effect);
      assert.equal(capability.description, catalog.actions[capability.action].description);
    }
    assert.equal(context.capabilities.find((item: any) => item.action === 'get_alchemy_dashboard').effect, 'write');
    const policy = await client.call('xiuxian.player.v1', 'xiuxian-game', 'get_execution_policy', {});
    assert.equal(policy.ok, true);
    const actions = (policy as any).data.actions;
    assert.ok(actions.length > 128, 'large game policy must not be artificially capped at 128');
    assert.ok(actions.some((item: any) => item.action === 'get_alchemy_recipes' && item.mode === 'fresh'));
    assert.ok(actions.some((item: any) => item.action === 'get_forge_overview' && item.mode === 'fresh'));
    for (const name of ['confirm_alchemy', 'confirm_forge', 'start_meditation', 'get_alchemy_dashboard']) {
      assert.equal(isFreshObservation(name), false, name);
      assert.ok(!actions.some((item: any) => item.action === name && item.mode === 'fresh'));
    }
  }, 'ai-plugin');
  assert.deepEqual(run.errors, []);
});

for (const registered of [true, false]) test(`ordinary gameplay respects authoritative registration without forcing tutorial: registered=${registered}`, async t => {
  const app = createTestApp({ config });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const requests: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    requests.push(request.url);
    assert.ok(request.url.includes('/identity'), 'ordinary play bootstrap must not advance/read the prologue cursor');
    return { status: 200, headers: {}, data: JSON.stringify({ data: { bid: 'play-identity', account: registered ? { status: 'registered', playerId: 123 } : { status: 'unregistered', playerId: null } } }) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'play-identity', messageId: `bootstrap-${registered}`, text: '看看背包材料' });
  const run = await app.invoke(event, async () => {
    const tools = [{ name: 'expose_read', execute: (args: any, context: any) => Expose.create().call(args.protocol, args.provider, args.action, JSON.parse(args.argumentsJson), { signal: context.signal }) }];
    const flow = gameGuidance(tools, event.MessageText);
    const prompt = await flow.prepare({ signal: new AbortController().signal });
    assert.match(prompt, /修仙玩法接续资料/);
    assert.equal((guidanceSession()?.state as any).flow, registered ? 'gameplay' : 'registration');
  }, 'alemonjs-agent-link');
  assert.deepEqual(run.errors, []);
  assert.equal(requests.length, 1);
});

for (const text of ['查看材料', '返回玩法目录', '继续新手引导', '选择这本功法']) test(`delivered navigation participates in plugin routing: ${text}`, async t => {
  const app = createTestApp({ config });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: `navigation-${encodeURIComponent(text)}`, text });
  const run = await app.invoke(event, async () => {
    rememberGameplay('get_inventory', { ok: true, data: { items: [] } }, '系统', { category: 'material', page: 2 }, 'inventory');
    rememberDeliveredDialogue(`[[${text}]]`);
    const state = await Expose.create().call('xiuxian.player.v1', 'xiuxian-game', 'get_play_context', {});
    assert.equal(state.ok, true);
    assert.equal((state as any).data.current.lastArgumentsJson, '{"category":"material","page":2}');
    const route = await Expose.create().call('xiuxian.player.v1', 'xiuxian-game', 'route_conversation', gameConversationContinuation());
    assert.equal((route as any).data.decision, 'matched');
  }, 'alemonjs-agent-link');
  assert.deepEqual(run.errors, []);
});

for (const text of ['帮我买手机', '帮我写修仙代码', '翻译这份炼丹介绍', '今天吃什么']) test(`game conversation does not capture unrelated requests: ${text}`, async t => {
  const app = createTestApp({ config });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const result = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'other-topic', text }), () => Expose.create().call('xiuxian.player.v1', 'xiuxian-game', 'route_conversation', { active: false }), 'alemonjs-agent-link');
  assert.equal((result.value as any).data.decision, 'unmatched');
});

test('switching topic before a business call survives short replies and returning to directory clears focus only', async t => {
  const app = createTestApp({ config });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => { throw new Error('navigation must not call backend'); });
  const event = (text: string) => app.events.privateMessage({ platform: 'qq-bot', userId: 'topic-switch', messageId: text, text });
  const start = await app.invoke(event('炼丹'), async () => {
    rememberGameplay('get_inventory', { ok: true, data: { items: [] } }, '系统', { page: 2 }, 'inventory');
    const session = guidanceSession()!;
    session.offers = [{ action: 'confirm_alchemy', reference: 'original-ref', label: '原确认', messageId: 'preview', shown: true, submitted: false }];
    const route = await Expose.create().call('agent.conversation.v1', 'xiuxian-game', 'route', { aiEnabled: true });
    assert.equal((route as any).data.decision, 'claim');
    assert.equal(session.selectedPlayTopic, 'alchemy');
  }, 'alemonjs-agent-link');
  assert.deepEqual(start.errors, []);
  const followup = await app.invoke(event('一炉'), async () => {
    const context = await Expose.create().call('xiuxian.player.v1', 'xiuxian-game', 'get_play_context', {});
    assert.equal((context as any).data.topic, 'alchemy');
    assert.equal((context as any).data.current.lastAction, 'get_inventory');
    assert.equal((context as any).data.current.lastActionTopic, 'inventory');
    assert.equal((context as any).data.current.lastArgumentsJson, '{"page":2}');
    rememberGameplay('get_alchemy_recipes', { ok: true, data: {} }, '系统', {});
    assert.equal(guidanceSession()!.play!.topic, 'alchemy');
  }, 'alemonjs-agent-link');
  assert.deepEqual(followup.errors, []);
  const menu = await app.invoke(event('返回玩法目录'), async () => {
    const route = await Expose.create().call('agent.conversation.v1', 'xiuxian-game', 'route', { aiEnabled: true });
    assert.equal((route as any).data.decision, 'reply');
    const context = await Expose.create().call('xiuxian.player.v1', 'xiuxian-game', 'get_play_context', {});
    assert.equal((context as any).data.topic, '');
    assert.equal((context as any).data.current.lastAction, 'get_alchemy_recipes');
    assert.equal(guidanceSession()!.offers![0].reference, 'original-ref', 'navigation must not rewrite or cancel original confirmation');
  }, 'alemonjs-agent-link');
  assert.deepEqual(menu.errors, []);
});

for (const text of ['修仙怎么玩', '炼丹怎么玩']) test(`overview follows explicit question rather than old gameplay topic: ${text}`, async t => {
  const app = createTestApp({ config });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.ok(request.url.includes('/identity'));
    return { status: 200, headers: {}, data: JSON.stringify({ data: { bid: 'overview-topic', account: { status: 'registered', playerId: 123 } } }) };
  } }));
  const result = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'overview-topic', text }), async () => {
    rememberGameplay('get_inventory', { ok: true, data: {} }, '系统', {}, 'inventory');
    guidanceSession()!.selectedPlayTopic = 'inventory';
    const response = await Expose.create().call('xiuxian.player.v1', 'xiuxian-game', 'get_guidance_state', { conversationMode: 'gameplay' });
    assert.equal(response.ok, true, JSON.stringify(response));
    const state = (response as any).data;
    assert.equal(state.flow, 'overview');
    assert.equal(state.dialogue.choices[0], text === '修仙怎么玩' ? '继续修仙' : '查看炼丹');
    assert.ok(!state.dialogue.text.includes('我们可以先了解背包'));
  }, 'alemonjs-agent-link');
  assert.deepEqual(result.errors, []);
});
