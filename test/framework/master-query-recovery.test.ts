import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import info from '../../src/response/master/info/res';
import lineage from '../../src/response/master/lineage/res';
import ranking from '../../src/response/master/rank/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const entries = [
  { handler: info, command: '/我的师门', operation: 'master.info', fallback: '获取师门信息失败' },
  { handler: lineage, command: '/师谱', operation: 'master.lineage', fallback: '获取师谱失败' },
  { handler: ranking, command: '/圣人榜', operation: 'master.ranking', fallback: '获取圣人榜失败' }
];
const emptyInfo = { access: { allowed: true, realmName: '筑基初期' }, discipleSide: null, masterSide: null, discipleHistory: [] };
const node = { userId: 1, name: '青云', realmName: '筑基初期', relationStatus: null, disciples: [] };
const stats = { virtueLevel: 1, virtueTitle: '初为人师', virtueExperience: 8, totalGraduatedCount: 0, activeDiscipleCount: 1 };
const top = [{ ...stats, rank: 1, userId: 2, userName: '云师' }];

for (const entry of entries) for (const isPrivate of [false, true]) for (const mode of ['http', 'feedback']) {
  for (const reason of ['师徒服务尚未配置', '查询暂不可用\n\n重复提醒', '读取失败：连接中断']) {
    test(`${entry.command} query failure private=${isPrivate} ${mode} ${reason}`, async t => {
      const { app, requests } = await gameFixture(t, request => mode === 'http'
        ? { code: 'CONFLICT', message: reason }
        : businessEnvelope(request.bid, undefined, [{ title: '查询', heading: '', text: reason, buttons: [], advice: [] }]), mode === 'http' ? 409 : 200);
      const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
      const result = await app.runHandler(entry.handler, event);
      assert.equal(requests.length, 1);
      assert.ok(requests[0].path.endsWith('/' + entry.operation), requests[0].path);
      assert.deepEqual(requests[0].body.arguments, {});
      assert.equal(result.messages.length, 1);
      const view = inspectMessage(result.messages[0].nodes);
      assert.ok(view.text.includes(reason));
      assert.ok(view.text.includes('不能据此判断师承已解除、师德归零或排名消失'), view.text);
      assert.ok(view.commands.includes('/我的信息'));
      assert.ok(!view.commands.includes('/叛离师门'));
      assert.ok(!view.commands.includes('/领取师门称号'));
      assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    });
  }
}
for (const entry of entries) for (const isPrivate of [false, true]) {
  test(`${entry.command} malformed query remains visible private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, {}));
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const view = inspectMessage(result.messages[0].nodes);
    assert.ok(view.text.includes(entry.fallback));
    assert.ok(view.text.includes('本次未取得完整查询结果'));
    assert.ok(view.commands.includes('/我的信息'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const entry of [
  { ...entries[0], data: emptyInfo, expected: '/圣人榜', text: '暂无师承关系' },
  { ...entries[1], data: { root: null }, expected: '/我的师门', text: '空谱系或只有本人不代表从未拜师' },
  { ...entries[1], data: { root: node }, expected: '/我的师门', text: '师谱当前仅展示本人' },
  { ...entries[2], data: { top: [], nearby: [], self: null }, expected: '/我的师门', text: '未展示排名不代表师德为零' },
  { ...entries[2], data: { top, nearby: [], self: null }, expected: '/我的师门', text: '本次未返回本人排名' },
  { ...entries[2], data: { top, nearby: [], self: { ...stats, rank: 55 } }, expected: '/我的师门', text: '本人排名未在当前展示范围内' }
]) for (const isPrivate of [false, true]) {
  test(`${entry.command} empty/unranked ${entry.text} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, entry.data));
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const view = inspectMessage(result.messages[0].nodes);
    assert.ok(view.text.includes(entry.text), view.text);
    assert.ok(view.commands.includes(entry.expected));
    if (entry.handler === ranking) assert.ok(!view.text.includes('我的排名：第0名'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const isPrivate of [false, true]) for (const mode of ['http', 'feedback']) {
  test(`cyclic lineage retains source refusal and requests record review private=${isPrivate} ${mode}`, async t => {
    const reason = '师承关系存在循环，请核对记录';
    const { app, requests } = await gameFixture(t, request => mode === 'http' ? { code: 'CONFLICT', message: reason }
      : businessEnvelope(request.bid, undefined, [{ title: '师谱', heading: '', text: reason, buttons: [], advice: [] }]), mode === 'http' ? 409 : 200);
    const event = isPrivate ? app.events.privateMessage({ text: '/师谱', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/师谱', platform: 'qq-bot' });
    const result = await app.runHandler(lineage, event);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const view = inspectMessage(result.messages[0].nodes);
    assert.ok(view.text.includes(reason));
    assert.ok(view.text.includes('联系管理员核对关系记录'));
    assert.ok(view.commands.includes('/我的师门'));
    assert.ok(!view.commands.includes('/叛离师门'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
const masterHistoryInfo = {
  ...emptyInfo,
  masterSide: {
    stats: { masterVirtueExp: 8, masterVirtueLevel: 1, activeDiscipleCount: 0, totalGraduatedCount: 1, totalAcceptedDiscipleCount: 1, discipleCap: 2 },
    virtueTitle: '初为人师', virtueProgress: { progressExp: 8, progressRequired: 20 }, disciples: [],
    history: [{ displayTargetName: '旧徒', displayTargetRealm: '金丹', statusText: '已出师', startedAt: '2026-01-01', displayFinishedAt: '2026-02-01' }]
  }
};
for (const entry of [
  { ...entries[0], command: '/我的师门 履历', data: { ...emptyInfo, discipleHistory: [{ displayTargetName: '旧师', displayTargetRealm: '金丹', statusText: '已叛离', startedAt: '2026-01-01', displayFinishedAt: '2026-02-01' }] }, text: '旧师', absent: '还未建立师承关系' },
  { ...entries[0], command: '/我的师门 履历', data: masterHistoryInfo, text: '旧徒', absent: '还未建立师承关系' },
  { ...entries[1], data: { root: { ...node, disciples: [{ ...node, userId: 2, name: null, realmName: null, relationStatus: 2 }] } }, text: '修士2', absent: '师谱当前仅展示本人' },
  { ...entries[2], data: { top, nearby: [], self: { ...stats, rank: 8 } }, text: '我的排名：第8名', absent: '本次未返回本人排名' }
]) for (const isPrivate of [false, true]) {
  test(`${entry.command} nonempty facts retained private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, entry.data));
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const view = inspectMessage(result.messages[0].nodes);
    assert.ok(view.text.includes(entry.text), view.text);
    assert.ok(!view.text.includes(entry.absent));
    if (entry.handler === lineage) for (const fact of ['青云【自己】', '未知境界', '已出师']) assert.ok(view.text.includes(fact));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

for (const isPrivate of [false, true]) {
  test(`师门实际境界锁保留修行建议 private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { ...emptyInfo, access: { allowed: false, realmName: '炼气一层' } }));
    const event = isPrivate ? app.events.privateMessage({ text: '/师门', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/师门', platform: 'qq-bot' });
    const result = await app.runHandler(info, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.ok(view.text.includes('炼气一层'));
    assert.ok(view.commands.includes('/查看主线'));
    assert.ok(view.commands.includes('/我的境界'));
    assert.ok(!view.commands.includes('/拜师'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const entry of entries) for (const isPrivate of [false, true]) {
  test(`${entry.command} authoritative advice survives private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{
      title: '师门', heading: '', text: '原查询拒绝', quote: '原引用', blocks: [{ text: '原说明', quoted: true }],
      advice: [{ command: '/我的境界', description: '服务端已有核对建议' }], buttons: [{ label: '原入口', command: '/我的信息' }]
    }]));
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const view = inspectMessage(result.messages[0].nodes);
    for (const text of ['原查询拒绝', '原引用', '原说明', '服务端已有核对建议']) assert.ok(view.text.includes(text), view.text);
    for (const command of ['/我的境界', '/我的信息']) assert.ok(view.commands.includes(command));
    assert.ok(!view.text.includes('本次未取得完整查询结果'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
