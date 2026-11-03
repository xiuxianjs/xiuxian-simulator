import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestApp } from 'alemonjs/testing';
import { Expose, registerExpose } from 'alemonjs';
import { createOnboardingMenu, onboardingMenuPage, conversationalMenuPage } from '../../src/response/onboarding/menu-pages.ts';
import { showOnboarding, onboardingContent } from '../../src/response/onboarding/context.ts';
import { handleOnboardingResponse } from '../../src/response/onboarding/res.ts';
import { conversationLifecycle } from '../../src/agent-play/lifecycle.ts';
import { rememberGuidance } from '../../src/agent-play/guidance-session.ts';
const view = { status: 'active', phase: 'milestone.menu', version: 42, title: '新境界开放', lines: [], feedback: [], actions: [], entries: [], branchMenu: { lines: ['选择要了解的玩法。'], items: Array.from({ length: 19 }, (_, index) => ({ id: `branch-${index}`, name: `分支${index + 1}`, description: `用途${index + 1}`, command: `/继续引导 42 branch-${index}`, learned: index % 2 === 0 })) } };
const buttons = run => {
  const found = [];
  const visit = value => {
    if (!value || typeof value !== 'object') return;
    if (value.type === 'MD.button') found.push(value);
    else for (const child of Object.values(value)) visit(child);
  };
  visit(run.messages.map(message => message.nodes));
  return found;
};

test('native menu sends six branches per page and actual page handler never calls gameplay', async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  await app.mount({ responseContent: onboardingContent }, {}, 'xiuxian-game');
  const event = app.events.privateMessage({ platform: 'qq-bot', botId: 'bot', userId: 'native', text: '/继续引导' });
  let page;
  const first = await app.runHandler(async () => { page = createOnboardingMenu(view); await showOnboarding(event, page.view, undefined, page); }, event, 'xiuxian-game');
  assert.deepEqual(first.errors, []);
  const choices = buttons(first);
  assert.equal(choices.filter(button => button.options.data.startsWith('/继续引导 42')).length, 6);
  assert.ok(choices.some(button => button.options.data === `/引导目录分页 ${page.id} 2`));
  assert.ok(first.messages.every(message => first.actions[message.actionIndex].results.every(result => result.code === 2000)));
  const nextEvent = app.events.privateMessage({ platform: 'qq-bot', botId: 'bot', userId: 'native', text: `/引导目录分页 ${page.id} 2` });
  const second = await app.runHandler(() => handleOnboardingResponse(nextEvent, () => assert.fail('page belongs to plugin')), nextEvent, 'xiuxian-game');
  assert.deepEqual(second.errors, []);
  const choices2 = buttons(second);
  assert.equal(choices2.filter(button => button.options.data.startsWith('/继续引导 42')).length, 6);
  assert.ok(choices2.some(button => button.options.data === '/继续引导 42 branch-6'));
  assert.ok(choices2.some(button => button.options.data === `/引导目录分页 ${page.id} 1`));
  assert.ok(!second.messages.map(message => message.text).join('').includes('用途1\n'));
});

test('conversation pagination preserves all original no-prefix commands and scope without model calls', async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const event = app.events.privateMessage({ platform: 'qq-bot', botId: 'bot', userId: 'dialogue', text: '继续带我玩修仙' });
  let id;
  const setup = await app.runHandler(async () => {
    registerExpose('xiuxian-game', [conversationLifecycle]);
    rememberGuidance({ protocol: 'plugin-guidance.v1', accountExists: true, flow: 'onboarding' });
    const page = createOnboardingMenu(view); id = page.id;
    const all = [];
    for (let current = 1; current <= 4; current++) {
      const rendered = conversationalMenuPage(onboardingMenuPage(id, current));
      assert.ok(rendered.includes(`第${current}/4页`));
      all.push(...[...rendered.matchAll(/\[\[(继续引导 42 branch-\d+)\]\]/gu)].map(match => match[1]));
      assert.ok(!rendered.includes('[[/'));
    }
    assert.deepEqual(all, view.branchMenu.items.map(item => item.command.slice(1)));
    assert.equal(onboardingMenuPage(id, 0), undefined);
    assert.equal(onboardingMenuPage(id, 5), undefined);
    assert.equal(onboardingMenuPage(id, 1, { ...event, UserId: 'other' }), undefined);
    assert.equal(onboardingMenuPage(id, 1, { ...event, BotId: 'other' }), undefined);
    assert.equal(onboardingMenuPage(id, 1, { ...event, ChannelId: 'other' }), undefined);
  }, event, 'xiuxian-game');
  assert.deepEqual(setup.errors, []);
  const request = app.events.privateMessage({ platform: 'qq-bot', botId: 'bot', userId: 'dialogue', text: `引导目录分页 ${id} 2` });
  const result = await app.runHandler(async () => {
    const response = await Expose.create().call('agent.conversation.v1', 'xiuxian-game', 'route', { aiEnabled: true });
    assert.equal(response.ok, true, JSON.stringify(response));
    assert.equal(response.data.decision, 'reply');
    assert.match(response.data.reply, /第2\/4页/);
    assert.match(response.data.reply, /\[\[继续引导 42 branch-6\]\]/);
    assert.doesNotMatch(response.data.reply, /返回玩法目录|暂离/);
  }, request, 'xiuxian-game');
  assert.deepEqual(result.errors, []);
});

