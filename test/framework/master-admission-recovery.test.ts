import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { createResult, ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import apply from '../../src/response/master/apply/res';
import accept from '../../src/response/master/accept/res';
import expel from '../../src/response/master/expel/res';
import rebel from '../../src/response/master/rebel/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

const cases = [
  { handler: apply, command: "/拜师 2", reason: "不能拜自己为师", expected: "/圣人榜", text: "真实UID" },
  { handler: apply, command: "/拜师 2", reason: "炼气二层及以上方可拜师", expected: "/查看主线", text: "挑战主线获取修为" },
  { handler: apply, command: "/拜师 2", reason: "仅炼气二层到金丹圆满可拜师", expected: "/我的师门", text: "超过拜师开放范围" },
  { handler: apply, command: "/拜师 2", reason: "筑基初期及以上方可收徒", expected: "/我的信息", text: "目标师父须达到收徒条件" },
  { handler: apply, command: "/拜师 2", reason: "仅可收境界低于自己的徒弟", expected: "/圣人榜", text: "提升申请人自己的境界不能代替师父达标" },
  { handler: accept, command: "/同意拜师 2", reason: "仅可收境界低于自己的徒弟", expected: "/我的师门", text: "师父必须高于徒弟" },
  { handler: apply, command: "/拜师 2", reason: "道侣双方不可建立师徒关系", expected: "/我的道侣", text: "不自动解除道侣" },
  { handler: apply, command: "/拜师 2", reason: "你已出师，不可再次拜师", expected: "/我的师门", text: "不能重新获得拜师资格" },
  { handler: apply, command: "/拜师 2", reason: "你与对方已有师承关系，无需重复拜师", expected: "/我的师门", text: "已有关系不重复建立" },
  { handler: apply, command: "/拜师 2", reason: "你刚叛离师门，需再等待4天后方可再拜师", expected: "/我的师门", text: "按服务端给出的剩余天数等待" },
  { handler: apply, command: "/拜师 2", reason: "你刚被逐出师门，需再等待2天后方可再拜师", expected: "/我的师门", text: "更换申请对象或重复提交不会跳过等待期" },
  { handler: apply, command: "/拜师 2", reason: "你当前已有师父", expected: "/我的师门", text: "当前师父、徒弟及历史关系" },
  { handler: apply, command: "/拜师 2", reason: "对方当前可培养徒弟上限为2位", expected: "/圣人榜", text: "提升申请人自己的师德不能增加对方名额" },
  { handler: apply, command: "/拜师 2", reason: "你已向对方发起过拜师申请\n\n重复提醒", expected: "/我的师门", text: "只显示收到的申请" },
  { handler: accept, command: "/同意拜师 2", reason: "没有来自该修士的拜师申请", expected: "/同意拜师", text: "申请人的UID" },
  { handler: accept, command: "/同意拜师 2", reason: "拜师申请不存在", expected: "/同意拜师", text: "申请记录ID不能代替徒弟UID" },
  { handler: accept, command: "/同意拜师 abc", reason: "使用方法：同意拜师 <徒弟UID>", expected: "/同意拜师", text: "当前收到的申请" },
  { handler: accept, command: "/同意拜师 2", reason: "师徒关系已存在", expected: "/我的师门", text: "关系失效不代表本次已经成功收徒" },
  { handler: accept, command: "/同意拜师 2", reason: "收徒名额已满", expected: "/我的师门", text: "不把逐出徒弟当作默认恢复步骤" },
  { handler: expel, command: "/逐出师门 2", reason: "师徒关系不存在", expected: "/我的师门", text: "当前师父、徒弟及历史关系" },
  { handler: rebel, command: "/叛离师门", reason: "叛离师门需要扣除100修为，你当前仅有50修为，暂时无法叛离", expected: "/我的信息", text: "不能把旧金额当作固定报价" },
  { handler: apply, command: "/拜师 青云", reason: "使用方法：拜师 <师父UID|@目标>", expected: "/圣人榜", text: "不能仅凭道号提交" }
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
    if (entry.command.startsWith('/拜师') && /筑基初期|仅可收/.test(entry.reason)) assert.ok(!view.text.includes('挑战主线获取修为'));
    if (/你已出师|仅炼气二层到/.test(entry.reason)) assert.ok(!view.text.includes('核对当前修为和所需材料'));
    if (entry.reason.includes('重复提醒')) assert.equal(view.text.split('重复提醒').length - 1, 1);
    assert.ok(!view.commands.some(command => /^\/(?:拜师|同意拜师|逐出师门|叛离师门|解除道侣)\s/.test(command)));
    assert.equal(message.target?.targetId, isPrivate ? event.UserId : event.ChannelId);
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}



for (const isPrivate of [false, true]) {
  test(`拜师成功不将本人收件箱当作已发送申请 private=${isPrivate}`, async t => {
    const text = '已向师父发起拜师申请，等待对方同意';
    const { app, requests } = await gameFixture(t, value => businessEnvelope(value.bid, { outcome: 'result', targetUid: 2, message: text }));
    app.actions.on('mention.get', () => [createResult(ResultCode.Ok, 'No mentions', [])]);
    const event = isPrivate ? app.events.privateMessage({ text: '/拜师 2', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/拜师 2', platform: 'qq-bot' });
    const result = await app.runHandler(apply, event);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].idempotencyKey);
    assert.deepEqual(requests[0].body.arguments, { targetArg: '2' });
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(text));
    assert.ok(view.commands.includes('/我的师门'));
    assert.ok(!view.commands.includes('/同意拜师'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
  test(`拜师气泡保留服务端原建议和按钮 private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, value => businessEnvelope(value.bid, undefined, [{
      title: '师门', heading: '', text: '拜师状态需要核对',
      buttons: [{ label: '查看现有师门', command: '/我的师门' }],
      advice: [{ command: '/我的信息', description: '服务端提供的境界核对建议' }]
    }]));
    app.actions.on('mention.get', () => [createResult(ResultCode.Ok, 'No mentions', [])]);
    const event = isPrivate ? app.events.privateMessage({ text: '/拜师 2', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/拜师 2', platform: 'qq-bot' });
    const result = await app.runHandler(apply, event);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.equal(view.text.split('服务端提供的境界核对建议').length - 1, 1);
    for (const command of ['/我的师门', '/我的信息']) assert.ok(view.commands.includes(command));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
  test(`没有拜师申请时给出当前师门入口 private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, value => businessEnvelope(value.bid, { outcome: 'list', received: [] }));
    const event = isPrivate ? app.events.privateMessage({ text: '/同意拜师', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/同意拜师', platform: 'qq-bot' });
    const result = await app.runHandler(accept, event);
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].body.arguments, { discipleArg: '' });
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes('暂无待处理的拜师申请'));
    assert.ok(view.commands.includes('/我的师门'));
    assert.ok(!view.commands.some(command => /^\/同意拜师\s/.test(command)));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const entry of [{ handler: apply, command: '/拜师', text: '师父UID' }, { handler: expel, command: '/逐出师门', text: '徒弟UID' }]) for (const isPrivate of [false, true]) {
  test(`缺参给出符合真实接口的目标入口 ${entry.command} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, value => businessEnvelope(value.bid, { outcome: 'usage' }));
    app.actions.on('mention.get', () => [createResult(ResultCode.Ok, 'No mentions', [])]);
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(entry.text));
    assert.ok(view.commands.includes(entry.handler === apply ? '/圣人榜' : '/我的师门'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
