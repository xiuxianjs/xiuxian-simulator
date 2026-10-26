import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { createResult, ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import like from '../../src/response/leaderboard/popularity/like/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const cases = [
  { reason: '不能给自己点赞', text: '使用当前榜单里其他道友的点赞按钮', expected: '/排行榜' },
  { reason: '未找到被点赞的玩家', text: '核对UID或提及对象', expected: '/排行榜' },
  { reason: '不支持的人气榜类型', text: '人气榜用于查看收到的点赞', expected: '/排行榜' },
  { reason: '点赞参数错误', text: '不猜测玩家编号或自动点赞', expected: '/排行榜' },
  { reason: '今日点赞次数已用完（5/5）', text: '换人或换榜不能绕过今日上限', expected: '/排行榜' },
  { reason: '今日已经在战力排行榜给该玩家点过赞了', text: '同一玩家同一榜单当日只能点赞一次', expected: '/排行榜' },
  { reason: '人气点赞失败，请稍后再试\n\n重复提醒', text: '不证明点赞或奖励未提交', expected: '/我的信息' }
];
for (const entry of cases) for (const isPrivate of [false, true]) for (const mode of ['http', 'feedback']) {
  test(`${entry.reason} ${mode} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => mode === 'http' ? { code: 'CONFLICT', message: entry.reason }
      : businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: entry.reason, blocks: [{ text: entry.reason, quoted: false }], buttons: [], advice: [] }]), mode === 'http' ? 409 : 200);
    const command = '/点赞人气 88 battle';
    const event = isPrivate ? app.events.privateMessage({ text: command, platform: 'qq-bot' }) : app.events.groupMessage({ text: command, platform: 'qq-bot' });
    const result = await app.runHandler(like, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].body.arguments, { target: { uid: 88 }, boardType: 'battle' });
    assert.ok(requests[0].path.endsWith('/popularity.like'));
    assert.ok(requests[0].idempotencyKey);
    assert.equal(view.text.split(entry.reason).length - 1, 1);
    assert.ok(view.text.includes(entry.text), view.text);
    assert.ok(view.commands.includes(entry.expected));
    assert.ok(!view.commands.some(command => command.startsWith('/点赞人气')));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const text of ['/点赞人气', '/点赞人气 88', '/点赞人气 88 battle extra', '/点赞人气 88 battle1', '无关前缀点赞人气 88 battle', '/点赞人气 88 人气']) for (const isPrivate of [false, true]) {
  test(`malformed input has no write ${text} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, () => { throw new Error('unexpected write'); });
    const event = isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' });
    const result = await app.runHandler(like, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 0);
    assert.ok(view.text.includes('请从榜单选择要点赞的道友'));
    assert.ok(view.commands.includes('/排行榜'));
    assert.ok(!view.commands.some(command => command.startsWith('/点赞人气')));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const target of ['0', 'abc', '9007199254740992']) for (const isPrivate of [false, true]) {
  test(`ignored unresolved ${target} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { outcome: 'ignored' }));
    app.actions.on('mention.get', () => [createResult(ResultCode.Ok, 'No mentions', [])]);
    const text = `/点赞人气 ${target} battle`;
    const event = isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' });
    const result = await app.runHandler(like, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].body.arguments, { target: null, boardType: 'battle' });
    assert.ok(view.text.includes('未能定位可点赞的道友'));
    assert.ok(view.commands.includes('/排行榜'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const [boardType, boardLabel] of [['battle', '战力排行榜'], ['realm', '境界排行榜'], ['storyline', '主线排行榜'], ['demonTower', '妖塔排行榜'], ['regionBattle', '区战力排行榜'], ['regionRealm', '区境界排行榜'], ['alchemy', '丹师排行榜']]) for (const remainingLikes of [0, 4]) for (const isPrivate of [false, true]) {
  test(`successful ${boardType} remaining=${remainingLikes} private=${isPrivate}`, async t => {
    const data = { outcome: 'liked', message: '点赞成功，对方人气 +1，你获得 10 灵晶', boardType, boardLabel, remainingLikes, currentPopularity: 23 };
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
    const text = `/点赞人气 88 ${boardType}`;
    const event = isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' });
    const result = await app.runHandler(like, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].body.arguments, { target: { uid: 88 }, boardType });
    assert.ok(requests[0].idempotencyKey);
    for (const original of [data.message, '当前人气：23', `今日剩余点赞：${remainingLikes}次`]) assert.ok(view.text.includes(original));
    assert.ok(view.text.includes(remainingLikes ? '同一玩家同一榜单当日不能重复点赞' : '今日点赞额度已用完'));
    assert.ok(view.commands.includes('/' + boardLabel));
    assert.ok(view.commands.includes('/人气排行榜'));
    assert.ok(view.commands.includes('/排行榜'));
    assert.ok(!view.commands.some(command => command.startsWith('/点赞人气')));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const mode of ['malformed', 'http500', 'structured']) for (const isPrivate of [false, true]) {
  test(`unknown and original feedback ${mode} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => mode === 'http500' ? { code: 'INTERNAL', message: 'commit acknowledgement lost' }
      : mode === 'malformed' ? businessEnvelope(request.bid, {})
        : businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: '原拒绝', quote: '原引用', blocks: [{ text: '原说明', quoted: true }], buttons: [{ label: '原返回', command: '/我' }], advice: [{ command: '/我的信息', description: '原服务建议' }] }]), mode === 'http500' ? 500 : 200);
    const text = '/点赞人气 88 battle';
    const event = isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' });
    const result = await app.runHandler(like, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    if (mode === 'structured') {
      for (const text of ['原拒绝', '原引用', '原说明', '原服务建议']) assert.ok(view.text.includes(text), view.text);
      assert.ok(view.commands.includes('/我'));
    } else {
      assert.ok(view.text.includes('不证明点赞或奖励未提交'));
      if (mode === 'malformed') assert.ok(view.text.includes('点赞结果未获完整确认，请先核对当前状态。'));
      assert.ok(view.text.includes('榜单缓存可能延迟'));
      assert.ok(view.commands.includes('/我的信息'));
      assert.ok(!view.text.includes('commit acknowledgement lost'));
    }
    assert.ok(!view.commands.some(command => command.startsWith('/点赞人气')));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const arg of ['88', '0', 'abc', '9007199254740992']) for (const isPrivate of [false, true]) {
  test(`argument first with mention fallback ${arg} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { outcome: 'ignored' }));
    app.actions.on('mention.get', () => [createResult(ResultCode.Ok, 'Target mention', [{ UserId: 'target-bid', IsBot: false }])]);
    const text = `/点赞人气 ${arg} battle`;
    const event = isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' });
    const result = await app.runHandler(like, event);
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].body.arguments, { target: arg === '88' ? { uid: 88 } : { bid: 'target-bid' }, boardType: 'battle' });
    assert.ok(inspectMessage(result.messages[0].nodes).text.includes('未能定位可点赞的道友'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const prefix of ['!', '！', '#', '＃', '']) for (const isPrivate of [false, true]) {
  test(`valid original prefix ${prefix} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { outcome: 'liked', message: '原点赞成功', remainingLikes: 3, currentPopularity: 11, boardType: 'battle', boardLabel: '战力排行榜' }));
    const text = `${prefix}点赞人气 00088 battle`;
    const event = isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' });
    const result = await app.runHandler(like, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].body.arguments, { target: { uid: 88 }, boardType: 'battle' });
    assert.ok(view.text.includes('原点赞成功'));
    assert.ok(view.text.includes('当前人气：11'));
    assert.ok(!view.commands.some(command => /点赞人气/.test(command)));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
