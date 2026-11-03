import { conversationLifecycle } from '../../src/agent-play/lifecycle.ts';
import { routePluginConversation } from '../../src/agent-play/conversation-routing.ts';
import { acknowledgeConfirmationOptions } from '../../src/agent-play/game-confirmation.ts';
import { assertMessageDelivered } from '../../../alemonjs-agent-link/lib/dsh/output.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestApp } from 'alemonjs/testing';
import { Expose, registerExpose, useMessage } from 'alemonjs';
import { gameGuidance } from '../../src/agent-play/game-guidance.ts';
import { rememberGameplay, guidanceSession, endGuidance } from '../../src/agent-play/guidance-session.ts';
import { createChatReplyFormat } from '../../../alemonjs-agent-link/lib/dsh/reply-format.js';
const empty = { type: 'object', properties: {}, additionalProperties: false };
const string = { type: 'string' };
const stateSchema = { type: 'object', properties: { protocol: string, flow: string, accountExists: { type: 'boolean' }, dialogue: { type: 'object', properties: { text: string, choices: { type: 'array', items: string } }, required: ['text', 'choices'], additionalProperties: false } }, required: ['protocol', 'flow', 'accountExists'], additionalProperties: false };
const presentation = { type: 'object', properties: { protocol: { type: 'string', enum: ['system-guide.v1'] }, delivery: string, text: string }, required: ['protocol', 'delivery', 'text'], additionalProperties: false };
const resultSchema = { type: 'object', properties: {
  success: { type: 'boolean' }, branch: string, presentation,
  result: { type: 'object', properties: { code: string, actions: { type: 'array', items: { type: 'object', properties: { label: string, command: string }, required: ['label', 'command'], additionalProperties: false } } }, additionalProperties: false }
}, required: ['success', 'branch', 'presentation', 'result'], additionalProperties: false };

for (const scenario of ['already-registered', 'registration-race', 'lookup-failed', 'lesson']) {
  test(`real guide boundary and output: ${scenario}`, async t => {
    const app = createTestApp();
    t.after(() => app.dispose());
    const event = app.events.privateMessage({ platform: 'qq-bot', userId: `flow-${scenario}`, text: '带我玩修仙' });
    let reads = 0, writes = 0;
    const result = await app.runHandler(async () => {
      registerExpose('xiuxian-game', [conversationLifecycle, { name: 'xiuxian.player.v1', description: 'fixture', actions: {
        get_guidance_state: Expose.action({ description: 'state', effect: 'read', inputSchema: empty, outputSchema: stateSchema, handler: async () => {
          reads++;
          if (scenario === 'lookup-failed') throw new Error('fixture offline');
          const exists = scenario !== 'registration-race' || writes > 0;
          return { protocol: 'plugin-guidance.v1', flow: exists ? 'onboarding' : 'registration', accountExists: exists, dialogue: { text: '插件说明：角色已经登记好了', choices: ['继续', '退出引导'] } };
        } }),
        register_player: Expose.action({ description: 'register', effect: 'write', inputSchema: empty, outputSchema: resultSchema, handler: async () => {
          writes++;
          return { success: true, branch: 'business', result: { code: 'EXISTING_USER' }, presentation: { protocol: 'system-guide.v1', delivery: 'pending', text: '系统 · 初入仙途\n已有修仙角色，可发送 /我 查看账号信息，或发送 /继续引导 核对当前进度。' } };
        } }),
        get_onboarding: Expose.action({ description: 'lesson', effect: 'write', inputSchema: empty, outputSchema: resultSchema, handler: async () => ({
          success: true, branch: 'business', result: { actions: [{ label: '领取今日补给 · /签到', command: '/签到' }] },
          presentation: { protocol: 'system-guide.v1', delivery: 'pending', text: '系统 · 新手教学\n境界：炼气一层\n我是系统，接下来带你熟悉修行。\n先发送一次签到，领取今日补给并查看实际结果。\n可选指令：\n/签到' }
        }) })
      } }]);
      const execute = args => Expose.create().call(args.protocol, args.provider, args.action, JSON.parse(args.argumentsJson));
      const tools = [{ name: 'expose_read', execute }, { name: 'expose_write', execute }];
      const flow = gameGuidance(tools, event.MessageText);
      const context = { signal: new AbortController().signal };
      await flow.prepare(context);
      const action = scenario === 'lesson' ? 'get_onboarding' : 'register_player';
      const outcome = await tools[1].execute({ protocol: 'xiuxian.player.v1', provider: 'xiuxian-game', action, argumentsJson: '{}' }, context);
      if (scenario === 'already-registered') { assert.equal(outcome.error.code, 'ALREADY_REGISTERED'); assert.equal(writes, 0); }
      if (scenario === 'lookup-failed') { assert.equal(outcome.error.code, 'GUIDANCE_STATE_UNAVAILABLE'); assert.equal(writes, 0); return; }
      if (scenario === 'registration-race') { assert.equal(writes, 1); assert.equal(guidanceSession().state.accountExists, true); assert.equal(reads, 2, 'registration checks identity before execution and refreshes the result, without a startup read'); }
      const text = scenario === 'lesson'
        ? '先签到领今天的补给吧。\n领取今日补给 · /签到'
        : '叶飞雨这个号已经有了，我白跑一趟没登记成。发 /我 就能调出来。';
      const [message] = useMessage();
      await message.send({ format: createChatReplyFormat(flow.append(text), 'qq-bot') });
      endGuidance(event);
    }, event, 'alemonjs-agent-link');
    assert.deepEqual(result.errors, []);
    if (scenario === 'lookup-failed') return;
    const text = result.messages.map(item => item.text).join('\n');
    assert.ok(!/\/签到|\/我|\/继续引导|我是系统|可选指令：|白跑|没登记成/u.test(text), text);
    assert.ok(text.includes(scenario === 'lesson' ? '签到' : '角色已经登记好了'));
    assert.ok(!text.includes('[[领取今日补给]]'));
    assert.ok(result.messages.every(item => result.actions[item.actionIndex].results.every(receipt => receipt.code === 2000)));
  });
}