test('actual dialogue engine pages a complete provider directory without echoing hidden branches', async t => {
  const { gameGuidance } = await import('../../src/agent-play/game-guidance.ts');
  const { onboardingSchema } = await import('../../src/expose/onboarding-schema.ts');
  const app = createTestApp();
  t.after(() => app.dispose());
  const text = { type: 'string' };
  const result = await app.runHandler(async () => {
    registerExpose('xiuxian-game', [{ name: 'xiuxian.player.v1', description: 'directory fixture', actions: {
      read_directory: Expose.action({ description: 'read directory', effect: 'read', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, outputSchema: {
        type: 'object', additionalProperties: false, required: ['success', 'branch', 'result', 'presentation'], properties: {
          success: { type: 'boolean' }, branch: text, result: onboardingSchema,
          presentation: { type: 'object', additionalProperties: false, required: ['protocol','delivery','text'], properties: { protocol: { type: 'string', enum: ['system-guide.v1'] }, delivery: text, text } }
        }
      }, handler: () => ({ success: true, branch: 'business', result: { ...view, feedback: ['原操作反馈'] }, presentation: { protocol: 'system-guide.v1', delivery: 'pending', text: view.branchMenu.items.map(item => `${item.name} ${item.command}`).join('\n') } }) })
    } }]);
    rememberGuidance({ protocol: 'plugin-guidance.v1', accountExists: true, flow: 'onboarding' }, '大肥鱼');
    const tools = [{ name: 'expose_read', execute: args => Expose.create().call(args.protocol, args.provider, args.action, JSON.parse(args.argumentsJson)) }];
    const engine = gameGuidance(tools, '看看新境界功能');
    const response = await tools[0].execute({ protocol: 'xiuxian.player.v1', provider: 'xiuxian-game', action: 'read_directory', argumentsJson: '{}' }, { signal: new AbortController().signal });
    assert.equal(response.ok, true);
    const reply = engine.append('请选择分支。');
    assert.match(reply, /第1\/4页/);
    assert.match(reply, /原操作反馈/);
    for (const item of view.branchMenu.items.slice(0, 6)) assert.ok(reply.includes(`[[${item.command.slice(1)}]]`));
    for (const item of view.branchMenu.items.slice(6)) assert.ok(!reply.includes(item.command.slice(1)));
  }, app.events.privateMessage({ platform: 'qq-bot', botId: 'bot', userId: 'engine', text: '看看新境界功能' }), 'xiuxian-game');
  assert.deepEqual(result.errors, []);
});

test('realm review snapshots stay separate and expired menus cannot be reopened', async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const event = app.events.privateMessage({ platform: 'qq-bot', botId: 'bot', userId: 'review', text: '回看目录' });
  const run = await app.runHandler(async () => {
    const earlier = createOnboardingMenu(view);
    const later = createOnboardingMenu({ ...view, title: '后续境界', version: 43, branchMenu: { lines: [], items: [{ ...view.branchMenu.items[0], name: '后续玩法', command: '/继续引导 43 later' }] } });
    assert.notEqual(earlier.id, later.id);
    assert.equal(onboardingMenuPage(earlier.id, 3).view.version, 42);
    assert.equal(onboardingMenuPage(later.id, 1).view.version, 43);
    const future = Date.now() + 31 * 60000;
    const clock = t.mock.method(Date, 'now', () => future);
    try {
      assert.equal(onboardingMenuPage(earlier.id, 1), undefined);
      assert.equal(onboardingMenuPage(later.id, 1), undefined);
    } finally { clock.mock.restore(); }
  }, event, 'xiuxian-game');
  assert.deepEqual(run.errors, []);
});
