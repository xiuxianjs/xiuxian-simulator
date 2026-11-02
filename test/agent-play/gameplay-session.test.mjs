import { conversationLifecycle } from '../../src/agent-play/lifecycle.ts';
import { messageReferences } from '../../../alemonjs-agent-link/lib/social/references.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestApp } from 'alemonjs/testing';
import { Expose, registerExpose, useMessage } from 'alemonjs';
import { gameGuidance } from '../../src/agent-play/game-guidance.ts';
import { rememberGameReply, rememberGameplay, guidanceSession, endGuidance } from '../../src/agent-play/guidance-session.ts';
import handler from '../helpers/agent-play-message.ts';
import { captureGamePresentation } from '../../src/agent-play/game-progress.ts';
import { acknowledgeConfirmationOptions } from '../../src/agent-play/game-confirmation.ts';
import { createChatReplyFormat } from '../../../alemonjs-agent-link/lib/dsh/reply-format.js';
import { assertMessageDelivered } from '../../../alemonjs-agent-link/lib/dsh/output.js';
const empty = { type: 'object', properties: {}, additionalProperties: false };
const schema = { type: 'object', properties: { count: { type: 'integer' } }, required: ['count'], additionalProperties: false };

test('ordinary gameplay without teaching presentation opens scoped conversation; slash escapes and invalidates pending AI', async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const event = app.events.privateMessage({ platform: 'qq-bot', botId: 'fish', userId: 'player', text: '/我的锻造' });
  let calls = 0;
  const result = await app.runHandler(async () => {
    registerExpose('xiuxian-game', [conversationLifecycle, { name: 'xiuxian.player.v1', description: 'game', actions: {
      get_guidance_state: Expose.action({ effect: 'read', description: 'state', inputSchema: empty, outputSchema: schema, handler: async () => { throw new Error('ordinary gameplay must not query tutorial'); } }),
      get_inventory: Expose.action({ effect: 'read', description: 'inventory', inputSchema: empty, outputSchema: schema, handler: async () => { calls++; return { count: 3 }; } })
    } }]);
    const tools = [{ name: 'expose_read', execute: args => Expose.create().call(args.protocol, args.provider, args.action, {}) }];
    const flow = gameGuidance(tools, '看看背包');
    const args = { protocol: 'xiuxian.player.v1', provider: 'xiuxian-game', action: 'get_inventory' };
    await tools[0].execute(args, { signal: new AbortController().signal });
    assert.equal(guidanceSession().mode, 'gameplay');
    assert.ok(guidanceSession().receipts.some(text => text.includes('get_inventory') && text.includes('count')));
    assert.equal(guidanceSession({ ...event, UserId: 'other' }), undefined);
    const followup = gameGuidance([], '选这个');
    assert.ok((await followup.prepare({ signal: new AbortController().signal })).includes('普通玩法对话'));
    await handler();
    assert.equal(guidanceSession(), undefined);
    assert.equal(flow.isStale(), true);
    assert.equal((await tools[0].execute(args, {})).error.code, 'STALE_GUIDANCE');
  }, event, 'alemonjs-agent-link');
  assert.deepEqual(result.errors, []);
  assert.equal(calls, 1);
  assert.equal(result.nextCalls.length, 1);
  assert.equal(result.messages.length, 0);
});