test('overview remains provider-owned and cannot register in the same inquiry', async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'provider-intro', text: '修仙怎么玩' });
  let writes = 0;
  const run = await app.runHandler(async () => {
    registerExpose('xiuxian-game', [conversationLifecycle, { name: 'xiuxian.player.v1', description: 'fixture', actions: {
      get_guidance_state: Expose.action({ effect: 'read', description: 'provider flow', inputSchema: { type: 'object', properties: { requestText: string, conversationMode: string }, additionalProperties: false }, outputSchema: stateSchema,
        handler: async input => {
          assert.equal(input.requestText, event.MessageText);
          assert.equal(input.conversationMode, 'gameplay');
          return { protocol: 'plugin-guidance.v1', flow: 'overview', accountExists: false, dialogue: { text: '插件专属玩法介绍，不是宿主的注册问答。', choices: ['开始修仙', '暂离'] } };
        } }),
      register_player: Expose.action({ effect: 'write', description: 'register', inputSchema: empty, outputSchema: empty, handler: async () => { writes++; return {}; } }),
      claim_reward: Expose.action({ effect: 'write', description: 'reward', inputSchema: empty, outputSchema: empty, handler: async () => { writes++; return {}; } })
    } }]);
    registerExpose('other-game', [{ name: 'other.player.v1', description: 'independent provider', actions: {
      register_player: Expose.action({ effect: 'write', description: 'unrelated registration', authorize: () => false, inputSchema: empty, outputSchema: empty, handler: async () => { writes++; return {}; } }),
      get_status: Expose.action({ effect: 'read', description: 'read only', inputSchema: empty, outputSchema: empty, handler: async () => ({}) })
    } }]);
    const execute = args => Expose.create().call(args.protocol, args.provider, args.action, JSON.parse(args.argumentsJson));
    const tools = [{ name: 'expose_read', execute }, { name: 'expose_write', execute }];
    rememberGameplay('get_inventory', { ok: true });
    const flow = gameGuidance(tools, event.MessageText);
    const context = { signal: new AbortController().signal };
    await flow.prepare(context);
    const refused = await tools[1].execute({ protocol: 'xiuxian.player.v1', provider: 'xiuxian-game', action: 'register_player', argumentsJson: '{}' }, context);
    assert.equal(refused.error.code, 'PLUGIN_CHOICE_REQUIRED');
    const otherWrite = await tools[1].execute({ protocol: 'xiuxian.player.v1', provider: 'xiuxian-game', action: 'claim_reward', argumentsJson: '{}' }, context);
    assert.equal(otherWrite.error.code, 'PLUGIN_CHOICE_REQUIRED');
    for (const action of ['register_player', 'unknown_action']) {
      const crossProvider = await tools[1].execute({ protocol: 'other.player.v1', provider: 'other-game', action, argumentsJson: '{}' }, context);
      assert.notEqual(crossProvider.error.code, 'PLUGIN_CHOICE_REQUIRED', 'a game overview cannot impose its flow on another provider');
    }
    const readOnly = await tools[0].execute({ protocol: 'other.player.v1', provider: 'other-game', action: 'get_status', argumentsJson: '{}' }, context);
    assert.equal(readOnly.ok, true);
    assert.equal(writes, 0);
    const [message] = useMessage();
    await message.send({ format: createChatReplyFormat(flow.append('先告诉我道号和性别，我直接登记。'), 'qq-bot') });
    endGuidance(event);
  }, event, 'alemonjs-agent-link');
  assert.deepEqual(run.errors, []);
  const nodes = JSON.stringify(run.messages[0].nodes);
  assert.ok(nodes.includes('插件专属玩法介绍'));
  assert.ok(nodes.includes('开始修仙'));
  assert.ok(!nodes.includes('先告诉我道号'));
});


