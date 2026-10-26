import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import home from '../../src/response/guild/storyline/res';
import challenge from '../../src/response/guild/storyline/challengeRes';
import claim from '../../src/response/guild/storyline/claimRes';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

const cases = [
  { handler: challenge, command: '/宗门主线挑战', reason: '今日宗门主线已全部通关', expected: '/宗门主线', text: '可领取关卡' },
  { handler: challenge, command: '/宗门主线挑战', reason: '你今日宗门主线挑战次数已达上限（9/9）', expected: '/宗门主线记录', text: '次数用尽不代表已经提交的伤害未计入' },
  { handler: challenge, command: '/宗门主线挑战', reason: '当前关卡血量异常，请稍后重试', expected: '/宗门主线记录', text: '不能靠补材料和重复挑战解除' },
  { handler: challenge, command: '/宗门主线挑战', reason: '宗门主线配置缺失：宗门等级2，关卡1', expected: '/宗门主线记录', text: '不重新发起同一结算' },
  { handler: claim, command: '/领取宗门主线奖励 2', reason: '当前宗门尚未解锁第2关奖励', expected: '/宗门主线', text: '先按实际进度安排' },
  { handler: claim, command: '/领取宗门主线奖励 2', reason: '奖励已领取', expected: '/宗门主线', text: '已领取不能重复到账' },
  { handler: claim, command: '/领取宗门主线奖励', reason: '当前没有可领取的宗门主线奖励', expected: '/宗门主线', text: '已解锁、已领取与可领取关卡' }
];
for (const entry of cases) for (const isPrivate of [false, true]) for (const mode of ['http', 'feedback']) {
  test(`${entry.command} ${isPrivate} ${mode} ${entry.reason}`, async t => {
    const { app, requests } = await gameFixture(t, request => mode === 'http'
      ? { code: 'CONFLICT', message: entry.reason }
      : businessEnvelope(request.bid, undefined, [{ title: '宗门主线', heading: '', text: entry.reason, buttons: [], advice: [] }]),
    mode === 'http' ? 409 : 200);
    const event = isPrivate
      ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' })
      : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(entry.reason));
    assert.ok(view.text.includes(entry.text));
    assert.ok(view.commands.includes(entry.expected));
    assert.ok(!view.commands.some(command => /^\/(?:宗门主线挑战|领取宗门主线奖励)(?:\s|$)/.test(command)));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

for (const damage of [0, 30, 100]) for (const isPrivate of [false, true]) {
  test(`挑战结算原伤害不被培养建议替代 damage=${damage} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, {
      stageIndex: 1, reward: { damageDealt: damage, bossHpBefore: 100, bossHpAfter: 100 - damage, stageCleared: damage === 100 }
    }));
    const event = isPrivate
      ? app.events.privateMessage({ text: '/宗门主线挑战', platform: 'qq-bot' })
      : app.events.groupMessage({ text: '/宗门主线挑战', platform: 'qq-bot' });
    const result = await app.runHandler(challenge, event);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(`本次伤害：${damage}`));
    assert.ok(view.text.includes(`血量变化：100 -> ${100 - damage}`));
    if(damage===0)assert.ok(view.text.includes('本次未造成有效伤害'));
    if(damage===30)assert.ok(view.text.includes('本次伤害已计入当前关卡'));
    if(damage===100)assert.ok(view.text.includes('本关已攻破'));
    assert.ok(view.commands.includes('/宗门主线记录'));
    assert.ok(!view.commands.includes('/宗门主线挑战'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

const partial = { stageIndex: 1, spiritCrystal: 17, partial: true, claimedStages: [1], failedStage: 2, failureReason: '主线奖励配置不存在' };
for (const isPrivate of [false, true]) {
  test(`一键主线领奖部分到账保留金额和中断关卡 private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, partial));
    const event = isPrivate
      ? app.events.privateMessage({ text: '/领取宗门主线奖励', platform: 'qq-bot' })
      : app.events.groupMessage({ text: '/领取宗门主线奖励', platform: 'qq-bot' });
    const result = await app.runHandler(claim, event);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes('已领取第1关奖励，获得灵晶17'));
    assert.ok(view.text.includes('第2关领取中断：主线奖励配置不存在'));
    assert.ok(view.text.includes('后续中断不代表整批回滚'));
    assert.deepEqual(view.commands.filter(command => command.includes('宗门主线')), ['/宗门主线']);
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

for (const patch of [{ claimedStages: [] }, { claimedStages: [1, 1] }, { failedStage: 1 }, { failureReason: '' }]) {
  test(`部分领奖契约损坏不显示虚假到账：${JSON.stringify(patch)}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { ...partial, ...patch }));
    const result = await app.runHandler(claim, app.events.privateMessage({ text: '/领取宗门主线奖励', platform: 'qq-bot' }));
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes('响应不完整'));
    assert.ok(!view.text.includes('获得灵晶17'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

for (const isPrivate of [false, true]) for (const dailyAdded of [0, 15]) {
  test(`主线跨关与真实收益展示 private=${isPrivate} daily=${dailyAdded}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, {
      stageIndex: 1,
      reward: {
        damageDealt: 100, bossHpBefore: 100, bossHpAfter: 8500, stageCleared: true, allCleared: false,
        guildDailyActivityAdded: dailyAdded, guildDailyActivityCurrent: 45,
        guildContributionAdded: 50, guildContributionCurrent: 150,
        personalAttemptsUsed: 2, personalAttemptsLimit: 9,
        eliteDrop: { rewardName: '明悟丹', quantity: 3 }
      }
    }));
    const result = await app.runHandler(challenge, isPrivate
      ? app.events.privateMessage({ text: '/宗门主线挑战', platform: 'qq-bot' })
      : app.events.groupMessage({ text: '/宗门主线挑战', platform: 'qq-bot' }));
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes('血量变化：100 -> 0'));
    assert.ok(!view.text.includes('8500'));
    assert.ok(view.text.includes(`宗门日活：+${dailyAdded}（当前45）`));
    assert.ok(view.text.includes('精英掉落：明悟丹 ×3（已到账）'));
    assert.ok(view.text.includes('剩余7次'));
    assert.ok(view.text.includes('宗门贡献：+50（当前150）'));
    assert.ok(view.commands.includes('/宗门日常'));
    assert.ok(view.commands.includes('/宗门主线'));
    assert.ok(view.commands.includes('/宗门主线记录'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

test('精英掉落损坏不能显示虚假到账', async t => {
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, {
    stageIndex: 4, reward: { damageDealt: 100, bossHpBefore: 100, bossHpAfter: 0, stageCleared: true,
      eliteDrop: { rewardName: '明悟丹', quantity: -1 } }
  }));
  const result = await app.runHandler(challenge, app.events.privateMessage({ text: '/宗门主线挑战', platform: 'qq-bot' }));
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  const view = inspectMessage(message.nodes);
  assert.ok(view.text.includes('掉落不完整'));
  assert.ok(!view.text.includes('已到账'));
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
});

