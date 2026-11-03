import test from 'node:test';
import assert from 'node:assert/strict';
import { Expose, registerExpose, useMessage } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { gameGuidance } from '../../src/agent-play/game-guidance.ts';
import { onboardingSchema } from '../../src/expose/onboarding-schema.ts';
import { rememberGuidance, rememberDeliveredDialogue, guidanceSession, endGuidance } from '../../src/agent-play/guidance-session.ts';
import { dialogueOptionText, normalizeDialogueOptions } from '../../src/agent-play/dialogue-options.ts';
import { conversationLifecycle } from '../../src/agent-play/lifecycle.ts';
import { conversationRoutingActions } from '../../src/expose/conversation-routing.ts';
import { createChatReplyFormat } from '../../../alemonjs-agent-link/lib/dsh/reply-format.js';
const empty = { type: 'object', properties: {}, additionalProperties: false };
const str = { type: 'string' };
const presentation = { type: 'object', properties: { protocol: { type: 'string', enum: ['system-guide.v1'] }, delivery: str, text: str }, required: ['protocol', 'delivery', 'text'], additionalProperties: false };

for (const embedded of [false, true]) test(`server commands survive real guidance rendering, delivery and follow-up routing with a large branch menu (embedded=${embedded})`, async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const action = embedded ? 'breakthrough_realm' : 'get_onboarding';
  const menuField = embedded ? 'onboarding' : 'result';
  const items = Array.from({ length: 15 }, (_, i) => ({ id: `branch-${i}`, name: `学习分支${i}`, command: `/继续引导 1234567890123456789 branch-${i}`, description: '分支说明', learned: false }));
  const view = { status: 'active', phase: 'milestone-menu', version: 9, title: '新境界', lines: ['选择学习分支'], feedback: embedded ? ['境界提升：炼气一层 → 炼气二层'] : [], actions: [{ label: '领取今日补给', command: '/签到' }], entries: [{ label: '回看炼气', command: '/继续引导 9 review' }], branchMenu: { lines: [], items } };
  const event = app.events.privateMessage({ platform: 'qq-bot', botId: 'fish', userId: 'command-options', text: '继续新手引导' });
  const run = await app.runHandler(async () => {
    registerExpose('xiuxian-game', [conversationLifecycle, { name: 'xiuxian.player.v1', description: 'fixture', actions: {
      ...conversationRoutingActions,
      [action]: Expose.action({ description: 'lesson receipt', effect: embedded ? 'write' : 'read', inputSchema: empty, outputSchema: { type: 'object', properties: { success: { type: 'boolean' }, branch: str, [menuField]: onboardingSchema, presentation }, required: ['success', 'branch', menuField, 'presentation'], additionalProperties: false }, handler: () => ({ success: true, branch: 'business', [menuField]: view, presentation: { protocol: 'system-guide.v1', delivery: 'pending', text: '选择学习分支' } }) })
    } }]);
    rememberGuidance({ accountExists: true });
    const tools = [{ name: embedded ? 'expose_write' : 'expose_read', execute: args => Expose.create().call(args.protocol, args.provider, args.action, {}) }];
    const engine = gameGuidance(tools, event.MessageText);
    const reply = await tools[0].execute({ protocol: 'xiuxian.player.v1', provider: 'xiuxian-game', action }, { signal: new AbortController().signal });
    assert.equal(reply.ok, true, JSON.stringify(reply));
    const text = engine.append('想先了解什么？[[领取今日补给]] [[学习分支0]]');
    const receipts = await useMessage()[0].send({ format: createChatReplyFormat(text, 'qq-bot') });
    assert.ok(receipts.every(receipt => receipt.code === 2000));
    rememberDeliveredDialogue(text);
    assert.ok(guidanceSession().dialogueChoices.includes(items[0].command.slice(1)));
    assert.ok(!guidanceSession().dialogueChoices.includes(items[14].command.slice(1)));
  }, event, 'alemonjs-agent-link');
  assert.deepEqual(run.errors, []);
  const rendered = run.messages.map(message => message.text).join('\n');
  assert.equal(rendered.split('新境界').length - 1, 1, 'Directory title should appear once');
  if (embedded) assert.ok(rendered.indexOf('境界提升：炼气一层 → 炼气二层') < rendered.indexOf('学习分支0'));
  const buttons = run.messages.flatMap(message => message.nodes.flatMap(node => node.type === 'Markdown' ? node.value : [])).filter(node => node.type === 'MD.button');
  const expected = [...view.actions, ...view.entries, ...items.slice(0, 6)].map(item => item.command.slice(1));
  assert.deepEqual(new Set(buttons.filter(button => !button.options.data.startsWith('引导目录分页 ')).map(button => button.options.data)), new Set(expected));
  assert.ok(buttons.every(button => !button.options.data.startsWith('/') && button.options.autoEnter === false));
  let navigation = buttons.find(button => button.options.data.startsWith('引导目录分页 ')).options.data;
  for (const page of [2, 3]) {
    const pageEvent = app.events.privateMessage({ platform: 'qq-bot', botId: 'fish', userId: 'command-options', messageId: `page-${page}`, text: navigation });
    const paged = await app.runHandler(async () => {
      const response = await Expose.create().call('agent.conversation.v1', 'xiuxian-game', 'route', { aiEnabled: true });
      assert.equal(response.ok, true, JSON.stringify(response));
      assert.equal(response.data.decision, 'reply');
      assert.ok(response.data.reply.includes(`第${page}/3页`));
      const receipts = await useMessage()[0].send({ format: createChatReplyFormat(response.data.reply, 'qq-bot') });
      assert.ok(receipts.every(receipt => receipt.code === 2000));
      rememberDeliveredDialogue(response.data.reply);
      if (page === 2) navigation = guidanceSession().dialogueChoices.find(choice => /^引导目录分页 [a-f0-9]{12} 3$/u.test(choice));
      else assert.ok(guidanceSession().dialogueChoices.includes(items[14].command.slice(1)));
    }, pageEvent, 'alemonjs-agent-link');
    assert.deepEqual(paged.errors, []);
  }
  const followup = app.events.privateMessage({ platform: 'qq-bot', botId: 'fish', userId: 'command-options', text: items[14].command.slice(1) });
  const continued = await app.runHandler(async () => {
    const result = await Expose.create().call('xiuxian.player.v1', 'xiuxian-game', 'route_conversation', { active: true, choices: guidanceSession().dialogueChoices });
    assert.equal(result.data.decision, 'matched');
    endGuidance(followup);
  }, followup, 'alemonjs-agent-link');
  assert.deepEqual(continued.errors, []);
});