for (const action of ['prepare_skill_reroll', 'prepare_soul_artifact_wash', 'consume_item']) {
  for (const scenario of ['choose', 'undelivered', 'cancel', 'slash', 'unknown']) {
    test(`paid generation requires delivered original choice: ${action} ${scenario}`, async t => {
      const app = createTestApp();
      t.after(() => app.dispose());
      const event = app.events.privateMessage({ platform: 'qq-bot', botId: 'fish', userId: `${action}-${scenario}`, messageId: 'propose', text: '看看怎么生成' });
      const input = action === 'consume_item' ? { itemName: '培元丹', quantity: 1, intentId: 'original-attempt' } : action === 'prepare_skill_reroll' ? { bookId: 17, label: '攻击' } : {};
      const args = { protocol: 'xiuxian.player.v1', provider: 'xiuxian-game', action, argumentsJson: JSON.stringify(input) };
      let calls = 0;
      let label;
      let tools;
      let flow;
      const initial = await app.runHandler(async () => {
        registerExpose('xiuxian-game', [conversationLifecycle, { name: 'xiuxian.player.v1', description: 'game', actions: {
          get_guidance_state: Expose.action({ effect: 'read', description: 'state', inputSchema: empty, outputSchema: schema, handler: async () => ({ count: 0 }) })
        } }]);
        tools = [{ name: 'expose_write', execute: async () => {
          calls++;
          if (scenario === 'unknown') throw new Error('transport lost');
          return { ok: true, data: { success: true, branch: 'business', result: {} } };
        } }];
        flow = gameGuidance(tools, event.MessageText);
        const result = await tools[0].execute(args, {});
        assert.equal(result.error.code, 'GENERATION_CHOICE_REQUIRED');
        assert.equal(calls, 0);
        label = guidanceSession().offers[0].label;
        const text = flow.append('先看看消耗');
        assert.match(text, /消耗1个/);
        assert.match(text, /放弃不返还/);
        assert.ok(text.includes(`[[${label}]]`));
        if (scenario === 'undelivered') app.actions.on('message.send', () => [{ code: 4000, data: null }]);
        const [message] = useMessage();
        const sent = await message.send({ format: createChatReplyFormat(text, 'qq-bot') });
        if (scenario === 'undelivered') assert.throws(() => assertMessageDelivered(sent));
        else { assertMessageDelivered(sent); acknowledgeConfirmationOptions(text); }
        event.MessageText = label;
        assert.equal((await tools[0].execute(args, {})).error.code, 'GENERATION_CHOICE_REQUIRED', 'same turn cannot consume');
        assert.equal(calls, 0);
      }, event, 'alemonjs-agent-link');
      assert.deepEqual(initial.errors, []);
      const choice = { ...event, MessageId: 'choose', MessageText: scenario === 'cancel' ? '取消' : scenario === 'slash' ? '/我' : label };
      const selected = await app.runHandler(async () => {
        if (scenario === 'cancel' || scenario === 'slash') {
          await handler();
          assert.equal(guidanceSession()?.offers?.length ?? 0, 0);
          assert.equal(calls, 0);
          return;
        }
        if (scenario === 'undelivered') {
          assert.equal((await tools[0].execute(args, {})).error.code, 'GENERATION_CHOICE_REQUIRED');
          assert.equal(calls, 0);
          return;
        }
        const changed = { ...args, argumentsJson: JSON.stringify({ ...input, bookId: 18 }) };
        assert.equal((await tools[0].execute(changed, {})).error.code, 'GENERATION_CHOICE_REQUIRED');
        assert.equal(calls, 0);
        if (action === 'consume_item') {
          for (const change of [{ quantity: 2 }, { itemName: '其他丹药' }, { intentId: 'new-attempt' }, { taskInput: '追加任务' }]) {
            assert.equal((await tools[0].execute({ ...args, argumentsJson: JSON.stringify({ ...input, ...change }) }, {})).error.code, 'GENERATION_CHOICE_REQUIRED');
          }
          assert.equal(calls, 0);
        }
        if (scenario === 'unknown') await assert.rejects(tools[0].execute(args, {}), /transport lost/);
        else assert.equal((await tools[0].execute(args, {})).ok, true);
        assert.equal(calls, 1);
        assert.equal((await tools[0].execute(args, {})).error.code, 'GENERATION_CHOICE_REQUIRED');
        assert.equal(calls, 1, 'no repeated consume after success or uncertain failure');
        endGuidance(choice);
      }, choice, 'alemonjs-agent-link');
      assert.deepEqual(selected.errors, []);
      if (scenario === 'slash') assert.equal(selected.nextCalls.length, 1);
    });
  }
}

