import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, Router, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import overview from '../../src/response/achievements/overview/res';
import category from '../../src/response/achievements/category/res';
import completed from '../../src/response/achievements/myAchievements/res';
import all from '../../src/response/achievements/allAchievements/res';
import combat from '../../src/response/achievements/combatPower/res';
import claim from '../../src/response/achievements/claimAll/res';
import combatClaim from '../../src/response/achievements/claimCombatPower/res';
import route from '../../src/response/achievements/route/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const entries = [
  { handler: overview, op: 'achievements.overview', command: '/成就', args: {} },
  { handler: category, op: 'achievements.category', command: '/成就 主线', args: { keyword: '主线' } },
  { handler: completed, op: 'achievements.completed', command: '/我的成就 2', args: { page: 2, pageSize: 5 } },
  { handler: all, op: 'achievements.all', command: '/所有成就 2', args: { page: 2, pageSize: 5 } },
  { handler: combat, op: 'achievements.combat-power', command: '/成就 战力', args: {} },
  { handler: claim, op: 'achievements.claim-all', command: '/一键领取成就', args: {} },
  { handler: combatClaim, op: 'achievements.claim-combat-power', command: '/成就 战力 领取', args: {} }
];
const access = { canUseFifthLayerFeature: true, realmName: '炼气五层' };
const guarded = (data: unknown) => ({ access, data });
for (const entry of entries) for (const isPrivate of [false, true]) for (const mode of ['http', 'feedback', 'structured', 'malformed']) {
  test(`${entry.op} ${mode} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => {
      if (mode === 'http') return { code: 'CONFLICT', message: '原业务拒绝' };
      if (mode === 'malformed') return businessEnvelope(request.bid, {});
      return businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: '原业务拒绝', blocks: [{ text: '原业务拒绝', quoted: false }, { text: '原说明', quoted: true }], quote: '原引用', buttons: [{ label: '原返回', command: '/我' }], advice: mode === 'structured' ? [{ command: '/我的信息', description: '原服务建议' }] : [] }]);
    }, mode === 'http' ? 409 : 200);
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].path.endsWith('/' + entry.op));
    assert.deepEqual(requests[0].body.arguments, entry.args);
    assert.ok(requests[0].idempotencyKey);
    assert.equal(result.messages.length, 1);
    if (mode !== 'malformed') assert.equal(view.text.split('原业务拒绝').length - 1, 1);
    if (mode === 'structured') { assert.ok(view.text.includes('原服务建议')); assert.ok(view.commands.includes('/我的信息')); }
    else if (entry.op.startsWith('achievements.claim-')) {
      assert.ok(view.text.includes('不证明奖励未发放'), view.text);
      assert.ok(view.commands.includes('/成就'));
      assert.ok(view.commands.includes('/我的信息'));
      if (mode === 'malformed') assert.ok(view.text.includes('成就领取结果未获完整确认'));
    } else assert.ok(view.commands.includes('/成就'));
    if (mode === 'feedback' || mode === 'structured') for (const text of ['原说明', '原引用']) assert.ok(view.text.includes(text));
    assert.ok(!view.commands.some(command => /^\/(?:一键领取成就|成就 战力 (?:一键)?领取)$/.test(command)));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
const emptyCombat = { currentPower: 0, totalCount: 0, completedCount: 0, claimableCount: 0, currentClaimable: null, nextTarget: null, allCompleted: false, items: [] };
const card = { id: 1, name: '目标成就', description: '原目标描述', threshold: 200, rewardText: '灵石×12' };
const page = (currentPage: number, total: number) => ({ items: [], page: { currentPage, total, totalPages: total ? 1 : 0 } });
const frames = [
  { handler: overview, command: '/成就', data: { access, summary: { totalAchievements: 0, completedAchievements: 0, completionRate: 0 }, totalClaimable: 0, canClaimAll: false, categories: [] }, text: '暂无成就分类配置', expected: '/所有成就' },
  { handler: category, command: '/成就 未知', data: { access, validCategory: false, total: 0, completed: 0, claimableCount: 0, items: [] }, text: '未找到对应成就分类', expected: '/成就' },
  { handler: category, command: '/成就 主线', data: { access, validCategory: true, category: 'storyline', label: '主线', total: 0, completed: 0, claimableCount: 0, items: [] }, text: '当前分类暂无成就配置', expected: '/所有成就' },
  { handler: combat, command: '/成就 战力', data: guarded(emptyCombat), text: '暂无战力成就配置', expected: '/所有成就' },
  { handler: completed, command: '/我的成就', data: guarded(page(1, 0)), text: '您还没有获得任何成就', expected: '/成就' },
  { handler: all, command: '/所有成就', data: page(1, 0), text: '暂无成就数据', expected: '/所有成就' },
  { handler: completed, command: '/我的成就 9', data: guarded(page(9, 5)), text: '页数超出范围', expected: '/我的成就' },
  { handler: all, command: '/所有成就 9', data: page(9, 5), text: '页数超出范围', expected: '/所有成就' },
  { handler: completed, command: '/我的成就', data: guarded(page(1, 5)), text: '本页暂无成就记录', expected: '/我的成就' },
  { handler: all, command: '/所有成就', data: page(1, 5), text: '本页暂无成就记录', expected: '/所有成就' },
  { handler: combat, command: '/成就 战力', data: guarded({ ...emptyCombat, currentPower: 150, totalCount: 1, nextTarget: { ...card, remainingPower: 50 }, items: [{ ...card, completed: false, claimed: false, reachable: false }] }), text: '还差：50 战力', expected: '/我的装备' }
];
for (const entry of frames) for (const isPrivate of [false, true]) {
  test(`current state ${entry.command} ${entry.text} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, entry.data));
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.ok(view.text.includes(entry.text), view.text);
    assert.ok(view.commands.includes(entry.expected));
    assert.ok(!view.commands.some(command => /^\/(?:一键领取成就|成就 战力 (?:一键)?领取)$/.test(command)));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const entry of entries.filter(entry => entry.handler !== all)) for (const isPrivate of [false, true]) {
  test(`${entry.op} locked retains growth path private=${isPrivate}`, async t => {
    const lockedAccess = { canUseFifthLayerFeature: false, realmName: '炼气四层' };
    const data = entry.handler === overview ? { access: lockedAccess, summary: { totalAchievements: 0, completedAchievements: 0, completionRate: 0 }, totalClaimable: 0, canClaimAll: false, categories: [] }
      : entry.handler === category ? { access: lockedAccess, validCategory: false, total: 0, completed: 0, claimableCount: 0, items: [] } : { access: lockedAccess, data: null };
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.ok(view.text.includes('炼气四层'));
    for (const command of ['/我的信息', '/查看主线', '/我的境界', '/闭关']) assert.ok(view.commands.includes(command));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const [key, keyword, expected] of [['general', '通用', '/所有成就'], ['storyline', '主线', '/查看主线'], ['lingzhi', '灵田', '/我的灵田'], ['master', '师门', '/我的师门'], ['tower_shop_unlock', '妖塔奖励', '/妖塔'], ['combat_power', '战力', '/我的装备']]) for (const isPrivate of [false, true]) {
  test(`unfinished ${key} progress private=${isPrivate}`, async t => {
    const data = { access, validCategory: true, category: key, label: keyword, total: 2, completed: 0, claimableCount: 0, items: [1, 2].map(id => ({ id, name: '未达目标' + id, description: '原条件', completed: false, rewardText: '灵石×12', progressText: '150/200' })) };
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
    const text = `/成就 ${keyword}`;
    const event = isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' });
    const result = await app.runHandler(category, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].body.arguments, { keyword });
    for (const text of ['未达目标1', '未达目标2', '原条件', '150/200', '灵石×12']) assert.ok(view.text.includes(text));
    assert.ok(view.commands.includes(expected));
    assert.doesNotMatch(view.text, /建议：/);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const entry of entries.slice(5)) for (const isPrivate of [false, true]) for (const reason of ['当前没有可领取的成就奖励', '成就奖励已领取']) {
  test(`${entry.op} ${reason} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, () => ({ code: 'CONFLICT', message: reason }), 409);
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.ok(view.text.includes(reason));
    assert.ok(view.text.includes('不把兜底文案当作真实下一目标'));
    assert.ok(view.commands.includes(entry.handler === claim ? '/成就' : '/成就 战力'));
    assert.ok(!view.commands.includes('/一键领取成就'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const isPrivate of [false, true]) for (const entry of [entries[0], entries[1], entries[4], entries[5], entries[6]]) {
  test(`valid success ${entry.op} private=${isPrivate}`, async t => {
    const claimData = guarded({ claimedCount: 1, claimed: [{ category: 'combat_power', categoryLabel: '战力', achievementName: '原成就', issued: [{ type: 'currency', name: '灵石', amount: 12 }] }] });
    const data = entry.handler === overview ? { access, summary: { totalAchievements: 2, completedAchievements: 1, completionRate: 50 }, totalClaimable: 1, canClaimAll: true, categories: [{ category: 'storyline', label: '主线', command: '/成就 主线', total: 2, completed: 1, completionRate: 50, claimableCount: 1, hasClaimable: true }] }
      : entry.handler === category ? { access, validCategory: true, category: 'storyline', label: '主线', total: 1, completed: 1, claimableCount: 1, items: [{ id: 1, name: '原成就', description: '原条件', completed: true, rewardText: '灵石×12', progressText: '可领取' }] }
        : entry.handler === combat ? guarded({ ...emptyCombat, currentPower: 250, totalCount: 1, completedCount: 1, claimableCount: 1, currentClaimable: { ...card, remainingClaimableCount: 0 }, items: [{ ...card, completed: true, claimed: false, reachable: true }] }) : claimData;
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.ok(!view.text.includes('建议：'));
    if (entry.handler === claim || entry.handler === combatClaim) {
      assert.ok(view.text.includes('成功领取 1 个'));
      assert.ok(view.text.includes('原成就'));
      assert.ok(view.text.includes('灵石×12'));
    } else assert.ok(view.commands.includes(entry.handler === combat ? '/成就 战力 一键领取' : '/一键领取成就'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const text of ['成就', '成就 主线', '成就 战力', '成就 战力 领取', '成就 战力 一键领取', '我的成就', '所有成就', '一键领取成就']) for (const isPrivate of [false, true]) {
  test(`real mounted achievement route ${text} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, () => ({ code: 'CONFLICT', message: '原路由拒绝' }), 409);
    const router = Router.create({ events: ['message.create', 'private.message.create'] });
    router.use('成就 战力', async () => ({ default: combat }));
    router.use('成就', async () => ({ default: route }));
    router.use('我的成就', async () => ({ default: completed }));
    router.use('所有成就', async () => ({ default: all }));
    router.use('一键领取成就', async () => ({ default: claim }));
    await app.mount({ responseRouter: router.define });
    const event = isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' });
    const result = await app.dispatch(event);
    const expected = text === '成就' ? 'overview' : text === '成就 主线' ? 'category' : text.includes('战力') ? text.includes('领取') ? 'claim-combat-power' : 'combat-power' : text === '我的成就' ? 'completed' : text === '所有成就' ? 'all' : 'claim-all';
    assert.equal(requests.length, 1, JSON.stringify(result.messages));
    assert.ok(requests[0].path.endsWith('/achievements.' + expected));
    assert.ok(inspectMessage(result.messages[0].nodes).text.includes('原路由拒绝'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const isPrivate of [false, true]) for (const claimed of [false, true]) {
  test(`historical completed record claimed=${claimed} does not imply lost eligibility private=${isPrivate}`, async t => {
    const data = guarded({ ...emptyCombat, currentPower: 150, totalCount: 1, completedCount: 1, allCompleted: true, items: [{ ...card, completed: true, claimed, reachable: false }] });
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
    const text = '/成就 战力';
    const event = isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' });
    const result = await app.runHandler(combat, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.ok(view.text.includes('所有战力成就已达成'));
    if (claimed) assert.ok(!view.text.includes('历史已达成但本页当前未显示可领取'));
    else {
      assert.ok(view.text.includes('当前战力下降不证明历史奖励已经失效'));
      assert.ok(view.commands.includes('/成就'));
      assert.ok(!view.commands.includes('/一键领取成就'));
      assert.ok(!view.commands.includes('/成就 战力 一键领取'));
    }
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

for (const isPrivate of [false, true]) {
  test(`historical milestone returned as claimable retains original claim entry private=${isPrivate}`, async t => {
    const data = guarded({ ...emptyCombat, currentPower: 150, totalCount: 1, completedCount: 1, claimableCount: 1, allCompleted: true,
      currentClaimable: { ...card, remainingClaimableCount: 0 }, items: [{ ...card, completed: true, claimed: false, reachable: false }] });
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
    const text = '/成就 战力';
    const event = isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' });
    const result = await app.runHandler(combat, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.ok(view.text.includes('当前可领取 ·'));
    assert.ok(view.text.includes('目标成就'));
    assert.ok(view.text.includes('150'));
    assert.ok(view.text.includes('200'));
    assert.ok(view.commands.includes('/成就 战力 一键领取'));
    assert.ok(!view.text.includes('当前未显示可领取'));
    assert.ok(!view.text.includes('建议：'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