for (const isPrivate of [false, true]) for (const state of ['open', 'cleared', 'exhausted']) {
  test(`主线首页明确参与点与一次性奖励 private=${isPrivate} state=${state}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, {
      guildId: 1, progress: {}, stage: {}, personalAttemptsUsed: 2, claimableStages: [1],
      home: {
        participationRewardContribution: 50, allCleared: state === 'cleared', guildName: '青云', guildLevel: 1, stageIndex: 2, stageName: '守阵', isElite: false,
        bossRemainingHp: 8000, bossMaxHp: 8500, totalDamage: 500,
        retryBuffUsesLeft: 0, retryBuffDamageRate: 0, retryBuffText: '残势追击：当前无',
        personalAttemptsUsed: 2, personalAttemptsLimit: 9, personalDamage: 700,
        personalParticipation: 2, personalEffectiveChallenges: 2,
        claimableStagesText: '1', hasClaimableStages: true, canChallenge: state === 'open'
      }
    }));
    const result = await app.runHandler(home, isPrivate
      ? app.events.privateMessage({ text: '/宗门主线', platform: 'qq-bot' })
      : app.events.groupMessage({ text: '/宗门主线', platform: 'qq-bot' }));
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    for (const text of ['本关累计推进 500', '今日个人伤害：700', '参与点：2（不可兑换）', '每人每关仅可领取一次', '每日首次有效挑战：贡献＋50', '日活已满仍可获得', '换宗门不重复领取']) {
      assert.ok(view.text.includes(text), text);
    }
    assert.equal(view.commands.includes('/宗门主线挑战'), state === 'open');
    assert.ok(view.commands.includes('/宗门日常'));
    if (state === 'cleared') assert.ok(view.text.includes('今日已全通，无法继续挑战'));
    if (state === 'exhausted') assert.ok(view.text.includes('今日挑战次数已用尽'));
    assert.ok(view.commands.includes('/领取宗门主线奖励 1'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
