import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import panel from '../../src/response/soulPath/panel/res';
import path from '../../src/response/soulPath/path/res';
import source from '../../src/response/soulPath/source/res';
import compare from '../../src/response/soulPath/compare/res';
import { businessEnvelope, gameFixture } from './fixture';
before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const entries = [
  { handler: panel, command: '/元婴神魂', op: 'soul-path.state' },
  { handler: path, command: '/元婴道途', op: 'soul-path.state' },
  { handler: source, command: '/神魂材料来源', op: 'soul-path.state' },
  { handler: compare, command: '/道途印证', op: 'soul-path.compare' }
];
const node = { key: 'entry', name: '原节点', description: '原节点效果', unlocked: true, requirementText: '原需求', requiredInsight: 10, requiredProficiency: 20, canAdvance: false };
const state = {
  stability: 70, insight: 100, lowYieldStreak: 2, pathKey: 'xuan_fa', pathName: '玄法道', pathProficiency: 80, unlockedNodes: ['entry'], pathSwitchAvailableAt: null, effectsMaintenance: false,
  panel: { realmName: '元婴', pathStage: '入门', dailyNurtureText: '原每日进度', materials: [{ name: '原材料', quantity: 7 }], materialSourceLines: ['原实际来源'], nurtureRuleLines: ['原温养规则', '原补给规则'], dailyDungeonClaimed: true, dailyMaterialDirectionName: '悟道', nextNode: null, canReroll: false, actionUnavailable: '', nurtureUnavailable: '', nurtureOptions: [{ name: '悟道', costText: '原消耗', reserveWarning: '原保留提醒', baseText: '原基础效果' }], switchCooldownActive: false, allComplete: false },
  paths: ['xuan_fa', 'lian_ti', 'yu_qi'].map((key, i) => ({ key, name: ['玄法道', '炼体道', '御器道'][i], proficiency: 80, stage: '入门', active: i === 0, unlockedNodes: ['entry'], nodes: [node, { ...node, key: 'minor', unlocked: false }, { ...node, key: 'complete', unlocked: false }] }))
};
const comparison = { changes: [{ label: '原攻击', before: 100, after: 120, deltaText: '+20' }], emptyMessage: '', quote: '原战斗加成说明' };
for (const entry of entries) for (const isPrivate of [false, true]) for (const wire of ['http', 'feedback', 'structured', 'malformed', 'internal']) test(`soul query ${entry.command} ${wire} private=${isPrivate}`, async t => {
  const { app, requests } = await gameFixture(t, request => wire === 'http' ? { code: 'CONFLICT', message: '原查询拒绝' } : wire === 'internal' ? { code: 'INTERNAL', message: 'private SQL soul query' } : businessEnvelope(request.bid, wire === 'malformed' ? {} : undefined, wire === 'malformed' ? [] : [{ title: '', heading: '原抬头', text: '原查询拒绝', quote: '原引用', blocks: [{ text: '原说明', quoted: true, inlineButtons: [{ label: '查看', command: '/丹方' }, { label: '旧确认', command: '/确认神魂 旧凭证' }] }], buttons: [{ label: '原返回', command: '/我的本命物' }], advice: wire === 'structured' ? [{ command: '/我的信息', description: '原服务建议' }] : [] }]), wire === 'http' ? 409 : wire === 'internal' ? 500 : 200);
  const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
  const result = await app.runHandler(entry.handler, event); assert.equal(result.messages.length, 1); const view = inspectMessage(result.messages[0].nodes);
  assert.equal(requests.length, 1); assert.ok(requests[0].path.endsWith('/' + entry.op)); assert.deepEqual(requests[0].body.arguments, {});
  assert.ok(view.text.includes(wire === 'malformed' || wire === 'internal' ? entry.op === 'soul-path.compare' ? '属性暂时无法计算' : '未获完整确认' : '原查询拒绝'));
  assert.ok(!view.text.includes('private SQL')); assert.ok(view.commands.includes('/我的信息')); assert.ok(!view.commands.some(command => command.startsWith('/确认神魂')));
  if (wire === 'feedback' || wire === 'structured') { for (const text of ['原抬头', '原引用', '原说明']) assert.ok(view.text.includes(text)); for (const command of ['/丹方', '/我的本命物']) assert.ok(view.commands.includes(command)); }
  if (wire === 'structured') assert.ok(view.text.includes('原服务建议')); else assert.ok(view.text.includes('不代表道途、进度或材料已清空'));
  assert.equal(result.messages[0].target?.targetId, isPrivate ? event.UserId : event.ChannelId); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const entry of entries) for (const isPrivate of [false, true]) for (const reason of ['元婴期及以上方可温养神魂、选择道途', '元婴及以上方可进行道途印证。']) test(`soul query realm ${entry.command} ${reason} private=${isPrivate}`, async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: reason, buttons: [], advice: [] }]));
  const result = await app.runHandler(entry.handler, isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' })); const view = inspectMessage(result.messages[0].nodes);
  assert.equal(requests.length, 1); assert.ok(view.text.includes(reason)); for (const command of ['/我的信息', '/查看主线', '/我的境界', '/闭关']) assert.ok(view.commands.includes(command)); assert.ok(view.text.includes('挑战主线获取修为')); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const isPrivate of [false, true]) for (const text of ['/元婴道途 未知', '/道途详情 xuan_fa', '/元婴道途 玄法 多余']) test(`invalid path query ${text} private=${isPrivate}`, async t => {
  const { app, requests } = await gameFixture(t, () => { throw new Error('must not query'); }); const result = await app.runHandler(path, isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' })); const view = inspectMessage(result.messages[0].nodes);
  assert.equal(requests.length, 0); assert.ok(view.text.includes('道途名称无效')); assert.ok(view.commands.includes('/元婴道途')); assert.ok(!view.commands.some(command => /选择道途|切换道途/.test(command))); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const entry of entries) for (const isPrivate of [false, true]) test(`valid soul query ${entry.command} private=${isPrivate}`, async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, entry.op === 'soul-path.compare' ? comparison : state)); const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' }); const result = await app.runHandler(entry.handler, event); const view = inspectMessage(result.messages[0].nodes);
  assert.equal(requests.length, 1); assert.equal(result.messages.length, 1);
  for (const text of entry.handler === panel ? ['稳定 70/100', '原材料×7', '原每日进度', '原消耗', '原基础效果'] : entry.handler === source ? ['原材料×7', '原实际来源', '原温养规则', '原补给规则'] : entry.handler === path ? ['玄法道', '熟练 80', '原节点效果', '原需求'] : ['原攻击 100', '120', '+20', '原战斗加成说明']) assert.ok(view.text.includes(text), view.text);
  assert.equal(result.messages[0].target?.targetId, isPrivate ? event.UserId : event.ChannelId); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const isPrivate of [false, true]) for (const paths of [[], state.paths.slice(1), state.paths.map(path => ({ ...path, nodes: [] }))]) test(`incomplete path query ${paths.length} private=${isPrivate}`, async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { ...state, paths })); const result = await app.runHandler(path, isPrivate ? app.events.privateMessage({ text: '/元婴道途', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/元婴道途', platform: 'qq-bot' })); const view = inspectMessage(result.messages[0].nodes);
  assert.equal(requests.length, 1); assert.ok(view.text.includes('神魂状态响应不完整')); assert.ok(view.commands.includes('/我的信息')); assert.ok(!view.commands.some(command => /突破|选择道途|切换道途/.test(command))); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const isPrivate of [false, true]) for (const [reason, command, expected] of [
  ['神魂养成维护中，暂不可温养、突破或切换道途，已有进度保留。', '/元婴神魂', '维护期间不反复温养'],
  ['组队匹配中，暂不可进行此操作', '/匹配状态', '不自动取消或离队']
]) test(`loaded soul panel still explains blocked action ${reason} private=${isPrivate}`, async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { ...state, panel: { ...state.panel, actionUnavailable: reason, nurtureUnavailable: reason } }));
  const result = await app.runHandler(panel, isPrivate ? app.events.privateMessage({ text: '/元婴神魂', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/元婴神魂', platform: 'qq-bot' })); const view = inspectMessage(result.messages[0].nodes);
  assert.equal(requests.length, 1); assert.ok(view.text.includes(reason)); assert.ok(view.text.includes(expected)); assert.ok(view.text.includes('原材料×7')); assert.ok(view.commands.includes(command)); assert.ok(!view.commands.some(command => command.startsWith('/神魂温养'))); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
