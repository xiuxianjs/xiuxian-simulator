import pluginConversationHandler from '../../../alemonjs-agent-link/lib/response/dsh/plugin-conversation.js';
import { conversationLifecycle } from '../../src/agent-play/lifecycle.ts';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runDSHChat } from '../../../alemonjs-agent-link/lib/response/dsh/chat.js';
import { getDSHConfig } from '../../../alemonjs-agent-link/lib/dsh/client.js';
import { getModuleRuntime } from '../../../alemonjs-agent-link/lib/agent/modules.js';
import { closeProductObservability } from '../../../alemonjs-agent-link/lib/observability/product.js';
import { advanceGamePresentation } from '../../src/agent-play/game-progress.ts';
import { interruptPluginConversations } from '../../../alemonjs-agent-link/lib/agent/plugin-conversation.js';
import { rememberGameplay } from '../../src/agent-play/guidance-session.ts';
import { gameGuidance } from '../../src/agent-play/game-guidance.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestApp } from 'alemonjs/testing';
import { Expose, registerExpose, useMessage } from 'alemonjs';
import { rememberGuidance, rememberRegistrationName, guidanceSession, endGuidance } from '../../src/agent-play/guidance-session.ts';
import { createChatReplyFormat } from '../../../alemonjs-agent-link/lib/dsh/reply-format.js';
import guidance from '../helpers/agent-play-message.ts';

test('AI guide renders real no-prefix buttons and isolates narrator/draft by player', async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const event = app.events.privateMessage({ platform: 'qq-bot', botId: 'fish', userId: 'guide-human' });
  const result = await app.runHandler(async () => {
    registerExpose('xiuxian-game', [{ name: 'xiuxian.player.v1', description: 'fixture', actions: { get_guidance_state: Expose.action({ description: 'state', effect: 'read', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, outputSchema: { type: 'object', properties: {}, additionalProperties: false }, handler: async () => ({}) }) } }]);
    rememberGuidance({ accountExists: false }, '大肥鱼');
    rememberRegistrationName('柠檬');
    assert.equal(guidanceSession().registrationName, '柠檬');
    rememberGuidance({ accountExists: false }, '大肥鱼');
    assert.equal(guidanceSession().registrationName, '柠檬');
    assert.equal(guidanceSession({ Platform: 'qq-bot', BotId: 'fish', UserId: 'other' }), undefined);
    const [message] = useMessage();
    await message.send({ format: createChatReplyFormat(gameGuidance([], '').append('{{guide.name}}：宋玉正在山道等你。\n[[男修]] [[女修]] [[退出引导]]'), 'qq-bot') });
    rememberGuidance({ accountExists: true }, '大肥鱼');
    assert.equal(guidanceSession().registrationName, undefined);
    endGuidance(event);
  }, event, 'alemonjs-agent-link');
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 1);
  const nodes = JSON.stringify(result.messages[0].nodes);
  assert.ok(nodes.includes('大肥鱼：宋玉'));
  assert.ok(nodes.includes('男修'));
  assert.ok(!nodes.includes('{{guide.name}}'));
  assert.ok(!nodes.includes('/男修'));
  assert.ok(result.actions[result.messages[0].actionIndex].results.every(r => r.code === 2000));
});

for (const text of ['/我', '暂离', '退出AI游玩', '退出引导', '继续']) {
  test(`active guidance routing and disabled fallback: ${text}`, async t => {
    const app = createTestApp({ config: { 'alemonjs-agent-link': { aiEnabled: false } } });
    t.after(() => app.dispose());
    const event = app.events.privateMessage({ platform: 'qq-bot', botId: 'fish', userId: `routing-${encodeURIComponent(text)}`, text });
    const result = await app.runHandler(async () => {
      rememberGuidance({ accountExists: true }, '大肥鱼');
      await guidance();
    }, event, 'alemonjs-agent-link');
    assert.deepEqual(result.errors, []);
    if (text === '/我') { assert.equal(result.messages.length, 0); assert.equal(result.nextCalls.length, 1); }
    else {
      assert.equal(result.messages.length, 1);
      assert.ok(result.messages[0].text.includes('先歇一会儿'));
      assert.ok(!result.messages[0].text.includes('退出AI'));
      const cleared = await app.runHandler(() => { assert.equal(guidanceSession(), undefined); }, event, 'alemonjs-agent-link');
      assert.deepEqual(cleared.errors, []);
    }
    // Slash requests must retain the original event and never emit an AI answer.
    if (text !== '/我') assert.equal(result.nextCalls.length, 0);
  });
}


