import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import publish from '../../src/response/bounty/publish/res';
import list from '../../src/response/bounty/list/res';
import accept from '../../src/response/bounty/accept/res';
import claim from '../../src/response/bounty/claim/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const entries = [
  { handler: publish, op: 'bounty.publish', command: '/悬赏 88 1000 2', args: { mode: 'publish', target: { uid: 88 }, amount: '1000', maxCompletions: '2' } },
  { handler: list, op: 'bounty.list', command: '/悬赏榜 2', args: { page: '2' } },
  { handler: accept, op: 'bounty.accept', command: '/接赏 9', args: { bountyId: '9' } },
  { handler: claim, op: 'bounty.claim', command: '/领赏 9', args: { mode: 'claim', bountyId: '9' } }
];
const cases = [
  { index: 0, reason: '不能悬赏自己', expected: '/悬赏榜', text: '悬赏编号不是玩家UID' },
  { index: 0, reason: '你的境界过低，需达到筑基期才能发布悬赏', expected: '/查看主线', text: '已三星通关的关卡' },
  { index: 0, reason: '注册不满7天，新手保护期内无法发布悬赏', expected: '/我的信息', text: '不能提前解除新手保护' },
  { index: 0, reason: '目标境界过低，无法悬赏', expected: '/悬赏榜', text: '不自动绕过保护' },
  { index: 0, reason: '目标注册不满7天，受新手保护', expected: '/悬赏榜', text: '对方保护期' },
  { index: 0, reason: '目标行踪隐匿，当前无法发起悬赏', expected: '/悬赏榜', text: '核对目标当前状态' },
  { index: 0, reason: '你已有对该目标的悬赏进行中', expected: '/悬赏榜', text: '不重复扣费发布' },
  { index: 0, reason: '最多同时发布3个悬赏', expected: '/悬赏榜', text: '当前入口没有撤销能力' },
  { index: 0, reason: '每人赏金至少 200 灵晶，当前人数(2)下最低发布 500 灵晶', expected: '/悬赏', text: '扣费后的赏金池' },
  { index: 0, reason: '灵晶不足', expected: '/我的信息', text: '核对总支出' },
  { index: 1, reason: '悬赏榜加载失败，请稍后再试', expected: '/悬赏榜', text: '不证明所有悬赏已经结束' },
  { index: 2, reason: '格式：/接赏 悬赏编号', expected: '/悬赏榜', text: '悬赏编号不是玩家UID' },
  { index: 2, reason: '你的境界过低，需达到筑基期才能接赏', expected: '/查看主线', text: '已三星通关的关卡' },
  { index: 2, reason: '你与目标的境界差距超过1级，无法接赏', expected: '/悬赏榜', text: '不自动绕过保护' },
  { index: 2, reason: '目标仍在受袭保护期内，暂时无法接赏', expected: '/悬赏榜', text: '对方保护期' },
  { index: 2, reason: '今日接赏次数已达上限(99次)', expected: '/领赏', text: '换目标或补元力不能增加当日额度' },
  { index: 2, reason: '你今日对该目标的接赏已达上限(3次)', expected: '/悬赏榜', text: '补元力不能增加对该目标的次数' },
  { index: 2, reason: '元力不足', expected: '/储物袋 道具 丹药', text: '补元力不能恢复已用次数' },
  { index: 2, reason: '已有待挑战的悬赏，请继续挑战，不可重复接取', expected: '/打劫记录', text: '不会自动续战' },
  { index: 2, reason: '你已完成过该悬赏，不可重复接取', expected: '/领赏', text: '不重复挑战或领奖' },
  { index: 2, reason: '悬赏已过期', expected: '/悬赏榜', text: '不自动重放旧操作' },
  { index: 3, reason: '没有可领取的赏金（未接赏或已领取）', expected: '/领赏', text: '未接赏、未获胜和已经领取是不同情况' },
  { index: 3, reason: '你的账号状态异常，无法领赏', expected: '/我的信息', text: '不能替代账号资格' },
  { index: 3, reason: '领赏失败，请稍后再试\n\n重复提醒', expected: '/领赏', text: '提交后缓存异常不证明没有结算' }
];
for (const entry of cases) for (const isPrivate of [false, true]) for (const mode of ['http', 'feedback']) {
  const config = entries[entry.index];
  test(`${config.op} ${entry.reason} ${mode} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => mode === 'http' ? { code: 'CONFLICT', message: entry.reason }
      : businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: entry.reason, blocks: [{ text: entry.reason, quoted: false }], buttons: [], advice: [] }]), mode === 'http' ? 409 : 200);
    const event = isPrivate ? app.events.privateMessage({ text: config.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: config.command, platform: 'qq-bot' });
    const result = await app.runHandler(config.handler, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].path.endsWith('/' + config.op));
    assert.deepEqual(requests[0].body.arguments, config.args);
    assert.ok(requests[0].idempotencyKey);
    assert.equal(view.text.split(entry.reason).length - 1, 1);
    assert.ok(view.text.includes(entry.text), view.text);
    assert.ok(view.commands.includes(entry.expected));
    assert.ok(!view.commands.some(command => /^\/(?:接赏|领赏|悬赏)\s+/.test(command)));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const entry of entries) for (const isPrivate of [false, true]) for (const mode of ['malformed', 'structured']) {
  test(`${entry.op} ${mode} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => mode === 'malformed' ? businessEnvelope(request.bid, {})
      : businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: '原业务拒绝', quote: '原引用', blocks: [{ text: '原业务拒绝', quoted: false }, { text: '原说明', quoted: true }], buttons: [{ label: '原返回', command: '/我' }], advice: [{ command: '/我的信息', description: '原服务建议' }] }]));
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    if (mode === 'structured') {
      for (const text of ['原业务拒绝', '原引用', '原说明', '原服务建议']) assert.ok(view.text.includes(text), view.text);
      assert.ok(view.commands.includes('/我'));
      assert.equal(view.text.split('原业务拒绝').length - 1, 1);
    } else if (entry.handler !== list) {
      assert.ok(view.text.includes('结果未获完整确认'));
      assert.ok(view.text.includes(entry.handler === publish ? '不自动重复扣费' : '不自动重发'));
    } else assert.ok(view.commands.includes('/悬赏榜'));
    assert.ok(!view.commands.some(command => /^\/(?:接赏|领赏|悬赏)\s+/.test(command)));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
