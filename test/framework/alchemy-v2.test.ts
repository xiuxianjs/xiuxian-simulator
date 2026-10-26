import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, Router, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import handler from '../../src/response/alchemy/v2/res';



import { parseAlchemyV2Reply } from '../../src/api/bot/alchemy-v2';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const reply = {
  title: '炼丹', heading: '', text: '聚灵丹 · 请求100炉 · 当前可炼2炉\n成丹率100.00%',
  blocks: [{ text: '丹火：青纹火\n丹炉：青纹鼎\n灵草 × 4（持有4）', quoted: true, inlineButtons: [{ label: '确认炼制2炉', command: '/炼丹 确认 stable-intent' }] }],
  buttons: [{ label: '丹方', command: '/炼丹 丹方' }], advice: []
};
for (const privateChat of [false, true]) {
  test(`丹方炉数按钮独立成行且不重复丹药名称 private=${privateChat}`, async t => {
    const commands = [1, 10, 100].map(count => `/炼丹 预览 7 ${count}`);
    const catalog = {
      ...reply,
      text: '炼丹师5级 · 每批最多1000炉\n丹方共7张 · 第2/2页\n点击丹方下方的炉数按钮查看材料，再确认炼制。',
      blocks: [
        { text: '清灵丹\n6级自动掌握 · 未掌握 · 达级自动掌握', quoted: true },
        { text: '通灵丹\n9级自动掌握 · 已掌握 · 旧方保留可炼\n', quoted: true,
          inlineButtons: [1, 10, 100].map((count, index) => ({ label: `${count}炉`, command: commands[index] })) }
      ]
    };
    const { app } = await gameFixture(t, request => businessEnvelope(request.bid, catalog));
    const event = privateChat ? app.events.privateMessage({ text: '/炼丹 丹方 2', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/炼丹 丹方 2', platform: 'qq-bot' });
    const result = await app.runHandler(handler, event);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const nodes = message.nodes.flatMap(node => node.type === 'Markdown' ? node.value : []);
    const quotes = nodes.filter(node => node.type === 'MD.blockquote');
    assert.equal(quotes.length, 2);
    assert.ok(Array.isArray(quotes[0].value));
    assert.ok(Array.isArray(quotes[1].value));
    const locked = inspectMessage([{ type: 'Markdown', value: quotes[0].value }]);
    const learned = inspectMessage([{ type: 'Markdown', value: quotes[1].value }]);
    assert.deepEqual(locked.commands, []);
    assert.deepEqual(learned.commands, commands);
    assert.match(learned.text, /通灵丹\n9级自动掌握.*\n.*1炉/);
    for (const count of [1, 10, 100]) assert.ok(learned.text.includes(`${count}炉`));
    assert.equal(learned.text.match(/通灵丹/g)?.length, 1);
    assert.match(message.text, /点击丹方下方的炉数按钮查看材料，再确认炼制/);
  });
  test(`即时预览保持材料与确认同一引用块 private=${privateChat}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, reply));
    const event = privateChat ? app.events.privateMessage({ text: '/炼丹 预览 1 100', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/炼丹 预览 1 100', platform: 'qq-bot' });
    const result = await app.runHandler(handler, event);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].path, '/api/v2/robot/business/alchemy.v2');
    assert.deepEqual(requests[0].body.arguments, {});
    assert.equal(requests[0].body.messageText, '/炼丹 预览 1 100');
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const nodes = message.nodes.flatMap(node => node.type === 'Markdown' ? node.value : []);
    const quotes = nodes.filter(node => node.type === 'MD.blockquote');
    assert.equal(quotes.length, 1);
    const quote = quotes[0];
    assert.ok(quote.type === 'MD.blockquote' && Array.isArray(quote.value));
    const view = inspectMessage([{ type: 'Markdown', value: quote.value }]);
    assert.match(view.text, /灵草 × 4/);
    assert.deepEqual(view.commands, ['/炼丹 确认 stable-intent']);
    assert.doesNotMatch(message.text, /融臣|熟练度|完美|精品|倒计时/);
  });
}
test('确认失败保留权威原因，不自动重试扣料', async t => {
  const { app, requests } = await gameFixture(t, () => ({ code: 'ALCHEMY_V2_VERSION_CHANGED', message: '炼丹规则已更新，请重新预览' }), 409);
  const result = await app.runHandler(handler, app.events.privateMessage({ text: '/炼丹 确认 stable-intent', platform: 'qq-bot' }));
  assert.equal(requests.length, 1);
  assert.equal(result.messages.length, 1);
  assert.match(result.messages[0].text, /炼丹规则已更新，请重新预览/);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
test('拒绝不完整炼丹气泡', () => {
  assert.throws(() => parseAlchemyV2Reply({ ...reply, blocks: [{ text: '坏消息', quoted: true, inlineButtons: [{}] }] }));
});

test('炼丹路由接收带确认参数的按钮命令', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { ...reply, blocks: [], text: '原结果，未再次扣料。' }));
  const router = Router.create({ events: ['message.create', 'private.message.create'] });

  router.use('炼丹', async () => ({ default: handler }));
  await app.mount({ responseRouter: router.define });
  const result = await app.dispatch(app.events.privateMessage({ text: '/炼丹 确认 stable-intent', platform: 'qq-bot' }));

  assert.equal(requests.length, 1);
  assert.equal(requests[0].body.messageText, '/炼丹 确认 stable-intent');
  assert.equal(result.messages.length, 1);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});





test('确认通信异常保留原操作供恢复，不引导创建新炼制', async t => {
  const { app, requests } = await gameFixture(t, () => ({ code: 'INTERNAL', message: 'internal failure' }), 500);
  const command = '/炼丹 确认 stable-intent';
  const result = await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' }));
  assert.equal(requests.length, 1);
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  assert.match(message.text, /结果暂未确认/);
  assert.ok(message.commands.includes(command));
  assert.ok(!message.commands.includes('/炼丹'));
});

test('天工操作续接原丹方和炉数，且不串玩家导航', async t => {
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, {
    ...reply, text: '已装备青纹鼎', blocks: [], buttons: [{ label: '丹方', command: '/炼丹 丹方' }]
  }));
  const run = (text: string, userId: string) => app.runHandler(handler, app.events.privateMessage({ text, userId, platform: 'qq-bot' }));
  await run('/炼丹 预览 7 100', 'continuation-owner');
  const owner = await run('/炼丹 装备 9', 'continuation-owner');
  assert.ok(owner.messages[0].commands.includes('/炼丹 预览 7 100'));
  assert.equal(owner.actions[owner.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const other = await run('/炼丹 天工', 'continuation-other');
  assert.ok(!other.messages[0].commands.includes('/炼丹 预览 7 100'));
});