test('command normalization does not shorten payloads or guess duplicate labels', () => {
  assert.equal(dialogueOptionText({ label: '补给 · /签到' }), '签到');
  assert.equal(dialogueOptionText({ label: '查看', command: '/' + '修'.repeat(79) }), '修'.repeat(79));
  assert.equal(dialogueOptionText({ label: '重新选择', command: '/' + '修'.repeat(80) }), '重新选择');
  const ambiguous = [{ label: '学习', command: '/继续引导 9 a' }, { label: '学习', command: '/继续引导 9 b' }];
  assert.equal(normalizeDialogueOptions('[[学习]]', ambiguous), '[[学习]]');
  assert.equal(normalizeDialogueOptions('[[其他玩法]]', ambiguous), '[[其他玩法]]');
});

test('delivered lesson choices retain their original version across unsent refreshes', async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const event = app.events.privateMessage({ platform: 'qq-bot', botId: 'fish', userId: 'lesson-version', messageId: 'lesson-v7', text: '继续' });
  const run = await app.runHandler(async () => {
    rememberGuidance({ flow: 'onboarding' });
    const session = guidanceSession();
    session.lesson = { phase: 'checkin', version: 7, actions: [{ label: '领取补给', command: '/签到' }] };
    assert.equal(session.deliveredLesson, undefined);
    const text = '领取今日补给\n[[签到]]';
    const receipts = await useMessage()[0].send({ format: createChatReplyFormat(text, 'qq-bot') });
    assert.ok(receipts.length && receipts.every(receipt => receipt.code === 2000));
    rememberDeliveredDialogue(text);
    assert.deepEqual(session.deliveredLesson, session.lesson);
    session.lesson = { phase: 'chapter', version: 8, actions: [{ label: '查看章节', command: '/查看主线 1' }] };
    rememberGuidance({ flow: 'onboarding' });
    assert.equal(guidanceSession().deliveredLesson.version, 7);
    assert.equal(guidanceSession().deliveredLesson.actions[0].command, '/签到');
    endGuidance(event);
  }, event, 'alemonjs-agent-link');
  assert.deepEqual(run.errors, []);
  const buttons = run.messages.flatMap(message => message.nodes.flatMap(node => node.type === 'Markdown' ? node.value : [])).filter(node => node.type === 'MD.button');
  assert.deepEqual(buttons.map(button => button.options.data), ['签到']);
});