test('discovered authoritative flow activates AI session through the real Expose tool', async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'flow-discovery' });
  const result = await app.runHandler(async () => {
    registerExpose('xiuxian-game', [conversationLifecycle, { name: 'xiuxian.player.v1', description: 'fixture', actions: {
      get_guidance_state: Expose.action({ description: 'state', effect: 'read',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        outputSchema: { type: 'object', properties: { protocol: { type: 'string' }, accountExists: { type: 'boolean' } }, required: ['protocol', 'accountExists'], additionalProperties: false },
        handler: async () => ({ protocol: 'plugin-guidance.v1', accountExists: false })
      })
    } }]);
    const tools = [{ name: 'expose_read', execute: args => Expose.create().call(args.protocol, args.provider, args.action, JSON.parse(args.argumentsJson)) }];
    const flow = gameGuidance(tools, '修仙怎么玩');
    assert.ok(flow.instruction.includes('get_guidance_state'));
    const value = await tools[0].execute({ protocol: 'xiuxian.player.v1', provider: 'xiuxian-game', action: 'get_guidance_state', argumentsJson: '{}' });
    assert.equal(value.ok, true);
    assert.equal(guidanceSession().state.accountExists, false);
    assert.equal(flow.hasReceipts(), true);
    endGuidance(event);
  }, event, 'alemonjs-agent-link');
  assert.deepEqual(result.errors, []);
});