const battle = { Rounds: 2, SideA: [{ Name: '本人', HP: 10, MaxHP: 20, Dead: false }], SideB: [{ Name: '目标', HP: 0, MaxHP: 20, Dead: true }] };
const baseBattle = { battleWon: false, battle, logId: 'bounty-log', targetName: '目标', qiCost: 15, remainingCount: 98, dailyAcceptLimit: 99, expReward: 10, streak: 0, streakBonus: 0, shaQiBonus: 0, bonusText: '', losingStreakText: '原连败说明' };
const frames = [
  { handler: list, command: '/悬赏榜', data: { page: 1, pageSize: 5, total: 0, items: [] }, text: '当前没有进行中的悬赏', expected: '/领赏' },
  { handler: list, command: '/悬赏榜 9', data: { page: 9, pageSize: 5, total: 6, items: [] }, text: '本页暂无悬赏，当前共有 6 条活跃记录', expected: '/悬赏榜' },
  { handler: claim, command: '/领赏', data: { outcome: 'list', pending: [] }, text: '暂无待领取的赏金', expected: '/悬赏榜' },
  { handler: accept, command: '/接赏 9', data: baseBattle, text: '原连败说明', expected: '/我的装备' },
  { handler: accept, command: '/接赏 9', data: { ...baseBattle, battleWon: true, qiCost: 0, remainingCount: 99, expReward: 0 }, text: '元力已退还', expected: '/悬赏榜' }
];
for (const entry of frames) for (const isPrivate of [false, true]) {
  test(`state recovery ${entry.command} ${entry.text} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, entry.data));
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.ok(view.text.includes(entry.text), view.text);
    assert.ok(view.commands.includes(entry.expected));
    if (entry.handler === accept) {
      assert.ok(!view.commands.includes('/接赏 9'));
      assert.ok(!view.commands.includes('/领赏 9'));
      if ('battleWon' in entry.data && !entry.data.battleWon) {
        assert.ok(view.text.includes('消耗元力：15'));
        assert.ok(view.text.includes('今日剩余：98/99'));
        assert.ok(view.text.includes('获得修为：+10'));
      }
    }
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const isPrivate of [false, true]) for (const kind of ['policy', 'published', 'won', 'pending', 'claimed']) {
  test(`authoritative success ${kind} private=${isPrivate}`, async t => {
    const data = kind === 'policy' ? { outcome: 'policy', policy: { maxAmount: 10000, minPerPerson: 200, minCompletions: 1, maxCompletions: 5, defaultCompletions: 1, feePercent: 20, validHours: 48 } }
      : kind === 'published' ? { outcome: 'published', data: { id: 9, totalCost: 1000, fee: 200, rewardPool: 800, rewardPerCompletion: 400, maxCompletions: 2, targetName: '目标', validHours: 48 } }
        : kind === 'won' ? { ...baseBattle, battleWon: true, completionId: 5, bountyReward: 400 }
          : kind === 'pending' ? { outcome: 'list', pending: [{ bountyId: 9, targetName: '目标', rewardAmount: 400 }] } : { outcome: 'claimed', rewardAmount: 400 };
    const handler = kind === 'policy' || kind === 'published' ? publish : kind === 'won' ? accept : claim;
    const text = kind === 'policy' ? '/悬赏' : kind === 'published' ? '/悬赏 88 1000 2' : kind === 'won' ? '/接赏 9' : kind === 'pending' ? '/领赏' : '/领赏 9';
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
    const event = isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' });
    const result = await app.runHandler(handler, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, kind === 'published' && !isPrivate ? 2 : 1);
    assert.ok(!view.text.includes('建议：'));
    if (kind === 'policy') for (const word of ['10000灵晶', '200灵晶', '20%（不退还）', '48小时']) assert.ok(view.text.includes(word));
    if (kind === 'published') for (const word of ['支付灵晶：1000', '手续费：200', '赏金池：800', '每人赏金：400']) assert.ok(view.text.includes(word));
    if (kind === 'won' || kind === 'pending') assert.ok(view.commands.includes('/领赏 9'));
    if (kind === 'won') { assert.ok(view.text.includes('赏金待领取')); assert.ok(view.text.includes('消耗元力：15')); assert.ok(!view.text.includes('获得灵晶：400')); }
    if (kind === 'claimed') assert.ok(view.text.includes('获得灵晶：400'));
    for (const message of result.messages) {
      assert.equal(message.target?.targetId, isPrivate ? event.UserId : event.ChannelId);
      assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    }
  });
}