test('provider flow switches an existing gameplay session into tutorial mode', async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'provider-mode', text: '继续教学' });
  const result = await app.runHandler(async () => {
    registerExpose('xiuxian-game', [conversationLifecycle, { name: 'xiuxian.player.v1', description: 'fixture', actions: {
      get_guidance_state: Expose.action({ effect: 'read', description: 'flow', inputSchema: { type: 'object', properties: { conversationMode: string }, additionalProperties: false }, outputSchema: stateSchema,
        handler: async input => {
          assert.equal(input.conversationMode, 'gameplay');
          return { protocol: 'plugin-guidance.v1', flow: 'onboarding', accountExists: true, dialogue: { text: '插件的教学步骤', choices: ['继续'] } };
        } })
    } }]);
    rememberGameplay('get_inventory', { ok: true });
    const tools = [{ name: 'expose_read', execute: args => Expose.create().call(args.protocol, args.provider, args.action, JSON.parse(args.argumentsJson)) }];
    const engine = gameGuidance(tools, event.MessageText);
    const ctx = { signal: new AbortController().signal };
    await engine.prepare(ctx);
    assert.equal(guidanceSession().mode, 'gameplay');
    await tools[0].execute({ protocol: 'xiuxian.player.v1', provider: 'xiuxian-game', action: 'get_guidance_state', argumentsJson: JSON.stringify({ conversationMode: 'gameplay' }) }, ctx);
    assert.equal(guidanceSession().mode, 'guidance');
    endGuidance(event);
  }, event, 'alemonjs-agent-link');
  assert.deepEqual(result.errors, []);
});

for (const failed of [false, true]) test(`host reads provider rules without activating gameplay: failed=${failed}`, async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: `contract-${failed}`, text: '你好' });
  let calls = 0;
  const result = await app.runHandler(async () => {
    registerExpose('xiuxian-game', [conversationLifecycle, { name: 'xiuxian.player.v1', description: 'fixture', actions: {
      get_guidance_state: Expose.action({ effect: 'read', description: 'state', inputSchema: empty, outputSchema: stateSchema, handler: async () => { throw new Error('must not inspect gameplay for greeting'); } }),
      get_conversation_contract: Expose.action({ effect: 'read', description: 'static rules', inputSchema: empty, outputSchema: {
        type: 'object', properties: { protocol: string, provider: string, rules: { type: 'array', items: string } }, required: ['protocol', 'provider', 'rules'], additionalProperties: false
      }, handler: async () => {
        calls++;
        if (failed) throw new Error('fixture unavailable');
        return { protocol: 'plugin-conversation.v1', provider: 'xiuxian-game', rules: ['插件独有演出规则，仅作为该玩法资料。'] };
      } })
    } }]);
    const tools = [{ name: 'expose_read', execute: args => Expose.create().call(args.protocol, args.provider, args.action, JSON.parse(args.argumentsJson)) }];
    const flow = gameGuidance(tools, event.MessageText);
    const prepared = await flow.prepare({ signal: new AbortController().signal });
    assert.equal(prepared.includes('插件独有演出规则'), !failed);
    assert.ok(!flow.instruction.includes('宋玉'), 'host does not author plot rules');
    assert.ok(!flow.instruction.includes('branchMenu'), 'host does not author branch semantics');
    assert.equal(guidanceSession(), undefined, 'reading static rules does not capture the conversation');
    assert.equal(flow.hasReceipts(), false);
  }, event, 'alemonjs-agent-link');
  assert.deepEqual(result.errors, []);
  assert.equal(calls, 1);
  assert.equal(result.messages.length, 0);
});