for (const registered of [false, true, 'gameplay', 'delivery-failure']) test(`bootstrap reads state before model and prevents old slash reply: registered=${registered}`, async t => {
  const root = await mkdtemp(join(tmpdir(), 'guide-bootstrap-'));
  const app = createTestApp({ config: { db: { dialect: 'sqlite', sqlite: { storage: join(root, 'db.sqlite') } }, 'alemonjs-agent-link': {
    apiKey: 'fixture-bootstrap', model: 'fixture', runtimeMode: 'chat-only', stateBackend: 'local', privateChatAccess: 'all',
    budget: { enabled: false }, workspaceRoot: join(root, 'work'), dshHomeRoot: join(root, 'home'),
    modules: { disabled: ['opinions', 'stickers'], settings: { memory: { automatic: false }, mood: { modelJudge: false }, expression: { automatic: false, socialPolish: false }, proactive: { autoSubscribe: false } } }
  } } });
  app.actions.on('message.send', () => [{ code: registered === 'delivery-failure' ? 4000 : 2000, data: { id: 'game-origin-reply', referenceId: 'game-origin-ref' } }]);
  app.actions.on('mention.get', () => [{ code: 2000, data: [] }]);
  app.apis.on('getMessageSeq', () => [{ code: 2000, data: 1 }]);
  let reads = 0, modelCalls = 0, config;
  const original = globalThis.fetch;
  const previousSql = globalThis.sequelize;
  delete globalThis.sequelize;
  globalThis.fetch = async (_url, init) => {
    assert.equal(reads, registered === 'gameplay' ? 0 : 1, 'tutorial state is required only for tutorial requests');
    const body = JSON.parse(init.body);
    if (registered !== 'gameplay') assert.ok(body.messages.some(message => typeof message.content === 'string' && message.content.includes('本轮已执行的权威引导状态查询')));
    modelCalls++;
    if ((registered === 'gameplay' && modelCalls === 3) || (registered !== 'gameplay' && modelCalls === 2)) {
      assert.ok(body.messages.some(message => typeof message.content === 'string' && /本轮已核实|自然语言和无斜杠选项/u.test(message.content)));
      return Response.json({ choices: [{ message: { content: registered === 'gameplay' ? '背包已查到。[[查看材料]]' : registered === true ? '角色已经登记好了，剧情尚未推进。[[继续]]' : '直接回复名字就可以。', }, finish_reason: 'stop' }] });
    }
    if (registered === 'gameplay') return Response.json({ choices: [{ message: modelCalls === 1
      ? { content: null, tool_calls: [{ id: 'inventory-read', type: 'function', function: { name: 'expose_read', arguments: JSON.stringify({ protocol: 'xiuxian.player.v1', provider: 'xiuxian-game', action: 'get_inventory', argumentsJson: '{}' }) } }] }
      : { content: '背包已查到，可以继续选择，也可以退出AI。[[查看材料]] [[退出AI模式]]' }, finish_reason: modelCalls === 1 ? 'tool_calls' : 'stop' }] });
    return Response.json({ choices: [{ message: { content: registered === true ? '角色还没登记，先重新注册。' : '道号还是没登记上呀。发“/我是 柠檬”就行，一字不多。' }, finish_reason: 'stop' }] });
  };
  try {
    const event = app.events.privateMessage({ platform: 'qq-bot', userId: `bootstrap-human-${registered}`, text: registered === 'gameplay' ? '看看背包' : '修仙道号还没登记吗' });
    const result = await app.runHandler(async () => {
      registerExpose('xiuxian-game', [conversationLifecycle, { name: 'xiuxian.player.v1', description: 'fixture', actions: {
        get_inventory: Expose.action({ description: 'inventory', effect: 'read', inputSchema: { type: 'object', properties: {}, additionalProperties: false },
          outputSchema: { type: 'object', properties: { count: { type: 'integer' } }, required: ['count'], additionalProperties: false }, handler: async () => ({ count: 3 }) }),
        get_guidance_state: Expose.action({ description: 'state', effect: 'read',
          inputSchema: { type: 'object', properties: {}, additionalProperties: false },
          outputSchema: { type: 'object', properties: { protocol: { type: 'string' }, flow: { type: 'string' }, accountExists: { type: 'boolean' }, dialogue: { type: 'object', properties: { text: { type: 'string' }, choices: { type: 'array', items: { type: 'string' } } }, required: ['text', 'choices'], additionalProperties: false } }, required: ['protocol', 'flow', 'accountExists'], additionalProperties: false },
          handler: async () => { reads++; return { protocol: 'plugin-guidance.v1', flow: registered === true ? 'prologue' : 'registration', accountExists: registered === true, dialogue: { text: registered === true ? '插件：角色已经登记好了' : '插件：直接回复名字', choices: ['退出引导'] } }; }
        })
      } }]);
      config = getDSHConfig();
      await runDSHChat(event, event.MessageText);
      assert.deepEqual(guidanceSession()?.replyReferences ?? [], registered === 'delivery-failure' ? [] : ['game-origin-reply', 'game-origin-ref']);
      endGuidance(event);
    }, event, 'alemonjs-agent-link');
    assert.deepEqual(result.errors, []);
    assert.equal(modelCalls, registered === 'gameplay' ? 3 : 2);
    const sent = result.messages.map(message => message.text).join('\n');
    assert.ok(!sent.includes('/我是'));
    assert.ok(sent.includes(registered === 'gameplay' ? '背包已查到' : registered === true ? '角色已经登记好了' : '直接回复名字'));
    assert.ok(!sent.includes('道号还是没登记上'));
    if (registered === true) {
      assert.doesNotMatch(sent, /踏破虚空|凭空升仙/u);
      assert.match(sent, /剧情尚未推进/u);
    }
    const nodes = JSON.stringify(result.messages.map(message => message.nodes));
    if (registered === 'gameplay') assert.ok(nodes.includes('查看材料'));
    assert.doesNotMatch(nodes, /暂离|退出引导/u);
    assert.ok(!nodes.includes('[[退出引导]]'));
    assert.ok(!/退出\s*AI/iu.test(nodes));
    assert.ok(!result.actions.some(action => action.name === 'message.stream'));
    assert.ok(result.messages.every(message => result.actions[message.actionIndex].results.every(receipt => receipt.code === (registered === 'delivery-failure' ? 4000 : 2000))));
  } finally {
    globalThis.fetch = original;
    if (config) await (await getModuleRuntime(config)).close();
    if (globalThis.sequelize && globalThis.sequelize !== previousSql) await globalThis.sequelize.close();
    globalThis.sequelize = previousSql;
    await app.dispose();
    closeProductObservability(root);
    await rm(root, { recursive: true, force: true });
  }
});

