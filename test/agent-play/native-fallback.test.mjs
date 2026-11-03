import test from 'node:test';
import assert from 'node:assert/strict';
import { Router, getConfigValue, useEvent } from 'alemonjs';
import { gameFixture, businessEnvelope } from '../framework/fixture.ts';
import { gameExpose } from '../../src/expose/index.ts';
import { onboardingContent } from '../../src/response/onboarding/context.ts';
import nativeHandler from '../../src/response/onboarding/res.ts';
import hostHandler from '../../../alemonjs-agent-link/lib/response/dsh/plugin-conversation.js';
import { rememberGuidance, guidanceSession } from '../../src/agent-play/guidance-session.ts';

for (const mode of ['absent', 'disabled', 'enabled']) test(`native guide survives actual plugin router dispatch with AI ${mode}`, async t => {
 const view = { status: 'active', phase: 'profile', version: 1, title: '系统 · 新手教学', lines: ['先查看角色'], feedback: [], actions: [{ label: '查看角色', command: '/我' }], entries: [] };
 const nextView = { ...view, phase: 'panel', version: 2, lines: ['接下来查看任务'], actions: [{ label: '任务面板', command: '/任务面板' }] };
 const { app, requests } = await gameFixture(t, request => {
  assert.ok(['/api/v2/robot/business/onboarding.view', '/api/v2/robot/business/onboarding.action'].includes(request.path), request.path);
  return businessEnvelope(request.bid, request.path.endsWith('onboarding.action') ? nextView : view);
 });
 app.configure({ ...app.run(() => getConfigValue()), 'alemonjs-agent-link': { aiEnabled: mode !== 'disabled', apiKey: 'fixture-no-model', model: 'fixture', runtimeMode: 'chat-only' } });
 let modelRequests = 0, hostVisits = 0, passed = 0;
 const originalFetch = globalThis.fetch;
 globalThis.fetch = async () => { modelRequests++; throw new Error('Native guide must never request a model'); };
 t.after(() => { globalThis.fetch = originalFetch; });
 if (mode !== 'absent') {
  const host = Router.create();
  host.res({ events: ['message.create', 'private.message.create'] }, async () => ({ default: async () => { hostVisits++; await hostHandler(); } }));
  await app.mount({ responseRouter: host.define }, undefined, 'alemonjs-agent-link');
 }
 const game = Router.create();
 game.res({ events: ['message.create', 'private.message.create'] }, async () => ({ default: nativeHandler }));
 game.res({ events: ['message.create', 'private.message.create'] }, async () => ({ default: () => { passed++; useEvent()[1](); } }));
 await app.mount({ expose: gameExpose, responseContent: onboardingContent, responseRouter: game.define }, undefined, 'xiuxian-game');
 const event = text => app.events.privateMessage({ platform: 'qq-bot', botId: '100017', userId: `native-${mode}`, messageId: text, text });
 if (mode !== 'absent') await app.invoke(event('旧对话'), () => rememberGuidance({ flow: 'onboarding', accountExists: true }, '大肥鱼'), 'xiuxian-game');
 const opened = await app.dispatch(event('/继续引导'));
 assert.deepEqual(opened.errors, []);
 assert.ok(opened.messages.some(message => message.text.includes('先查看角色')), JSON.stringify(opened));
 assert.equal(requests.length, 1);
 assert.equal(requests[0].path, '/api/v2/robot/business/onboarding.view');
 if (mode !== 'absent') {
  assert.equal(hostVisits, 1);
  const cleared = await app.invoke(event('检查'), () => guidanceSession(), 'xiuxian-game');
  assert.equal(cleared.value, undefined);
 }
 const continued = await app.dispatch(event('/我'));
 assert.deepEqual(continued.errors, []);
 assert.equal(continued.context.claimed, true);
 assert.equal(requests.length, 2);
 assert.equal(requests[1].path, '/api/v2/robot/business/onboarding.action');
 assert.deepEqual(requests[1].body.arguments, { version: 1, command: '/我' });
 assert.ok(continued.messages.some(message => message.text.includes('接下来查看任务')));
 const buttons = continued.messages.flatMap(message => message.nodes.flatMap(node => node.type === 'ButtonGroup' || node.type === 'BT.group' ? node.value.flatMap(row => row.value) : []));
 assert.ok(buttons.some(button => button.options.data === '/任务面板'));
 const unrelated = await app.dispatch(event('/其他插件功能'));
 assert.deepEqual(unrelated.errors, []);
 assert.equal(passed, 1, 'Unrelated commands must reach following plugins');
 assert.equal(requests.length, 2);
 assert.equal(modelRequests, 0);
});
