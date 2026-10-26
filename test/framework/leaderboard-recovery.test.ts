import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import menu from '../../src/response/leaderboard/res';
import realm from '../../src/response/leaderboard/realm/res';
import regionRealm from '../../src/response/leaderboard/realm/regionRes';
import popularity from '../../src/response/leaderboard/popularity/res';
import battle from '../../src/response/battle/leaderboard/res';
import regionBattle from '../../src/response/battle/leaderboard/regionRes';
import alchemy from '../../src/response/alchemy/leaderboard/res';
import storyline from '../../src/response/storyline/leaderboard/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const entries = [
  { handler: menu, op: 'leaderboard.menu', command: '/排行榜', args: {} },
  { handler: realm, op: 'leaderboard.realm', command: '/境界排行榜', args: {} },
  { handler: regionRealm, op: 'leaderboard.realm-region', command: '/区境界排行榜', args: {} },
  { handler: popularity, op: 'leaderboard.popularity', command: '/人气排行榜', args: {} },
  { handler: battle, op: 'leaderboard.battle', command: '/战力排行榜', args: { page: '1', top50: true } },
  { handler: regionBattle, op: 'leaderboard.battle-region', command: '/区战力排行榜', args: { page: '1', top50: true } },
  { handler: alchemy, op: 'leaderboard.alchemy', command: '/丹师排行榜', args: { page: '1', top50: true } },
  { handler: storyline, op: 'leaderboard.storyline', command: '/主线排行榜', args: { input: '/主线排行榜', top50: true } }
];
for (const entry of entries) for (const isPrivate of [false, true]) for (const mode of ['http', 'feedback', 'structured', 'malformed']) {
  test(`${entry.op} ${mode} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => {
      if (mode === 'http') return { code: 'CONFLICT', message: '原查询失败' };
      if (mode === 'malformed') return businessEnvelope(request.bid, {});
      return businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: '原查询失败', blocks: [{ text: '原查询失败', quoted: false }, { text: '原说明', quoted: true }], quote: '原引用', buttons: [{ label: '原返回', command: '/我' }], advice: mode === 'structured' ? [{ command: '/我的信息', description: '原服务建议' }] : [] }]);
    }, mode === 'http' ? 409 : 200);
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].path.endsWith('/' + entry.op));
    assert.deepEqual(requests[0].body.arguments, entry.args);
    assert.ok(requests[0].idempotencyKey);
    assert.equal(result.messages.length, 1);
    if (mode !== 'malformed') assert.equal(view.text.split('原查询失败').length - 1, 1);
    if (mode === 'feedback' || mode === 'structured') {
      for (const text of ['原说明', '原引用']) assert.ok(view.text.includes(text), view.text);
      assert.ok(view.commands.includes('/我'));
    }
    if (mode === 'structured') { assert.ok(view.text.includes('原服务建议')); assert.ok(view.commands.includes('/我的信息')); }
    else { assert.ok(view.text.includes('查询失败不能说明排名下降或数据清零'), view.text); assert.ok(view.commands.includes('/排行榜')); }
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const entry of entries.slice(1)) for (const isPrivate of [false, true]) {
  test(`${entry.op} actual fifth-layer refusal has growth path private=${isPrivate}`, async t => {
    const reason = '炼气五层及以上方可开启该功能，当前境界：炼气四层';
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: reason, buttons: [{ label: '我的境界', command: '/我的境界' }], advice: [] }]));
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.ok(view.text.includes(reason));
    for (const command of ['/我的信息', '/查看主线', '/我的境界', '/闭关']) assert.ok(view.commands.includes(command), view.commands.join(','));
    assert.ok(view.text.includes('已三星通关的关卡'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
const realmEmpty = { canUseFifthLayerFeature: true, canUseSpar: false, realmName: '炼气五层', region: '一区', list: [], self: null, nearby: [] };
const emptyData = (op: string) => op === 'leaderboard.popularity' ? { canUseFifthLayerFeature: true, realmName: '炼气五层', items: [], self: null, nearby: [] }
  : op === 'leaderboard.storyline' ? { access: { ok: true, realmName: '炼气五层' }, leaderboard: { page: 1, total: 0, totalPages: 1, items: [], nearby: [], self: null } }
  : op === 'leaderboard.alchemy' ? { access: { canAccess: true, realmName: '炼气五层' }, page: 1, pageSize: 10, total: 0, totalPages: 1, items: [], nearby: [], self: null }
  : op.includes('battle') ? { access: { ok: true, canUseSpar: false, realmName: '炼气五层', region: '一区' }, leaderboard: { page: 1, total: 0, totalPages: 1, time: null, building: false, complete: true, list: [], nearby: [], self: null } }
  : realmEmpty;
for (const entry of entries.slice(1)) for (const isPrivate of [false, true]) {
  test(`${entry.op} empty is not data loss private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, emptyData(entry.op)));
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.ok(view.text.includes('当前展示范围暂无排行记录'), view.text);
    assert.ok(view.commands.includes('/排行榜'));
    if (entry.op.includes('battle')) { assert.ok(!view.text.includes('正在统计中')); assert.ok(!view.text.includes('首次统计中')); }
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const entry of [entries[4], entries[5]]) for (const isPrivate of [false, true]) for (const state of ['building', 'page']) {
  test(`${entry.op} ${state} private=${isPrivate}`, async t => {
    const data = { access: { ok: true, canUseSpar: false, realmName: '炼气五层', region: '一区' }, leaderboard: { page: 2, total: state === 'page' ? 12 : 0, totalPages: 2, time: 123, building: state === 'building', complete: true, list: [], nearby: [], self: null } };
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
    const event = isPrivate ? app.events.privateMessage({ text: entry.command + ' 2', platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command + ' 2', platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].body.arguments, { page: '2', top50: true });
    assert.ok(view.text.includes('统计时间'));
    if (state === 'building') { assert.ok(view.text.includes('服务端正在统计')); assert.ok(view.commands.includes('/排行榜')); }
    else { assert.ok(view.text.includes('当前榜单共 12 人')); assert.ok(view.commands.includes(entry.command)); assert.ok(!view.text.includes('正在统计中')); }
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const isPrivate of [false, true]) for (const reason of ['你当前没有归属区，无法查看区排行。', '区境界排行榜参数无效，请使用原入口']) {
  test(`regional refusal ${reason} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: reason, buttons: [], advice: [] }]));
    const event = isPrivate ? app.events.privateMessage({ text: '/区境界排行榜', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/区境界排行榜', platform: 'qq-bot' });
    const result = await app.runHandler(regionRealm, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.ok(view.text.includes(reason));
    assert.ok(view.commands.includes(reason.includes('归属区') ? '/境界排行榜' : '/区境界排行榜'));
    assert.ok(!view.commands.includes('/闭关'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const entry of entries) for (const isPrivate of [false, true]) {
  test(`${entry.op} valid data retains authorized rows and actions private=${isPrivate}`, async t => {
    const row = { rank: 1, uid: 88, name: '原道友', realmName: '筑基', realmLevel: 10, experience: 123, popularity: 4, power: 555, totalStars: 6 };
    const data = entry.handler === menu ? [{ menuHint: '原目录提示', menu: { group: '实力成长', label: '原榜单', command: '/境界排行榜', description: '原描述' } }]
      : entry.handler === realm || entry.handler === regionRealm ? { ...realmEmpty, list: [row] }
        : entry.handler === popularity ? { canUseFifthLayerFeature: true, realmName: '筑基', items: [row], self: null, nearby: [] }
          : entry.handler === alchemy ? { access: { canAccess: true, realmName: '筑基' }, page: 1, pageSize: 10, total: 1, totalPages: 1, items: [{ rank: 1, playerId: 88, name: '原道友', title: '丹师', level: 2, exp: 123, totalCrafts: 4, successCount: 3, successRate: '75', canLike: false }], nearby: [], self: null }
            : entry.handler === storyline ? { access: { ok: true, realmName: '筑基' }, leaderboard: { page: 1, total: 1, totalPages: 1, items: [row], nearby: [], self: null } }
              : { access: { ok: true, canUseSpar: false, realmName: '筑基', region: '一区' }, leaderboard: { page: 1, total: 1, totalPages: 1, time: 123, building: false, complete: true, list: [row], nearby: [], self: null } };
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].body.arguments, entry.args);
    assert.ok(!view.text.includes('建议：'));
    if (entry.handler === menu) {
      for (const text of ['原目录提示', '原榜单', '原描述']) assert.ok(view.text.includes(text));
      assert.ok(view.commands.includes('/境界排行榜'));
    } else {
      assert.ok(view.text.includes('原道友'));
      assert.ok(view.text.includes('ID:88'));
      assert.ok(view.commands.includes('/查看信息 88'));
      assert.ok(!view.commands.some(command => command.startsWith('/比试 ')));
      if (entry.handler === battle || entry.handler === regionBattle) assert.ok(view.text.includes('555'));
      if (entry.handler === realm || entry.handler === regionRealm) assert.ok(view.text.includes('123'));
      if (entry.handler === alchemy) { assert.ok(view.text.includes('成功率:75%')); assert.ok(!view.commands.some(command => command.startsWith('/点赞人气 '))); }
      if (entry.handler === storyline) assert.ok(view.text.includes('星数:6'));
    }
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const isPrivate of [false, true]) {
  test(`storyline ignored invalid input has a recovery bubble private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { outcome: 'ignored' }));
    const text = '/主线排行榜 abc';
    const event = isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' });
    const result = await app.runHandler(storyline, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].body.arguments, { input: text, top50: true });
    assert.ok(view.text.includes('页码无效'));
    assert.ok(view.commands.includes('/主线排行榜'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
