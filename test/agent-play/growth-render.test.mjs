import test from 'node:test';
import assert from 'node:assert/strict';
import { Expose, registerExpose, useMessage, ResultCode } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { gameExpose } from '../../src/expose/index.ts';
import { gameGuidance } from '../../src/agent-play/game-guidance.ts';
import { rememberGuidance } from '../../src/agent-play/guidance-session.ts';
import { createChatReplyFormat } from '../../../alemonjs-agent-link/lib/dsh/reply-format.js';

test('actual dialogue renderer preserves slash units, ratios and tables while removing command instructions', async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const facts = [
    '比值：主线25/10 = 2.5修为/精力；秘境20/8 = 2.5修为/精力。',
    '比值：2.5 修为 /精力；加速消耗25灵石/次。',
    '| 玩法 | 基础收益/精力 |', '| 主线 | 2.5修为/精力 |',
    '预计：7场 × 10精力 = 70精力；剩余90 − 70 = 20。'
  ];
  const run = await app.runHandler(async () => {
    registerExpose('xiuxian-game', gameExpose.getConfigs());
    rememberGuidance({ protocol: 'plugin-guidance.v1', flow: 'gameplay', accountExists: true });
    const tools = ['expose_read', 'expose_write', 'expose_call'].map(name => ({ name, execute: async args => {
      if (['get_conversation_contract', 'get_execution_policy', 'get_play_context'].includes(args.action)) return Expose.create().call(args.protocol, args.provider, args.action, JSON.parse(args.argumentsJson));
      if (args.action === 'get_guidance_state') return { ok: true, data: { protocol: 'plugin-guidance.v1', flow: 'gameplay', accountExists: true } };
      return { ok: false, error: { outcome: 'not_started' } };
    } }));
    const engine = gameGuidance(tools, '修仙如何快速升级，只分析不执行');
    const ctx = { signal: new AbortController().signal };
    await engine.prepare(ctx);
    await tools.find(tool => tool.name === 'expose_read').execute({ protocol: 'xiuxian.player.v1', provider: 'xiuxian-game', action: 'get_guidance_state', argumentsJson: '{}' }, ctx);
    const reply = engine.append([...facts, '请发送 /签到', '/继续引导', '可选指令：', '领取补给 · /签到', '[[返回玩法目录]]'].join('\n'));
    const receipts = await useMessage()[0].send({ format: createChatReplyFormat(reply, 'qq-bot') });
    assert.ok(receipts.length && receipts.every(receipt => receipt.code === ResultCode.Ok));
  }, app.events.privateMessage({ platform: 'qq-bot', botId: 'fish', userId: 'growth-render', text: '修仙如何快速升级，只分析不执行' }), 'xiuxian-game');
  assert.deepEqual(run.errors, []);
  const text = run.messages.map(message => message.text).join('\n');
  for (const fact of facts) assert.ok(text.includes(fact), fact);
  assert.doesNotMatch(text, /请发送|\/签到|\/继续引导|可选指令|\[\[/u);
  const buttons = run.messages.flatMap(message => message.nodes.flatMap(node => node.type === 'Markdown' ? node.value : [])).filter(node => node.type === 'MD.button');
  assert.ok(buttons.some(button => button.options.data === '返回玩法目录' && button.options.autoEnter === false));
});
