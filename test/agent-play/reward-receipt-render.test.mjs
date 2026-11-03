import test from 'node:test';
import assert from 'node:assert/strict';
import { Expose, registerExpose, useMessage } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { gameExpose } from '../../src/expose/index.ts';
import { gameGuidance } from '../../src/agent-play/game-guidance.ts';
import { rememberGuidance } from '../../src/agent-play/guidance-session.ts';
import { createChatReplyFormat } from '../../../alemonjs-agent-link/lib/dsh/reply-format.js';

for (const [label, receipt, expected] of [
  ['throw', undefined, /不能确认奖励到账/],
  ['unknown', { ok: false, error: { outcome: 'unknown' } }, /不能确认奖励到账/],
  ['rejected', { ok: true, data: { success: false, branch: 'business', replies: [] } }, /不能确认奖励到账/],
  ['empty', { ok: true, data: { success: true, branch: 'business', replies: [], result: { claimed: 0, skipped: 2, total: 2 } } }, /没有显示新增奖励/]
]) test(`actual provider receipt renderer preserves ${label} settlement uncertainty`, async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const run = await app.runHandler(async () => {
    registerExpose('xiuxian-game', gameExpose.getConfigs());
    rememberGuidance({ protocol: 'plugin-guidance.v1', flow: 'gameplay', accountExists: true });
    const tools = ['expose_read', 'expose_write', 'expose_call'].map(name => ({ name, execute: async args => {
      if (['get_conversation_contract', 'get_execution_policy', 'get_play_context'].includes(args.action)) return Expose.create().call(args.protocol, args.provider, args.action, JSON.parse(args.argumentsJson));
      if (args.action === 'get_guidance_state') return { ok: true, data: { protocol: 'plugin-guidance.v1', flow: 'gameplay', accountExists: true } };
      if (args.action === 'claim_all_emails') {
        if (label === 'throw') throw new Error('fixture transport interrupted');
        return receipt;
      }
      return { ok: false, error: { outcome: 'not_started' } };
    } }));
    const context = { signal: new AbortController().signal };
    const engine = gameGuidance(tools, '帮我领取奖励');
    await engine.prepare(context);
    // Inject only the backend outcome; execute the real provider wrappers and Format.
    const call = () => tools.find(tool => tool.name === 'expose_write').execute({ protocol: 'xiuxian.player.v1', provider: 'xiuxian-game', action: 'claim_all_emails', argumentsJson: '{}' }, context);
    if (label === 'throw') await assert.rejects(call, /fixture transport interrupted/);
    else await call();
    assert.equal(engine.review('本轮奖励已领取并确认到账。').accepted, false);
    assert.equal(engine.review('本轮尚不能确认到账，先核对原回执。').accepted, true);
    const reply = engine.append('本轮奖励已经到账。');
    const receipts = await useMessage()[0].send({ format: createChatReplyFormat(reply, 'qq-bot') });
    assert.ok(receipts.length && receipts.every(item => item.code === 2000));
  }, app.events.privateMessage({ platform: 'qq-bot', botId: 'fish', userId: `receipt-${label}`, text: '帮我领取奖励' }), 'xiuxian-game');
  assert.deepEqual(run.errors, []);
  const text = run.messages.map(message => message.text).join('\n');
  assert.match(text, expected);
  assert.doesNotMatch(text, /本轮奖励已经到账|尚未执行领取|退出AI|\[\[/u);
  const buttons = run.messages.flatMap(message => message.nodes).flatMap(node => node.type === 'Markdown' ? node.value.filter(item => item.type === 'MD.button') : []);
  assert.ok(buttons.length > 0);
  assert.ok(buttons.every(button => !button.options.data.startsWith('/') && button.options.autoEnter === false));
});