for (const invalid of [false, true]) test(`provider confirmation declarations control actual tool gate: invalid=${invalid}`, async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: `declaration-${invalid}`, messageId: 'preview', text: '看看方案' });
  const declaration = { previewAction: 'preview_fixture', action: invalid ? 'missing_action' : 'confirm_fixture', title: '插件确认测试', kind: 'q', field: 'reference' };
  const definitions = { type: 'array', items: { type: 'object', properties: Object.fromEntries(Object.keys(declaration).map(key => [key, string])), required: Object.keys(declaration), additionalProperties: false } };
  const envelope = { type: 'object', properties: { success: { type: 'boolean' }, branch: string, result: { type: 'object', properties: { reference: string }, required: ['reference'], additionalProperties: false } }, required: ['success', 'branch', 'result'], additionalProperties: false };
  const reference = `r1_1_q_1_${'a'.repeat(24)}`;
  let writes = 0, label;
  const createTools = () => ['expose_read', 'expose_write'].map(name => ({ name, execute: args => Expose.create().call(args.protocol, args.provider, args.action, JSON.parse(args.argumentsJson)) }));
  const args = (action, input = {}) => ({ protocol: 'xiuxian.player.v1', provider: 'xiuxian-game', action, argumentsJson: JSON.stringify(input) });
  const first = await app.runHandler(async () => {
    registerExpose('xiuxian-game', [conversationLifecycle, { name: 'xiuxian.player.v1', description: 'fixture', actions: {
      get_guidance_state: Expose.action({ effect: 'read', description: 'state', inputSchema: empty, outputSchema: stateSchema, handler: async () => { throw new Error('not a tutorial'); } }),
      get_conversation_contract: Expose.action({ effect: 'read', description: 'contract', inputSchema: empty, outputSchema: { type: 'object', properties: { protocol: string, provider: string, rules: { type: 'array', items: string }, confirmations: definitions }, required: ['protocol', 'provider', 'rules', 'confirmations'], additionalProperties: false },
        handler: async () => ({ protocol: 'plugin-conversation.v1', provider: 'xiuxian-game', rules: [], confirmations: [declaration] }) }),
      preview_fixture: Expose.action({ effect: 'read', description: 'preview', inputSchema: empty, outputSchema: envelope, handler: async () => ({ success: true, branch: 'business', result: { reference } }) }),
      confirm_fixture: Expose.action({ effect: 'write', description: 'confirm', inputSchema: { type: 'object', properties: { reference: string }, required: ['reference'], additionalProperties: false }, outputSchema: empty, handler: async () => { writes++; return {}; } })
    } }]);
    const tools = createTools();
    const flow = gameGuidance(tools, event.MessageText);
    await flow.prepare({ signal: new AbortController().signal });
    const premature = await tools[1].execute(args('confirm_fixture', { reference }), {});
    assert.equal(premature.error.code, invalid ? 'PLUGIN_CONTRACT_UNAVAILABLE' : 'CONFIRMATION_CHOICE_REQUIRED');
    assert.equal(writes, 0);
    if (invalid) return;
    await tools[0].execute(args('preview_fixture'), {});
    label = guidanceSession().offers[0].label;
    const text = flow.append('插件的原方案');
    const [message] = useMessage();
    assertMessageDelivered(await message.send({ format: createChatReplyFormat(text, 'qq-bot') }));
    acknowledgeConfirmationOptions(text);
  }, event, 'alemonjs-agent-link');
  assert.deepEqual(first.errors, []);
  if (invalid) return;
  assert.ok(JSON.stringify(first.messages[0].nodes).includes('插件确认测试'));
  const second = await app.runHandler(async () => {
    const tools = createTools();
    await gameGuidance(tools, label).prepare({ signal: new AbortController().signal });
    assert.equal((await tools[1].execute(args('confirm_fixture', { reference }), {})).ok, true);
    assert.equal(writes, 1);
    endGuidance(event);
  }, { ...event, MessageId: 'confirm', MessageText: label }, 'alemonjs-agent-link');
  assert.deepEqual(second.errors, []);
});