for (const incomplete of [false, true]) test(`original operation receipt precedes explanation and next inputs (incomplete=${incomplete})`, async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const view = { status: 'active', phase: 'chapter', version: 3, title: '新手教学', lines: ['进入首章'], feedback: [], actions: [{ label: '查看首章', command: '/查看主线 1' }], entries: [] };
  const run = await app.runHandler(async () => {
    registerExpose('xiuxian-game', [{ name: 'xiuxian.player.v1', description: 'fixture', actions: {
      perform_onboarding_action: Expose.action({ description: 'original lesson', effect: 'write', inputSchema: empty, outputSchema: { type: 'object', properties: { success: { type: 'boolean' }, branch: str, result: onboardingSchema, presentation }, required: ['success', 'branch', 'result', 'presentation'], additionalProperties: false }, handler: () => ({ success: true, branch: 'business', result: view, presentation: { protocol: 'system-guide.v1', delivery: 'pending', text: '新手教学\n领取结果：已领取\n奖励：灵晶 ×50\n下一步：进入首章' } }) })
    } }]);
    rememberGuidance({ accountExists: true, flow: 'onboarding' }, '大肥鱼');
    const tools = [{ name: 'expose_write', execute: args => Expose.create().call(args.protocol, args.provider, args.action, {}) }];
    const engine = gameGuidance(tools, '领取补给');
    await tools[0].execute({ protocol: 'xiuxian.player.v1', provider: 'xiuxian-game', action: 'perform_onboarding_action' }, { signal: new AbortController().signal });
    const text = engine.append('补给收好了，接下来看看首章。', incomplete);
    const sent = await useMessage()[0].send({ format: createChatReplyFormat(text, 'qq-bot') });
    assert.ok(sent.every(receipt => receipt.code === 2000));
  }, app.events.privateMessage({ platform: 'qq-bot', botId: 'fish', userId: `receipt-order-${incomplete}`, text: '领取补给' }), 'alemonjs-agent-link');
  assert.deepEqual(run.errors, []);
  const text = run.messages.map(message => message.text).join('\n');
  if (incomplete) assert.doesNotMatch(text, /这次没能|返回玩法目录|暂离/u);
  else assert.ok(text.indexOf('领取结果：已领取') < text.indexOf('补给收好了'), text);
  assert.ok(text.indexOf('奖励：灵晶 ×50') < text.indexOf('‹查看主线 1›'), text);
  assert.equal(text.split('奖励：灵晶 ×50').length - 1, 1);
  const buttons = run.messages.flatMap(message => message.nodes.flatMap(node => node.type === 'Markdown' ? node.value : [])).filter(node => node.type === 'MD.button');
  assert.ok(buttons.some(button => button.options.data === '查看主线 1'));
  assert.ok(buttons.every(button => button.options.autoEnter === false && !button.options.data.startsWith('/')));
});
