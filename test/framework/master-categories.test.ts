import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import info from '../../src/response/master/info/res';
import router from '../../src/router';
import type { MasterInfoQueryData, MasterInfoRelation } from '../../src/api/schemas/master-info-query';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

const relation = (): MasterInfoRelation => ({
  startedAt: '2026-10-01', interactionCount: 10, activeDays: 4,
  graduationProgress: { relationDays: 21, requiredRelationDays: 5, activeDays: 4, requiredActiveDays: 5, interactionCount: 10, requiredInteractionCount: 15,
    reachedGoldenCore: false, breakthroughRewarded: false, canGraduate: false, statusText: '培养中' },
  masterSupportProgress: { interactionCount: 8, activeDays: 3, lastInteractionDate: '2026-10-21', inactiveDays: 1, thresholdDays: 7, canLeaveWithoutPenalty: false },
  discipleResponseProgress: { interactionCount: 2, activeDays: 1, lastInteractionDate: '2026-10-20', inactiveDays: 2, thresholdDays: 7, canLeaveWithoutPenalty: false },
  dailyProgress: { teachCount: 0, teachLimit: 3, blessCount: 1, blessLimit: 2, giftCount: 0, giftLimit: 1, hasAnyActionToday: true, rewardClosed: false }
});
const data = (): MasterInfoQueryData => {
  const disciples = Array.from({ length: 6 }, (_, i) => ({ ...relation(), discipleUserId: 101 + i, discipleName: `徒弟${i + 1}`, discipleRealm: '筑基', displayDiscipleName: `徒弟${i + 1}`, displayDiscipleRealm: '筑基' }));
  disciples[1].dailyProgress = { ...disciples[1].dailyProgress, teachCount: 3, blessCount: 2, giftCount: 1 };
  disciples[2].graduationProgress = { ...disciples[2].graduationProgress, canGraduate: true, statusText: '可申请出师' };
  disciples[3].graduationProgress = { ...disciples[3].graduationProgress, canGraduate: true, statusText: '可申请出师' };
  disciples[3].dailyProgress.rewardClosed = true;
  disciples[4].discipleResponseProgress.canLeaveWithoutPenalty = true;
  const history = Array.from({ length: 6 }, (_, i) => ({ targetName: `旧徒${i + 1}`, targetRealm: '金丹', displayTargetName: `旧徒${i + 1}`, displayTargetRealm: '金丹',
    status: 2, statusText: '已出师', startedAt: '2025-01-01', finishedAt: '2025-02-01', displayFinishedAt: '2025-02-01' }));
  return { access: { allowed: true, realmName: '元婴' }, discipleSide: { ...relation(), masterName: '云师', masterRealm: '化神', displayMasterName: '云师', displayMasterRealm: '化神',
    blessing: { percent: 5, expireAt: '2026-10-23T00:00:00+08:00', expireAtText: '2026-10-23 00:00' } }, discipleHistory: [],
    masterSide: { stats: { masterVirtueExp: 18, masterVirtueLevel: 1, activeDiscipleCount: 6, totalGraduatedCount: 6, totalAcceptedDiscipleCount: 12, discipleCap: 8 },
      virtueTitle: '初为人师', virtueProgress: { progressExp: 18, progressRequired: 20 }, disciples, history,
      titleReward: { titleName: '桃李', displayTitleName: '桃李', requiredGraduatedCount: 5, owned: false, canClaim: true } }
  };
};
const inspect = (result: Awaited<ReturnType<Awaited<ReturnType<typeof gameFixture>>['app']['runHandler']>>) => {
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  return inspectMessage(message.nodes);
};

for (const privateChat of [false, true]) {
  test(`师门默认只显示总览，日常、管理和旧履历不再混入（${privateChat ? '私聊' : '群聊'}）`, async t => {
    const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, data()));
    const event = privateChat ? app.events.privateMessage({ text: '/我的师门', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/我的师门', platform: 'qq-bot' });
    const view = inspect(await app.runHandler(info, event));
    assert.match(view.text, /师父 · 云师/);
    assert.deepEqual(view.text.match(/‹▸[^›]+›/g), ['‹▸总览›']);
    assert.match(view.text, /门下 6\/8/);
    assert.doesNotMatch(view.text, /徒弟1|旧徒1|师父扶持：|今日赐丹|建立|消耗元力丹/);
    for (const tab of ['日常', '师父', '徒弟', '履历', '管理']) assert.ok(view.commands.includes(`/我的师门 ${tab}`));
    assert.ok(view.commands.includes('/我的师门'));
    assert.ok(!view.commands.some(c => /^\/(传功|赐福|赐丹|逐出师门|叛离师门|同意出师|一键传功)/.test(c)));
    assert.equal(requests.length, 1); assert.deepEqual(requests[0].body.arguments, {});
  });
}