for (const mode of ['restart', 'expired', 'cancelled', 'unrelated', 'slash-before-state']) {
  test(`game conversation recovery routing: ${mode}`, async t => {
    const app = createTestApp();
    t.after(() => app.dispose());
    const event = app.events.privateMessage({ platform: 'qq-bot', botId: 'fish', userId: `recovery-${mode}`, messageId: 'recovery', text: mode === 'unrelated' ? '其他插件选择·abcdef' : mode === 'slash-before-state' ? '/我' : '确认购买·abcdef' });
    let stale;
    const result = await app.runHandler(async () => {
      if (mode === 'expired' || mode === 'cancelled') {
        // Use the same session implementation and its real native time expiry.
        const tools = [{ name: 'expose_read', execute: async () => ({ ok: true }) }];
        registerExpose('xiuxian-game', [conversationLifecycle, { name: 'xiuxian.player.v1', description: 'game', actions: {
          get_guidance_state: Expose.action({ effect: 'read', description: 'state', inputSchema: empty, outputSchema: schema, handler: async () => ({ count: 0 }) })
        } }]);
        gameGuidance(tools);
        await tools[0].execute({ protocol: 'xiuxian.player.v1', provider: 'xiuxian-game', action: 'get_inventory', argumentsJson: '{}' }, {});
        if (mode === 'expired') guidanceSession().updated = Date.now() - 31 * 60_000;
        else guidanceSession().offers = [];
      }
      stale = captureGamePresentation();
      await handler();
    }, event, 'alemonjs-agent-link');
    assert.deepEqual(result.errors, []);
    if (mode === 'unrelated' || mode === 'slash-before-state') {
      assert.equal(result.nextCalls.length, 1);
      assert.equal(result.messages.length, 0);
      assert.equal(stale(), mode === 'slash-before-state');
    } else {
      assert.equal(result.nextCalls.length, 0);
      assert.equal(result.messages.length, 1);
      assert.match(JSON.stringify(result.messages[0].nodes), /本次没有提交操作/);
      assert.match(JSON.stringify(result.messages[0].nodes), /之前已经执行的操作不会撤销/);
      assert.match(JSON.stringify(result.messages[0].nodes), /发送 \/我/);
      assert.ok(result.actions[result.messages[0].actionIndex].results.every(row => row.code === 2000));
    }
  });
}