for (const invalid of [false, true]) test(`provider preparation declaration binds a new consuming action: invalid=${invalid}`, async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: `preparation-${invalid}`, messageId: 'propose', text: '使用指定材料' });
  const declarations = [{ action: invalid ? 'not_registered' : 'consume_fixture', title: '确认插件消费', notice: '插件声明：消耗{amount}份材料。', fields: [{ name: 'amount', type: 'positiveInteger' }] }];
  const fieldSchema = { type: 'object', properties: { name: string, type: string }, required: ['name', 'type'], additionalProperties: false };
  const prepSchema = { type: 'object', properties: { action: string, title: string, notice: string, fields: { type: 'array', items: fieldSchema } }, required: ['action', 'title', 'notice', 'fields'], additionalProperties: false };
  let writes = 0, label;
  const createTools = () => ['expose_read', 'expose_write'].map(name => ({ name, execute: args => Expose.create().call(args.protocol, args.provider, args.action, JSON.parse(args.argumentsJson)) }));
  const args = amount => ({ protocol: 'xiuxian.player.v1', provider: 'xiuxian-game', action: 'consume_fixture', argumentsJson: JSON.stringify({ amount }) });
  const first = await app.runHandler(async () => {
    registerExpose('xiuxian-game', [conversationLifecycle, { name: 'xiuxian.player.v1', description: 'fixture', actions: {
      get_guidance_state: Expose.action({ effect: 'read', description: 'state', inputSchema: empty, outputSchema: stateSchema, handler: async () => { throw new Error('not tutorial'); } }),
      get_conversation_contract: Expose.action({ effect: 'read', description: 'contract', inputSchema: empty, outputSchema: { type: 'object', properties: { protocol: string, provider: string, rules: { type: 'array', items: string }, preparations: { type: 'array', items: prepSchema } }, required: ['protocol', 'provider', 'rules', 'preparations'], additionalProperties: false },
        handler: async () => ({ protocol: 'plugin-conversation.v1', provider: 'xiuxian-game', rules: [], preparations: declarations }) }),
      consume_fixture: Expose.action({ effect: 'write', description: 'consume', inputSchema: { type: 'object', properties: { amount: { type: 'integer' } }, required: ['amount'], additionalProperties: false }, outputSchema: empty, handler: async () => { writes++; return {}; } })
    } }]);
    const tools = createTools();
    const flow = gameGuidance(tools, event.MessageText);
    await flow.prepare({ signal: new AbortController().signal });
    const outcome = await tools[1].execute(args(3), {});
    assert.equal(outcome.error.code, invalid ? 'PLUGIN_CONTRACT_UNAVAILABLE' : 'GENERATION_CHOICE_REQUIRED');
    assert.equal(writes, 0);
    if (invalid) return;
    label = guidanceSession().offers[0].label;
    const text = flow.append('按插件说明核对本次操作');
    assert.ok(text.includes('插件声明：消耗3份材料。'));
    const [message] = useMessage();
    assertMessageDelivered(await message.send({ format: createChatReplyFormat(text, 'qq-bot') }));
    acknowledgeConfirmationOptions(text);
  }, event, 'alemonjs-agent-link');
  assert.deepEqual(first.errors, []);
  if (invalid) return;
  assert.ok(JSON.stringify(first.messages[0].nodes).includes(label));
  const second = await app.runHandler(async () => {
    const tools = createTools();
    await gameGuidance(tools, label).prepare({ signal: new AbortController().signal });
    assert.equal((await tools[1].execute(args(4), {})).error.code, 'GENERATION_CHOICE_REQUIRED');
    assert.equal(writes, 0);
    assert.equal((await tools[1].execute(args(3), {})).ok, true);
    assert.equal(writes, 1);
    assert.equal((await tools[1].execute(args(3), {})).error.code, 'GENERATION_CHOICE_REQUIRED');
    assert.equal(writes, 1);
    endGuidance(event);
  }, { ...event, MessageId: 'consume', MessageText: label }, 'alemonjs-agent-link');
  assert.deepEqual(second.errors, []);
});

