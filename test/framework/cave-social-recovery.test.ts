import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import social from '../../src/response/cavePlot/social/res';
import tend from '../../src/response/cavePlot/tendAll/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

const cases = [
  { handler: social, command: '/协作灵田 9 浇灌', reason: '自己的灵田请直接操作', expected: '/灵田', text: '目标是本人' },
  { handler: social, command: '/偷药 9', reason: '不能对自己的灵田发起偷药', expected: '/灵田', text: '自己的灵田' },
  { handler: social, command: '/协作灵田 9 浇灌', reason: '只有好友或道侣可以协作照料灵田', expected: '/我的好友', text: '核对本人和目标' },
  { handler: social, command: '/协作灵田 9 收割', reason: '好友不能代为收割', expected: '/我的好友', text: '收割由主人或道侣执行' },
  { handler: social, command: '/偷药 9', reason: '道侣之间不能互相偷药', expected: '/我的道侣', text: '不通过解除关系' },
  { handler: social, command: '/协作灵田 9 除虫', reason: '对方当前没有需要处理的对应异常灵田', expected: '/我的好友', text: '目标灵田' },
  { handler: social, command: '/协作灵田 9 收割', reason: '当前没有可收割的成熟灵植', expected: '/我的好友', text: '不让本人补材料' },
  { handler: social, command: '/偷药 9', reason: '对方当前没有可偷取的成熟灵植', expected: '/我的好友', text: '目标灵田' },
  { handler: social, command: '/偷药 9', reason: '你今日成功偷药次数已达上限（3次）', expected: '/灵田', text: '切换目标或补材料不能增加' },
  { handler: social, command: '/偷药 9', reason: '对方今日已被成功偷药过', expected: '/灵田记录', text: '目标当日保护' },
  { handler: social, command: '/偷药 9', reason: '今日已对该道友发起过偷药', expected: '/灵田记录', text: '不把失败当成未发生过尝试' },
  { handler: social, command: '/协作灵田', reason: '格式错误，示例：/协作灵田 123 浇灌 2 或 /协作灵田 @目标 浇灌 2', expected: '/我的好友', text: '不使用示例编号' },
  { handler: tend, command: '/一键照料道侣灵田', reason: '当前没有道侣', expected: '/我的道侣', text: '当前仍有效的道侣关系' }
];
for (const entry of cases) for (const isPrivate of [false, true]) for (const mode of ['http', 'feedback']) {
  test(`${entry.command} ${isPrivate} ${mode} ${entry.reason}`, async t => {
    const { app, requests } = await gameFixture(t, request => mode === 'http'
      ? { code: 'CONFLICT', message: entry.reason }
      : businessEnvelope(request.bid, undefined, [{ title: '灵田互动', heading: '', text: entry.reason, buttons: [], advice: [] }]),
    mode === 'http' ? 409 : 200);
    const event = isPrivate
      ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' })
      : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].idempotencyKey);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(entry.reason));
    assert.ok(view.text.includes(entry.text), view.text);
    assert.ok(view.commands.includes(entry.expected));
    assert.ok(!view.commands.some(command => /^\/(?:偷药|协作灵田|一键照料道侣灵田|解除道侣|结为道侣)(?:\s|$)/.test(command)));
    if (mode === 'feedback' && entry.handler === social && entry.command.includes(' 9')) {
      assert.ok(view.commands.includes('/查看灵田 9'));
      assert.ok(!view.commands.includes('/查看灵田 123'));
    }
    assert.equal(message.target?.targetId, isPrivate ? event.UserId : event.ChannelId);
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

const partials = [
  { command: '/一键照料道侣灵田', lines: ['浇灌：2 项', '除虫：该灵植数据异常，暂时无法照料', '除草：1 项', '收获归道侣所有'], expected: '/我的道侣', text: '部分失败不代表整批回滚' },
  { command: '/一键打理灵田', lines: ['浇灌：2 项', '除虫：操作失败，请稍后重试', '除草：1 项', '收割：暂无成熟灵植'], expected: '/灵田', text: '部分失败不等于整批回滚' },
  { command: '/一键照料道侣灵田', lines: ['浇灌：2 项', '除虫：操作失败，请稍后重试', '除草：1 项', '收获归道侣所有'], expected: '/我的道侣', text: '部分失败不代表整批回滚' },
  { command: '/一键照料道侣灵田 代收割', lines: ['浇灌：2 项', '除虫：0 项', '除草：1 项', '收割：当前没有可收割的成熟灵植', '收获归道侣所有'], expected: '/我的道侣', text: '目标灵田' },
  { command: '/一键照料道侣灵田', lines: ['浇灌：2 项', '除虫：当前没有道侣', '除草：当前没有道侣', '收获归道侣所有'], expected: '/我的道侣', text: '当前仍有效的道侣关系' }
];
for (const entry of partials) for (const isPrivate of [false, true]) {
  test(`一键照料部分完成保留原行且不重放 ${entry.command} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { message: entry.lines.join('\n') }));
    const event = isPrivate
      ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' })
      : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(tend, event);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    for (const line of entry.lines) assert.ok(view.text.includes(line));
    assert.ok(view.text.includes(entry.text), view.text);
    assert.ok(view.commands.includes(entry.expected));
    assert.ok(!view.commands.some(command => /^\/一键(?:照料道侣灵田|打理灵田)/.test(command)));
    if (entry.lines.filter(line => line.includes('当前没有道侣')).length === 2) {
      assert.equal(view.text.split('照料道侣灵田需要当前仍有效的道侣关系').length - 1, 1);
    }
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

for (const harvest of [false, true]) for (const isPrivate of [false, true]) {
  test(`正常照料保留已完成记录，代收割后不再推荐重放 harvest=${harvest} private=${isPrivate}`, async t => {
    const lines = ['浇灌：2 项', '除虫：0 项', '除草：1 项', ...(harvest ? [
      '收割完成，获得 凝气草 x3，灵植经验 5，本轮种植：完美照料1块。'
    ] : []), '收获归道侣所有'];
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { message: lines.join('\n') }));
    const command = '/一键照料道侣灵田' + (harvest ? ' 代收割' : '');
    const event = isPrivate
      ? app.events.privateMessage({ text: command, platform: 'qq-bot' })
      : app.events.groupMessage({ text: command, platform: 'qq-bot' });
    const result = await app.runHandler(tend, event);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    for (const line of lines) assert.ok(view.text.includes(line));
    assert.equal(view.commands.includes('/一键照料道侣灵田 代收割'), !harvest);
    assert.ok(!view.text.includes('建议：'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

test('无效目标编号不能生成看似可用的目标跳转', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{
    title: '灵田互动', heading: '', text: '灵田互动参数无效', buttons: [], advice: []
  }]));
  const result = await app.runHandler(social, app.events.privateMessage({ text: '/偷药 9999999999999999999999999', platform: 'qq-bot' }));
  assert.equal(requests.length, 1);
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  const view = inspectMessage(message.nodes);
  assert.ok(view.commands.includes('/我的好友'));
  assert.ok(!view.commands.some(command => command.startsWith('/查看灵田 ')));
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
});