test('a selected consumption cannot authorize other writes; only exact original-result followup is allowed', async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'isolated-operation', messageId: 'propose', text: '服用培元丹' });
  const string = { type: 'string' };
  const snapshot = 'a'.repeat(64);
  const envelope = { type: 'object', properties: { success: { type: 'boolean' }, branch: string, result: { type: 'object', properties: { peiyuanPending: { type: 'object', properties: { snapshot: string }, required: ['snapshot'], additionalProperties: false } }, additionalProperties: false } }, required: ['success', 'branch', 'result'], additionalProperties: false };
  const counts = { consume: 0, followup: 0, gameOther: 0, otherPlugin: 0, read: 0 };
  let tools, label;
  const args = (action, input = {}, provider = 'xiuxian-game', protocol = 'xiuxian.player.v1') => ({ protocol, provider, action, argumentsJson: JSON.stringify(input) });
  const request = args('consume_item', { itemName: '培元丹', quantity: 1 });
  const first = await app.runHandler(async () => {
    registerExpose('xiuxian-game', [conversationLifecycle, { name: 'xiuxian.player.v1', description: 'game fixture', actions: {
      get_guidance_state: Expose.action({ effect: 'read', description: 'state', inputSchema: empty, outputSchema: schema, handler: async () => ({ count: 1 }) }),
      consume_item: Expose.action({ effect: 'write', description: 'consume', inputSchema: { type: 'object', properties: { itemName: string, quantity: { type: 'integer' } }, required: ['itemName', 'quantity'], additionalProperties: false }, outputSchema: envelope,
        handler: async () => { counts.consume++; return { success: true, branch: 'business', result: { peiyuanPending: { snapshot } } }; } }),
      get_peiyuan_confirmation: Expose.action({ effect: 'write', description: 'reference only', inputSchema: { type: 'object', properties: { snapshot: string }, required: ['snapshot'], additionalProperties: false }, outputSchema: envelope,
        handler: async () => { counts.followup++; return { success: true, branch: 'business', result: {} }; } }),
      other_game_write: Expose.action({ effect: 'write', description: 'another operation', inputSchema: empty, outputSchema: empty, handler: async () => { counts.gameOther++; return {}; } })
    } }]);
    registerExpose('another-plugin', [{ name: 'another.v1', description: 'other plugin fixture', actions: {
      consume_item: Expose.action({ effect: 'write', description: 'different provider', inputSchema: empty, outputSchema: empty, handler: async () => { counts.otherPlugin++; return {}; } }),
      read_state: Expose.action({ effect: 'read', description: 'read', inputSchema: empty, outputSchema: empty, handler: async () => { counts.read++; return {}; } })
    } }]);
    tools = ['expose_read', 'expose_write', 'expose_call'].map(name => ({ name, execute: values => Expose.create().call(values.protocol, values.provider, values.action, JSON.parse(values.argumentsJson)) }));
    const flow = gameGuidance(tools, event.MessageText);
    assert.equal((await tools[1].execute(request, {})).error.code, 'GENERATION_CHOICE_REQUIRED');
    assert.equal(counts.consume, 0);
    label = guidanceSession().offers[0].label;
    const text = flow.append('按原方案使用');
    const [message] = useMessage();
    assertMessageDelivered(await message.send({ format: createChatReplyFormat(text, 'qq-bot') }));
    acknowledgeConfirmationOptions(text);
  }, event, 'alemonjs-agent-link');
  assert.deepEqual(first.errors, []);
  const second = await app.runHandler(async () => {
    assert.equal((await tools[1].execute(args('get_peiyuan_confirmation', { snapshot }), {})).error.code, 'SELECTION_SCOPE_MISMATCH', 'no original result yet');
    for (const extra of [args('other_game_write'), args('consume_item', {}, 'another-plugin', 'another.v1'), args('unknown', {}, 'another-plugin', 'another.v1')]) {
      assert.equal((await tools[2].execute(extra, {})).error.code, 'SELECTION_SCOPE_MISMATCH');
    }
    assert.equal((await tools[0].execute(args('read_state', {}, 'another-plugin', 'another.v1'), {})).ok, true);
    assert.equal((await tools[1].execute(request, {})).ok, true);
    assert.equal((await tools[1].execute(args('get_peiyuan_confirmation', { snapshot: 'b'.repeat(64) }), {})).error.code, 'SELECTION_SCOPE_MISMATCH');
    assert.equal((await tools[1].execute(args('get_peiyuan_confirmation', { snapshot, extra: true }), {})).error.code, 'SELECTION_SCOPE_MISMATCH');
    assert.equal((await tools[1].execute(args('get_peiyuan_confirmation', { snapshot }), {})).ok, true);
    assert.equal((await tools[1].execute(args('other_game_write'), {})).error.code, 'SELECTION_SCOPE_MISMATCH');
    endGuidance(event);
  }, { ...event, MessageId: 'choose', MessageText: label }, 'alemonjs-agent-link');
  assert.deepEqual(second.errors, []);
  const manual = await app.runHandler(handler, { ...event, MessageId: 'manual', MessageText: '/我' }, 'alemonjs-agent-link');
  assert.equal(manual.nextCalls.length, 1);
  const late = await app.runHandler(async () => {
    const outcome = await tools[2].execute(args('consume_item', {}, 'another-plugin', 'another.v1'), {});
    assert.equal(outcome.error.code, 'STALE_GUIDANCE', 'manual takeover also blocks late writes to another provider');
  }, event, 'alemonjs-agent-link');
  assert.deepEqual(late.errors, []);
  assert.deepEqual(counts, { consume: 1, followup: 1, gameOther: 0, otherPlugin: 0, read: 1 });
});

