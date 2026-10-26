import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import calendar from '../../src/response/signIn/calendar/res';
import daily from '../../src/response/signIn/daily/res';
import hub from '../../src/response/signIn/hub/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

for (const text of ['/签到日历 日常', '/签到日历 日期 3', '/签到概览']) {
  test(`${text}只调用查看业务并返回可发送日历节点`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, {
      title: '日常签到日历', blocks: [{ text: '本月累计6天\n再签到1天 → 宝箱 ×1', buttons: [{ label: '日期奖励', command: '/签到日历 日期' }] }],
      buttons: [{ label: '返回签到', command: '/签到概览' }]
    }));
    const result = await app.runHandler(calendar, app.events.groupMessage({ text, platform: 'qq-bot' }));
    assert.equal(requests.length, 1);
    assert.equal(requests[0].path, '/api/v2/robot/business/checkin.view');
    const args = requests[0].body.arguments as { scope: string; page: number };
    assert.equal(args.scope, text.includes('概览') ? 'overview' : text.includes('日期') ? 'dates' : 'daily');
    assert.equal(args.page, text.includes('日期') ? 3 : 0);
    const sent = result.messages[0];
    assert.ok(sent.text.includes('宝箱 ×1'));
    assert.ok(sent.commands.includes('/签到概览'));
    assert.ok(!sent.commands.includes('/签到'));
    assert.ok(sent.nodes.length);
    assert.equal(result.actions[sent.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

test('日期与累计同名奖励分别展示，称号有效期不丢失', async t => {
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, {
    accumulatedDays: 7, issued: [{ type: 'item', name: '宝箱', amount: 2 }, { type: 'item', name: '宝箱', amount: 3 }],
    dateIssued: [{ type: 'item', name: '宝箱', amount: 2 }], accumulatedIssued: [{ type: 'item', name: '宝箱', amount: 3 }],
    progressText: '再签到7天 → 下一档奖励', titleReward: { message: '称号有效期更新至：2026-11-08' }, repeatSuffix: '', ritualText: ''
  }));
  const result = await app.runHandler(daily, app.events.privateMessage({ text: '/日常签到', platform: 'qq-bot' }));
  const sent = result.messages[0];
  assert.ok(sent.text.includes('今日奖励：宝箱 ×2'));
  assert.ok(sent.text.includes('累计奖励已到账：宝箱 ×3'));
  assert.ok(sent.text.includes('2026-11-08'));
  assert.ok(sent.text.includes('再签到7天'));
  assert.ok(sent.commands.includes('/签到日历 日常'));
  assert.equal(result.actions[sent.actionIndex].results?.[0].code, ResultCode.Ok);
});

test('跳过签到仍有所属日历，未加入宗门不用成功标记', async t => {
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, { results: [
    { name: '日常签到', status: 'skip', message: '今日已签到\n再签到1天 → 宝箱 ×1' },
    { name: '宗门签到', status: 'skip', message: '未加入宗门' }
  ] }));
  const result = await app.runHandler(hub, app.events.groupMessage({ text: '/签到', platform: 'qq-bot' }));
  const sent = result.messages[0];
  assert.ok(sent.commands.includes('/签到日历 日常'));
  assert.ok(!sent.text.includes('✅ 宗门'));
  assert.equal(result.actions[sent.actionIndex].results?.[0].code, ResultCode.Ok);
  const quotes = sent.nodes.flatMap(node => node.type === 'Markdown' ? node.value.filter(child => child.type === 'MD.blockquote') : []);
  const first = quotes[0];
  assert.equal(first.type, 'MD.blockquote');
  if (first.type !== 'MD.blockquote' || !Array.isArray(first.value)) throw new Error('Missing quote');
  const detail = inspectMessage([{ type: 'Markdown', value: first.value }]);
  assert.ok(detail.text.includes('日常签到'));
  assert.ok(detail.commands.includes('/签到日历 日常'));
});