test('徒弟与日常分页各五人，动作与真实目标、丹药消耗同块，关闭收益者不显示培养动作', async t => {
  const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, data()));
  const run = async (text: string) => inspect(await app.runHandler(info, app.events.privateMessage({ text, platform: 'qq-bot' })));
  const list = await run('/我的师门 徒弟');
  assert.deepEqual(list.text.match(/‹▸[^›]+›/g), ['‹▸徒弟›']);
  assert.match(list.text, /徒弟5/); assert.doesNotMatch(list.text, /徒弟6/);
  assert.ok(list.commands.includes('/我的师门 徒弟 2'));
  assert.ok(list.commands.includes('/我的师门 徒弟详情 101'));
  const last = await run('/我的师门 徒弟 2');
  assert.match(last.text, /徒弟6/); assert.doesNotMatch(last.text, /徒弟5/);
  assert.ok(last.commands.includes('/我的师门 徒弟 1'));
  const daily = await app.runHandler(info, app.events.privateMessage({ text: '/我的师门 日常', platform: 'qq-bot' }));
  const view = inspect(daily);
  assert.ok(view.commands.includes('/我的师门 日常 2'));
  for (const command of ['/传功 101', '/赐福 101', '/赐丹 101 培元丹', '/赐丹 101 筑基丹', '/一键传功', '/一键赐福', '/一键赐丹']) assert.ok(view.commands.includes(command), command);
  assert.ok(view.commands.includes('/传功 103'), 'canGraduate does not itself close pre-Yuanying training');
  for (const uid of [102, 104]) assert.ok(!view.commands.some(c => new RegExp(`^/(传功|赐福|赐丹) ${uid}( |$)`).test(c)));
  assert.ok(!view.commands.some(c => /^\/(逐出师门|同意出师|叛离师门)/.test(c)));
  const quotes = daily.messages[0].nodes.flatMap(n => n.type === 'Markdown' ? n.value.filter(c => c.type === 'MD.blockquote') : []);
  const first = quotes.find(q => JSON.stringify(q).includes('/传功 101'));
  assert.ok(first);
  assert.match(JSON.stringify(first), /消耗元力丹×1/);
  assert.match(JSON.stringify(first), /消耗培元丹×2／筑基丹×1/);
  const detail = await run('/我的师门 徒弟详情 106');
  assert.match(detail.text, /师父扶持：/); assert.match(detail.text, /徒弟回应：/);
  assert.ok(detail.commands.includes('/我的师门 徒弟 2'));
  assert.ok(detail.commands.includes('/我的师门 日常 2'));
  const invalid = await run('/我的师门 徒弟详情 999');
  assert.match(invalid.text, /当前徒弟中没有这位道友/);
  assert.doesNotMatch(invalid.text, /徒弟6|师父扶持：/);
  assert.equal(requests.length, 5);
});

test('管理独立承载出师、清退和称号，履历分页可追溯而无培养动作', async t => {
  const value = data(); value.discipleSide!.masterSupportProgress.canLeaveWithoutPenalty = true;
  const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, value));
  const run = async (text: string) => inspect(await app.runHandler(info, app.events.privateMessage({ text, platform: 'qq-bot' })));
  const management = await run('/我的师门 管理');
  for (const command of ['/同意拜师', '/同意出师', '/领取师门称号', '/叛离师门', '/同意出师 103', '/逐出师门 105']) assert.ok(management.commands.includes(command), command);
  assert.ok(!management.commands.includes('/同意出师 101'));
  assert.match(management.text, /可无损叛离/); assert.match(management.text, /可清退/);
  const history = await run('/我的师门 履历');
  assert.match(history.text, /旧徒5/); assert.doesNotMatch(history.text, /旧徒6/);
  assert.ok(history.commands.includes('/我的师门 履历 2'));
  const second = await run('/我的师门 履历 2');
  assert.match(second.text, /旧徒6/); assert.doesNotMatch(second.text, /旧徒5/);
  assert.match(second.text, /已出师/); assert.match(second.text, /2025-02-01/);
  assert.ok(second.commands.includes('/我的师门 履历 1'));
  assert.ok(!second.commands.some(c => /^\/(逐出师门|传功|赐福|同意出师)/.test(c)));
  const teacher = await run('/我的师门 师父');
  assert.match(teacher.text, /云师/); assert.match(teacher.text, /赐福 · 修为获取 \+5%/);
  assert.match(teacher.text, /师父扶持：/);
  assert.ok(!teacher.commands.includes('/叛离师门'));
  assert.equal(requests.length, 4);
});

test('空师门保留分类与寻找师父入口，师门别名分类可经真实路由到达', async t => {
  const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, { access: { allowed: true, realmName: '筑基' }, discipleSide: null, masterSide: null, discipleHistory: [] }));
  await app.mount({ responseRouter: router });
  const home = inspect(await app.dispatch(app.events.privateMessage({ text: '/师门', platform: 'qq-bot' })));
  assert.match(home.text, /暂无师承关系/); assert.ok(home.commands.includes('/圣人榜'));
  const daily = inspect(await app.dispatch(app.events.privateMessage({ text: '/师门 日常', platform: 'qq-bot' })));
  assert.match(daily.text, /当前没有师门日常/);
  const history = inspect(await app.dispatch(app.events.privateMessage({ text: '/我的师门 履历 2', platform: 'qq-bot' })));
  assert.match(history.text, /暂无师门履历/);
  assert.equal(requests.length, 3);
  assert.ok(requests.every(r => r.path.endsWith('/master.info')));
});

 test('师徒赐福使用原始时间转换北京时间，缺失履历日期保留占位', async t => {
  const value = data();
  value.discipleSide!.blessing = { percent: 5, expireAt: '2026-10-24T20:30:00Z', expireAtText: '旧时区文案' };
  value.masterSide!.history[0].finishedAt = null;
  const { app } = await gameFixture(t, r => businessEnvelope(r.bid, value));
  const teacher = inspect(await app.runHandler(info, app.events.privateMessage({ text: '/我的师门 师父', platform: 'qq-bot' })));
  assert.match(teacher.text, /持续至 2026-10-25 04:30:00/);
  assert.doesNotMatch(teacher.text, /旧时区文案|T20:30/);
  const history = inspect(await app.runHandler(info, app.events.privateMessage({ text: '/我的师门 履历', platform: 'qq-bot' })));
  assert.match(history.text, /拜师 2025-01-01 · 结束 --/);
});