for (const scenario of ['preparation', 'confirmation', 'unrelated', 'unavailable']) {
  test(`expired provider-defined choice uses static contract only: ${scenario}`, async t => {
    const app = createTestApp();
    t.after(() => app.dispose());
    const title = scenario === 'confirmation' ? '保留奇遇结果' : '开始奇遇';
    const event = app.events.privateMessage({ platform: 'qq-bot', userId: `expired-provider-${scenario}`, messageId: 'old-choice', text: `${scenario === 'unrelated' ? '其他插件选项' : title}·abcdef` });
    let reads = 0, writes = 0;
    const string = { type: 'string' };
    const contractSchema = { type: 'object', properties: {
      protocol: string, provider: string,
      confirmations: { type: 'array', items: { type: 'object', properties: { previewAction: string, action: string, title: string, field: string, kind: string }, required: ['previewAction', 'action', 'title', 'field', 'kind'], additionalProperties: false } },
      preparations: { type: 'array', items: { type: 'object', properties: { action: string, title: string, notice: string, fields: { type: 'array', items: { type: 'object', properties: {}, additionalProperties: false } } }, required: ['action', 'title', 'notice', 'fields'], additionalProperties: false } }
    }, required: ['protocol', 'provider', 'confirmations', 'preparations'], additionalProperties: false };
    const result = await app.runHandler(async () => {
      registerExpose('xiuxian-game', [conversationLifecycle, { name: 'xiuxian.player.v1', description: 'fixture', actions: {
        get_conversation_contract: Expose.action({ effect: 'read', description: 'static', inputSchema: empty, outputSchema: contractSchema, handler: async () => {
          reads++;
          if (scenario === 'unavailable') throw new Error('fixture unavailable');
          return { protocol: 'plugin-conversation.v1', provider: 'xiuxian-game',
            confirmations: [{ previewAction: 'preview_custom', action: 'confirm_custom', title: '保留奇遇结果', kind: 'j', field: 'reference' }],
            preparations: [{ action: 'consume_custom', title: '开始奇遇', notice: '插件原消费说明', fields: [] }] };
        } }),
        preview_custom: Expose.action({ effect: 'read', description: 'preview', inputSchema: empty, outputSchema: empty, handler: async () => { throw new Error('must not query player state'); } }),
        confirm_custom: Expose.action({ effect: 'write', description: 'confirm', inputSchema: empty, outputSchema: empty, handler: async () => { writes++; return {}; } }),
        consume_custom: Expose.action({ effect: 'write', description: 'consume', inputSchema: empty, outputSchema: empty, handler: async () => { writes++; return {}; } })
      } }]);
      assert.equal(guidanceSession(), undefined);
      await handler();
      assert.equal(guidanceSession(), undefined, 'static recovery does not start a gameplay session');
    }, event, 'alemonjs-agent-link');
    assert.deepEqual(result.errors, []);
    assert.equal(reads, 1);
    assert.equal(writes, 0);
    if (scenario === 'preparation' || scenario === 'confirmation') {
      assert.equal(result.messages.length, 1);
      assert.match(JSON.stringify(result.messages[0].nodes), /本次没有提交操作/);
      assert.match(JSON.stringify(result.messages[0].nodes), /之前已经执行的操作不会撤销/);
      assert.equal(result.nextCalls.length, 0);
      assert.ok(result.actions[result.messages[0].actionIndex].results.every(receipt => receipt.code === 2000));
    } else {
      assert.equal(result.messages.length, 0);
      assert.equal(result.nextCalls.length, 1, 'unproven ownership must not intercept other plugins');
    }
  });
}


for (const unavailable of [false, true]) test(`unclaimed conversation returns event chain: unavailable=${unavailable}`, async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: `unclaimed-${unavailable}`, text: '今天天气怎么样' });
  const run = await app.runHandler(async () => {
    registerExpose('xiuxian-game', [conversationLifecycle, { name: 'xiuxian.player.v1', description: 'fixture', actions: {
      route_conversation: Expose.action({ effect: 'read', description: 'routing', inputSchema: { type: 'object', properties: { active: { type: 'boolean' }, hasNameDraft: { type: 'boolean' }, choices: { type: 'array', items: { type: 'string' } } }, required: ['active'], additionalProperties: false },
        outputSchema: { type: 'object', properties: { protocol: { type: 'string' }, decision: { type: 'string' } }, required: ['protocol', 'decision'], additionalProperties: false }, handler: async () => {
          if (unavailable) throw new Error('offline');
          return { protocol: 'plugin-conversation-route.v1', decision: 'unmatched' };
        } })
    } }]);
    rememberGameplay('get_inventory', { count: 3 });
    const before = JSON.stringify(guidanceSession());
    await handler();
    assert.equal(JSON.stringify(guidanceSession()), before);
    endGuidance(event);
  }, event, 'alemonjs-agent-link');
  assert.deepEqual(run.errors, []);
  assert.equal(run.nextCalls.length, 1);
  assert.equal(run.messages.length, 0);
});
