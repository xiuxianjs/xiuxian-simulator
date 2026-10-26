import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { createResult, ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import apply from '../../src/response/master/graduateApply/res';
import accept from '../../src/response/master/graduateAccept/res';
import reject from '../../src/response/master/graduateReject/res';
import title from '../../src/response/master/claimTitle/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

const cases = [
  { handler: apply, command: "/申请出师", reason: "境界未达到出师要求", expected: "/查看主线", text: "挑战主线或在满足条件时扫荡已三星关卡" },
  { handler: apply, command: "/申请出师", reason: "尚未满足出师条件", expected: "/我的师门", text: "关系天数、活跃天数、累计互动和冲丹完成标记" },
  { handler: apply, command: "/申请出师", reason: "出师申请已存在\n\n重复提醒", expected: "/我的师门", text: "不能审核自己发出的申请" },
  { handler: apply, command: "/申请出师", reason: "师徒关系不存在", expected: "/我的师门", text: "当前师父、徒弟及历史关系" },
  { handler: accept, command: "/同意出师 4", reason: "境界未达到出师要求", expected: "/我的师门", text: "师父提升自己不能替徒弟达标" },
  { handler: accept, command: "/同意出师 4", reason: "尚未满足出师条件", expected: "/我的师门", text: "逐项核对关系天数" },
  { handler: accept, command: "/同意出师 4", reason: "没有来自该修士的出师申请", expected: "/同意出师", text: "徒弟UID" },
  { handler: accept, command: "/同意出师 4", reason: "拜师申请不存在", expected: "/同意出师", text: "本人收到的当前出师申请" },
  { handler: accept, command: "/同意出师 abc", reason: "使用方法：同意出师 <徒弟UID>", expected: "/同意出师", text: "申请记录ID不能代替UID" },
  { handler: reject, command: "/拒绝出师 4", reason: "没有来自该修士的出师申请", expected: "/拒绝出师", text: "旧申请不可用不代表本次审批成功" },
  { handler: reject, command: "/拒绝出师 4", reason: "拜师申请不存在", expected: "/拒绝出师", text: "本人收到的当前出师申请" },
  { handler: reject, command: "/拒绝出师 abc", reason: "使用方法：拒绝出师 <徒弟UID>", expected: "/拒绝出师", text: "列表序号和申请记录ID" },
  { handler: accept, command: "/同意出师 4", reason: "师徒关系不存在", expected: "/我的师门", text: "关系失效不代表本次已经成功收徒或解除" },
  { handler: title, command: "/领取师门称号", reason: "累计出师达到10名弟子后，方可领取「桃李满天下」称号。", expected: "/我的师门", text: "当前收徒人数、徒弟境界或师德排名不能代替累计出师条件" },
  { handler: title, command: "/领取师门称号", reason: "你已持有「桃李满天下」称号。", expected: "/我的称号", text: "领取本身不会自动佩戴" },
  { handler: title, command: "/领取师门称号", reason: "领取失败，请稍后再试。", expected: "/我的称号", text: "先核对现有称号并保留原回执" },
  { handler: title, command: "/领取师门称号", reason: "操作繁忙，请稍后再试。", expected: "/我的称号", text: "不自动更换请求重复领取" }
];
for (const entry of cases) for (const isPrivate of [false, true]) for (const mode of ['http', 'feedback']) {
  test(`${entry.command} private=${isPrivate} ${mode} ${entry.reason}`, async t => {
    const { app, requests } = await gameFixture(t, request => mode === 'http'
      ? { code: 'CONFLICT', message: entry.reason }
      : businessEnvelope(request.bid, undefined, [{ title: '师门', heading: '', text: entry.reason, buttons: [], advice: [] }]),
    mode === 'http' ? 409 : 200);
    app.actions.on('mention.get', () => [createResult(ResultCode.Ok, 'No mentions', [])]);
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
    if (entry.handler === accept && entry.reason.includes('境界未达到')) assert.ok(!view.text.includes('推进主线修行'));
    if (entry.handler === accept || entry.handler === reject) assert.ok(!view.commands.includes('/同意拜师'));
    if (entry.reason.includes('重复提醒')) assert.equal(view.text.split('重复提醒').length - 1, 1);
    assert.ok(!view.commands.some(command => /^\/(?:拜师|同意拜师|逐出师门|叛离师门|解除道侣)\s/.test(command)));
    assert.equal(message.target?.targetId, isPrivate ? event.UserId : event.ChannelId);
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}




for (const entry of [{ handler: accept, command: '/同意出师' }, { handler: reject, command: '/拒绝出师' }]) for (const isPrivate of [false, true]) {
  test(`出师收件箱空列表保持角色 ${entry.command} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, value => businessEnvelope(value.bid, { outcome: 'list', received: [] }));
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].body.arguments, { discipleArg: '' });
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes('暂无待处理的出师申请'));
    assert.ok(view.commands.includes('/我的师门'));
    assert.ok(!view.commands.some(command => /^\/(?:同意出师|拒绝出师)\s/.test(command)));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const entry of [
  { handler: apply, command: '/申请出师', data: { message: '已提交出师申请，等待师父确认' }, text: '等待师父在其出师申请列表处理' },
  { handler: accept, command: '/同意出师 4', data: { outcome: 'decided', message: '已确认出师' }, text: '核对当前出师关系与培养统计' },
  { handler: reject, command: '/拒绝出师 4', data: { outcome: 'decided', message: '已拒绝出师申请' }, text: '师徒关系不会因此结束' }
]) for (const isPrivate of [false, true]) {
  test(`出师实际回执附查询而不重放 ${entry.command} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, value => businessEnvelope(value.bid, entry.data));
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].idempotencyKey);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(entry.data.message));
    assert.ok(view.text.includes(entry.text));
    assert.ok(view.commands.includes('/我的师门'));
    assert.ok(!view.commands.some(command => /^\/(?:同意出师|拒绝出师)\s/.test(command)));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const isPrivate of [false, true]) {
  test(`称号原建议与按钮均被自定义渲染保留 private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, value => businessEnvelope(value.bid, undefined, [{
      title: '称号', heading: '', text: '请核对称号进度', buttons: [{ label: '查看师谱', command: '/师谱' }],
      advice: [{ command: '/我的师门', description: '服务端给出的称号进度建议' }]
    }]));
    const event = isPrivate ? app.events.privateMessage({ text: '/领取师门称号', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/领取师门称号', platform: 'qq-bot' });
    const result = await app.runHandler(title, event);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.equal(view.text.split('服务端给出的称号进度建议').length - 1, 1);
    for (const command of ['/师谱', '/我的师门', '/我的称号']) assert.ok(view.commands.includes(command));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
  test(`称号配置缺失不引导培养或购买 private=${isPrivate}`, async t => {
    const text = '称号尚未配置，请联系管理员。';
    const { app, requests } = await gameFixture(t, value => businessEnvelope(value.bid, undefined, [{ title: '', heading: '', text, buttons: [], advice: [] }]));
    const event = isPrivate ? app.events.privateMessage({ text: '/领取师门称号', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/领取师门称号', platform: 'qq-bot' });
    const result = await app.runHandler(title, event);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(text));
    assert.ok(!view.text.includes('累计出师统计'));
    assert.ok(!view.commands.includes('/商店 万宝楼'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