for (const scenario of ['registration', 'gameplay', 'manual-exit']) test(`model failure preserves gameplay recovery: ${scenario}`, async () => {
  const root = await mkdtemp(join(tmpdir(), 'game-failure-'));
  const app = createTestApp({ config: { db: { dialect: 'sqlite', sqlite: { storage: join(root, 'db.sqlite') } }, 'alemonjs-agent-link': {
    apiKey: 'fixture-failure', model: 'fixture', runtimeMode: 'chat-only', stateBackend: 'local', privateChatAccess: 'all', budget: { enabled: false },
    workspaceRoot: join(root, 'work'), dshHomeRoot: join(root, 'home'),
    modules: { disabled: ['opinions', 'stickers'], settings: { memory: { automatic: false }, mood: { modelJudge: false }, expression: { automatic: false, socialPolish: false }, proactive: { autoSubscribe: false } } }
  } } });
  app.actions.on('mention.get', () => [{ code: 2000, data: [] }]);
  app.apis.on('getMessageSeq', () => [{ code: 2000, data: 1 }]);
  const original = globalThis.fetch;
  const previousSql = globalThis.sequelize;
  delete globalThis.sequelize;
  let config;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    if (scenario === 'manual-exit') {
      await interruptPluginConversations();
    }
    return Response.json({ error: { message: 'fixture model rejected', type: 'invalid_request_error' } }, { status: 400 });
  };
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: `failure-${scenario}`, text: '继续带我玩修仙' });
  try {
    const result = await app.runHandler(async () => {
      registerExpose('xiuxian-game', [conversationLifecycle]);
      if (scenario === 'registration') rememberGuidance({ accountExists: false });
      else rememberGameplay('get_inventory', { ok: true, data: { count: 1 } });
      config = getDSHConfig();
      await runDSHChat(event, event.MessageText);
    }, event, 'alemonjs-agent-link');
    assert.deepEqual(result.errors, []);
    assert.ok(calls > 0);
    if (scenario === 'manual-exit') assert.equal(result.messages.length, 0, 'old model error must not follow manual takeover');
    else {
      const nodes = JSON.stringify(result.messages.map(message => message.nodes));
      assert.doesNotMatch(nodes, /已经提交的操作不会因此撤销|不要直接重复消费|返回玩法目录|暂离|退出\s*AI/u);
      assert.ok(result.messages.some(message => message.text.trim()));
      const modelCalls = calls;
      for (const text of ['返回玩法目录', '暂离', '退出AI游玩']) {
        const recoveryEvent = app.events.privateMessage({ platform: 'qq-bot', userId: `failure-${scenario}`, messageId: `recover-${text}-${calls}`, text });
        const recovery = await app.runHandler(pluginConversationHandler, recoveryEvent, 'alemonjs-agent-link');
        assert.deepEqual(recovery.errors, []);
        assert.equal(recovery.nextCalls.length, 0);
        assert.equal(calls, modelCalls, 'recovery navigation must work while the model remains unavailable');
        assert.ok(recovery.messages.some(message => message.text.includes(text === '返回玩法目录' ? '想先玩哪一项' : '先歇一会儿')));
        assert.ok(recovery.messages.every(message => recovery.actions[message.actionIndex].results.every(receipt => receipt.code === 2000)));
      }

      assert.ok(result.messages.every(message => result.actions[message.actionIndex].results.every(receipt => receipt.code === 2000)));
    }
  } finally {
    globalThis.fetch = original;
    endGuidance(event);
    if (config) await (await getModuleRuntime(config)).close();
    if (globalThis.sequelize && globalThis.sequelize !== previousSql) await globalThis.sequelize.close();
    globalThis.sequelize = previousSql;
    await app.dispose();
    closeProductObservability(root);
    await rm(root, { recursive: true, force: true });
  }
});

test('disabled AI without an existing session keeps original plugin entry available', async t => {
  const app = createTestApp({ config: { 'alemonjs-agent-link': { aiEnabled: false } } });
  t.after(() => app.dispose());
  const event = app.events.privateMessage({ platform: 'qq-bot', botId: 'host', userId: 'disabled-new-player', messageId: 'disabled-new-player', text: '带我玩修仙' });
  const run = await app.runHandler(async () => {
    assert.equal(guidanceSession(), undefined);
    await guidance();
    assert.equal(guidanceSession(), undefined);
  }, event, 'alemonjs-agent-link');
  assert.deepEqual(run.errors, []);
  assert.equal(run.messages.length, 1);
  assert.match(run.messages[0].text, /\/踏入仙途/);
  assert.match(run.messages[0].text, /\/我/);
  assert.ok(run.actions[run.messages[0].actionIndex].results.every(receipt => receipt.code === 2000));
});


test('leaving word without a game session does not claim unrelated conversation', async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const event = app.events.privateMessage({ platform: 'qq-bot', botId: 'fish', userId: 'unrelated-leave', text: '暂离' });
  const result = await app.runHandler(async () => {
    registerExpose('xiuxian-game', [conversationLifecycle]);
    assert.equal(guidanceSession(), undefined);
    await guidance();
  }, event, 'alemonjs-agent-link');
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 0);
  assert.equal(result.nextCalls.length, 1);
});
