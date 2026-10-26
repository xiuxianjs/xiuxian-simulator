import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import overview from '../../src/response/team/myTeam/res';
import info from '../../src/response/team/teamInfo/res';
import applications from '../../src/response/team/applications/res';
import myApplications from '../../src/response/team/myApplications/res';
import invitations from '../../src/response/team/myInvitations/res';
import teams from '../../src/response/team/teamList/res';
import records from '../../src/response/team/battleRecords/res';
import detail from '../../src/response/team/battleDetail/res';
import cancel from '../../src/response/team/cancelApplication/res';
import master from '../../src/response/master/info/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

const lockedTeam = { access: { ok: false, realmName: '练气一层' }, team: null };
const lockedApplications = { records: { isLeader: false, realmName: '练气一层', canUseSecondLayerFeature: false, applications: [] } };
for (const entry of [
  { handler: overview, command: '/我的队伍', data: lockedTeam },
  { handler: overview, command: '/查看队伍', data: lockedTeam },
  { handler: info, command: '/队伍信息', data: lockedTeam },
  { handler: info, command: '/队伍信息 2', data: lockedTeam },
  { handler: myApplications, command: '/我的队伍申请', data: lockedApplications },
  { handler: invitations, command: '/我的队伍邀请', data: { access: lockedTeam.access, invitations: [] } },
  { handler: master, command: '/我的师门', data: { access: { allowed: false, realmName: '练气一层' }, discipleSide: null, masterSide: null, discipleHistory: [] } }
]) for (const isPrivate of [false, true]) {
  test(`功能门槛给出可执行修行建议 ${entry.command} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, entry.data));
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes('练气二层及以上方可开启该功能，当前境界：练气一层'));
    assert.ok(view.text.includes('挑战主线获取修为'));
    assert.ok(view.text.includes('已三星通关的关卡'));
    assert.ok(view.text.includes('核对当前修为和所需材料'));
    for (const command of ['/我的信息', '/查看主线', '/我的境界', '/闭关']) assert.ok(view.commands.includes(command));
    assert.ok(!view.text.includes('队伍不存在'));
    assert.ok(!view.text.includes('你当前没有加入'));
    assert.equal(message.target?.targetId, isPrivate ? event.UserId : event.ChannelId);
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

const decodedCases = [
  { handler: info, command: '/队伍信息 2', data: { access: { ok: true, realmName: '练气二层' }, team: null }, reason: '队伍不存在', expected: '/队伍列表', text: '旧编号失效不能判定为本人已经离队' },
  { handler: info, command: '/队伍信息', data: { access: { ok: true, realmName: '练气二层' }, team: null }, reason: '你当前没有加入任何队伍', expected: '/队伍列表', text: '入队条件' },
  { handler: teams, command: '/队伍列表 3', data: { items: [], total: 10, page: 3, pageSize: 10 }, reason: '本页暂无队伍', expected: '/队伍列表 1', text: '空页不等于所有记录都不存在' },
  { handler: teams, command: '/队伍列表', data: { items: [], total: 0, page: 1, pageSize: 10 }, reason: '暂无队伍', expected: '/我的队伍', text: '等待新队伍或自行创建' },
  { handler: records, command: '/队伍战斗记录 3', data: { items: [], total: 10, page: 3, totalPages: 1 }, reason: '本页暂无队伍战斗记录', expected: '/队伍战斗记录 1', text: '空页不等于所有记录都不存在' },
  { handler: records, command: '/队伍战斗记录', data: { items: [], total: 0, page: 1, totalPages: 0 }, reason: '暂无队伍战斗记录', expected: '/我的队伍', text: '本人带队或参与的历史战报' },
  { handler: detail, command: '/队伍战斗详情 2', data: { found: false }, reason: '记录不存在', expected: '/队伍战斗记录', text: '当前加入该队伍不等于参与了历史战斗' },
  { handler: detail, command: '/队伍战斗详情 2', data: { error: '你无权查看该队伍战斗记录' }, reason: '你无权查看该队伍战斗记录', expected: '/队伍战斗记录', text: '本人带队或参与的历史战报' },
  { handler: applications, command: '/队伍申请', data: { error: '你不是队长' }, reason: '你不是队长', expected: '/我的队伍', text: '需要队长权限' },
  { handler: applications, command: '/处理队伍申请', data: { error: '你还未加入队伍' }, reason: '你还未加入队伍', expected: '/队伍列表', text: '先查看现有队伍和入队条件' },
  { handler: cancel, command: '/取消队伍申请', data: { outcome: 'no_pending', message: '您当前没有待审核的队伍申请' }, reason: '您当前没有待审核的队伍申请', expected: '/我的队伍', text: '不会退出已经加入的队伍' },
  { handler: cancel, command: '/取消队伍申请 21', data: { outcome: 'not_pending', message: '申请记录不存在或已处理\n\n重复提醒' }, reason: '申请记录不存在或已处理', expected: '/我的队伍申请', text: '旧编号失效不等于本次取消成功' }
];
for (const entry of decodedCases) for (const isPrivate of [false, true]) {
  test(`查询或取消的结构化中断 ${entry.command} ${entry.reason} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, entry.data));
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(entry.reason), view.text);
    assert.ok(view.text.includes(entry.text), view.text);
    assert.ok(view.commands.includes(entry.expected));
    assert.ok(!view.commands.some(command => /^\/(?:加入队伍|离开队伍|队伍同意|队伍邀请同意|取消队伍申请)\s/.test(command)));
    if ('message' in entry.data && entry.data.message?.includes('重复提醒')) assert.equal(view.text.split('重复提醒').length - 1, 1);
    assert.equal(message.target?.targetId, isPrivate ? event.UserId : event.ChannelId);
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const entry of [
  { handler: applications, command: '/队伍申请', reason: '你不是队长', expected: '/我的队伍' },
  { handler: detail, command: '/队伍战斗详情 2', reason: '你无权查看该队伍战斗记录', expected: '/队伍战斗记录' },
  { handler: teams, command: '/队伍列表 0', reason: 'page 必须为正整数', expected: '/队伍列表 1' },
  { handler: records, command: '/队伍战斗记录 0', reason: 'page 必须为正整数', expected: '/队伍战斗记录 1' }
]) for (const mode of ['http', 'feedback']) for (const isPrivate of [false, true]) {
  test(`原始拒绝同样提供查询入口 ${entry.command} ${mode} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => mode === 'http' ? { code: 'FORBIDDEN', message: entry.reason }
      : businessEnvelope(request.bid, undefined, [{ title: '队伍', heading: '', text: entry.reason, buttons: [], advice: [] }]), mode === 'http' ? 403 : 200);
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(entry.reason));
    assert.ok(view.commands.includes(entry.expected));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const isPrivate of [false, true]) {
  test(`取消列表使用真实编号并保持单请求 private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { outcome: 'list', applications: [{ id: 21, leaderName: '青云', createdAt: '2026-10-21T00:00:00Z' }] }));
    const event = isPrivate ? app.events.privateMessage({ text: '/取消队伍申请', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/取消队伍申请', platform: 'qq-bot' });
    const result = await app.runHandler(cancel, event);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].idempotencyKey);
    assert.deepEqual(requests[0].body.arguments, { applicationId: '' });
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes('申请编号：21'));
    assert.ok(view.commands.includes('/取消队伍申请 21'));
    assert.ok(!view.text.includes('/取消队伍申请 1001'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