for (const decision of ['matched', 'unmatched', 'ambiguous', 'unavailable']) test(`provider owns current request routing: ${decision}`, async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: `route-${decision}`, text: '今天天气怎么样' });
  let reads = 0, routes = 0;
  const run = await app.runHandler(async () => {
    registerExpose('xiuxian-game', [conversationLifecycle, { name: 'xiuxian.player.v1', description: 'fixture', actions: {
      route_conversation: Expose.action({ effect: 'read', description: 'plugin topic routing', inputSchema: { type: 'object', properties: { active: { type: 'boolean' }, flow: string, hasNameDraft: { type: 'boolean' }, choices: { type: 'array', items: string } }, required: ['active'], additionalProperties: false },
        outputSchema: { type: 'object', properties: { protocol: string, decision: string }, required: ['protocol', 'decision'], additionalProperties: false }, handler: async input => {
          routes++;
          assert.equal(input.active, true);
          if (decision === 'unavailable') throw new Error('routing unavailable');
          return { protocol: 'plugin-conversation-route.v1', decision };
        } }),
      get_guidance_state: Expose.action({ effect: 'read', description: 'state', inputSchema: { type: 'object', properties: { conversationMode: string }, additionalProperties: false }, outputSchema: stateSchema, handler: async () => {
        reads++;
        return { protocol: 'plugin-guidance.v1', flow: 'gameplay', accountExists: true, dialogue: { text: '插件状态', choices: ['继续'] } };
      } })
    } }]);
    rememberGameplay('get_inventory', { count: 3 });
    const before = JSON.stringify(guidanceSession());
    const execute = args => Expose.create().call(args.protocol, args.provider, args.action, JSON.parse(args.argumentsJson));
    const flow = gameGuidance([{ name: 'expose_read', execute }], event.MessageText);
    await flow.prepare({ signal: new AbortController().signal });
    assert.equal(routes, 0, 'engine preparation must not reroute the message');
    assert.equal(reads, 0, 'routing history never authorizes startup state reads');
    if (decision !== 'matched') {
      assert.equal(JSON.stringify(guidanceSession()), before, 'history is not current request ownership');
      assert.equal(flow.hasReceipts(), false);
      assert.equal(flow.append('我是系统\n/其他插件'), '我是系统\n/其他插件', 'unrelated output must not use game narration or slash filtering');
    }
    endGuidance(event);
  }, event, 'alemonjs-agent-link');
  assert.deepEqual(run.errors, []);
});


for (const kind of ['read', 'write', 'invalid']) test(`routing transport is provider independent: ${kind}`, async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  let calls = 0;
  const run = await app.runHandler(async () => {
    registerExpose('another-plugin', [{ name: 'another.play.v1', description: 'independent provider', actions: {
      route_conversation: Expose.action({ effect: kind === 'write' ? 'write' : 'read', description: 'routing', inputSchema: { type: 'object', properties: { active: { type: 'boolean' } }, required: ['active'], additionalProperties: false }, outputSchema: { type: 'object', properties: { protocol: string, decision: string }, required: ['protocol', 'decision'], additionalProperties: false }, handler: async () => {
        calls++;
        return { protocol: kind === 'invalid' ? 'wrong.v1' : 'plugin-conversation-route.v1', decision: 'matched' };
      } })
    } }]);
    assert.equal(await routePluginConversation('another.play.v1', 'another-plugin', { active: false }), kind === 'read' ? 'matched' : 'unavailable');
    assert.equal(calls, kind === 'write' ? 0 : 1, 'routing cannot invoke a write capability');
  }, app.events.privateMessage({ userId: `generic-route-${kind}`, text: 'another game' }), 'alemonjs-agent-link');
  assert.deepEqual(run.errors, []);
});
