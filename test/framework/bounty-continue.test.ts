import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, Router, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import accept from '../../src/response/bounty/accept/res';
import resume from '../../src/response/bounty/challenge/res';
import { parseRobotBountyChallenge } from '../../src/api/bot/bounty-actions';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const reason = '已有待挑战的悬赏，请继续挑战，不可重复接取';
for (const isPrivate of [false, true]) for (const mode of ['http', 'feedback', 'structured']) {
  test(`pending acceptance offers explicit continuation ${mode} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => mode === 'http' ? { code: 'CONFLICT', message: reason }
      : businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: reason, buttons: [], advice: mode === 'structured' ? [{ command: '/我的信息', description: '原服务建议' }] : [] }]), mode === 'http' ? 409 : 200);
    const event = isPrivate ? app.events.privateMessage({ text: '/接赏 9', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/接赏 9', platform: 'qq-bot' });
    const result = await app.runHandler(accept, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].body.arguments, { bountyId: '9' });
    assert.ok(view.text.includes(reason));
    assert.ok(view.text.includes('发起一场新的战斗'));
    assert.ok(view.commands.includes('/继续接赏 9'));
    if (mode === 'structured') assert.ok(view.text.includes('原服务建议'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const isPrivate of [false, true]) for (const text of ['已有悬赏记录，请刷新后继续挑战或领取赏金', '你已完成过该悬赏，不可重复接取', '接赏失败，请稍后再试']) {
  test(`other states never invent continuation ${text} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text, buttons: [], advice: [] }]));
    const event = isPrivate ? app.events.privateMessage({ text: '/接赏 9', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/接赏 9', platform: 'qq-bot' });
    const result = await app.runHandler(accept, event);
    assert.equal(requests.length, 1);
    assert.ok(!inspectMessage(result.messages[0].nodes).commands.some(command => command.startsWith('/继续接赏 ')));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const isPrivate of [false, true]) for (const text of ['格式：/继续接赏 悬赏编号', '请先接取悬赏', '你已完成过该悬赏，不可重复挑战', '今日接赏次数已达上限(99次)', '元力不足', '目标仍在受袭保护期内，暂时无法接赏']) for (const mode of ['http', 'feedback']) {
  test(`continue refusal ${text} ${mode} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => mode === 'http' ? { code: 'CONFLICT', message: text }
      : businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text, buttons: [], advice: [] }]), mode === 'http' ? 409 : 200);
    const event = isPrivate ? app.events.privateMessage({ text: '/继续接赏 9', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/继续接赏 9', platform: 'qq-bot' });
    const result = await app.runHandler(resume, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].path.endsWith('/bounty.accept'));
    assert.deepEqual(requests[0].body.arguments, { bountyId: '9', continueBattle: true });
    assert.ok(requests[0].idempotencyKey);
    assert.ok(view.text.includes(text));
    assert.doesNotMatch(view.text, /建议：/);
    assert.ok(!view.commands.some(command => /^\/(继续接赏|接赏|领赏)\s/.test(command)));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
const frame = (won: boolean) => ({ won, experienceGained: won ? 20 : 10, rewardAmount: won ? 266 : 0, qiCost: 15, remainingCount: 98, dailyAcceptLimit: 99, logId: 'continued-log', battle: { Rounds: 3, SideA: [{ Name: '本人', HP: won ? 10 : 0, MaxHP: 20, Dead: !won }], SideB: [{ Name: '目标', HP: won ? 0 : 10, MaxHP: 20, Dead: won }] } });
for (const isPrivate of [false, true]) for (const won of [false, true]) {
  test(`continue actual settlement won=${won} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, frame(won)));
    const event = isPrivate ? app.events.privateMessage({ text: '/继续接赏 9', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/继续接赏 9', platform: 'qq-bot' });
    const result = await app.runHandler(resume, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    assert.equal(result.messages[0].target?.targetId, isPrivate ? event.UserId : event.ChannelId);
    for (const text of ['悬赏编号：#9', '回合数：3', '消耗元力：15', '今日剩余：98/99', `获得修为：+${won ? 20 : 10}`]) assert.ok(view.text.includes(text));
    assert.ok(view.commands.includes('/查看战斗过程 continued-log'));
    assert.equal(view.commands.includes('/领赏 9'), won);
    if (won) { assert.ok(view.text.includes('赏金待领取：266 灵晶')); assert.ok(!view.text.includes('获得灵晶')); }
    else { assert.ok(view.commands.includes('/我的装备')); assert.ok(view.commands.includes('/我的功法')); }
    assert.ok(!view.commands.includes('/继续接赏 9'));
    assert.ok(!view.commands.includes('/接赏 9'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const isPrivate of [false, true]) for (const mode of ['malformed', 'structured', 'http500']) {
  test(`continuation unknown and original advice ${mode} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => mode === 'http500' ? { code: 'INTERNAL', message: 'commit acknowledgement lost' }
      : mode === 'malformed' ? businessEnvelope(request.bid, {}) : businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: '原拒绝', quote: '原引用', blocks: [{ text: '原说明', quoted: true }], buttons: [{ label: '原返回', command: '/我' }], advice: [{ command: '/我的信息', description: '原建议' }] }]), mode === 'http500' ? 500 : 200);
    const event = isPrivate ? app.events.privateMessage({ text: '/继续接赏 9', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/继续接赏 9', platform: 'qq-bot' });
    const result = await app.runHandler(resume, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    if (mode === 'structured') { for (const text of ['原拒绝', '原引用', '原说明', '原建议']) assert.ok(view.text.includes(text)); assert.ok(view.commands.includes('/我')); }
    else { assert.ok(view.text.includes('续战结果未获完整确认')); assert.ok(!view.text.includes('commit acknowledgement lost')); }
    assert.ok(!view.commands.some(command => /^\/(继续接赏|接赏|领赏)\s/.test(command)));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const isPrivate of [false, true]) for (const text of ['继续接赏', '继续接赏 0009', '继续接赏 9007199254740993']) {
  test(`real router and raw IDs ${text} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, () => ({ code: 'CONFLICT', message: '原路由拒绝' }), 409);
    const router = Router.create({ events: ['message.create', 'private.message.create'] });
    router.use('继续接赏', async () => ({ default: resume }));
    await app.mount({ responseRouter: router.define });
    const event = isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' });
    const result = await app.dispatch(event);
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].body.arguments, { bountyId: text.split(' ')[1] ?? null, continueBattle: true });
    assert.ok(inspectMessage(result.messages[0].nodes).text.includes('原路由拒绝'));
    const repeated = await app.dispatch({ ...event });
    assert.equal(requests.length, 1);
    assert.equal(repeated.messages.length, 0);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
test('challenge decoder rejects incomplete and impossible cost/quota receipts', () => {
  for (const data of [{}, { ...frame(true), qiCost: -1 }, { ...frame(true), rewardAmount: -1 }, { ...frame(true), remainingCount: 100 }, { ...frame(true), dailyAcceptLimit: 0 }, { ...frame(true), battle: { Rounds: -1, SideA: [], SideB: [] } }]) assert.throws(() => parseRobotBountyChallenge(data));
});
for (const command of ['/接赏', '/接赏 0', '/接赏 9007199254740993']) for (const isPrivate of [false, true]) {
  test(`pending text cannot invent an unsafe continuation ${command} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: reason, buttons: [], advice: [] }]));
    const event = isPrivate ? app.events.privateMessage({ text: command, platform: 'qq-bot' }) : app.events.groupMessage({ text: command, platform: 'qq-bot' });
    const result = await app.runHandler(accept, event);
    assert.equal(requests.length, 1);
    assert.ok(!inspectMessage(result.messages[0].nodes).commands.some(command => command.startsWith('/继续接赏 ')));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

for (const isPrivate of [false, true]) {
  test(`won receipt with no valid reward does not invent claim eligibility private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { ...frame(true), rewardAmount: 0 }));
    const event = isPrivate ? app.events.privateMessage({ text: '/继续接赏 9', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/继续接赏 9', platform: 'qq-bot' });
    const result = await app.runHandler(resume, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.ok(view.text.includes('续战成功'));
    assert.ok(view.text.includes('未返回有效赏金金额'));
    assert.ok(view.commands.includes('/领赏'));
    assert.ok(!view.commands.includes('/领赏 9'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
