import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import info from '../../src/response/soulArtifact/info/res';
import detail from '../../src/response/soulArtifact/detail/res';
import { businessEnvelope, gameFixture } from './fixture';
before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const entries = [{ handler: info, op: 'soul-artifacts.info', text: '/本命物信息', args: {} }, { handler: detail, op: 'soul-artifacts.detail', text: '/本命物详情 9', args: { instanceId: '9' } }];
const artifact = { instanceId: 9, artifactId: 1, name: '原本命物', category: '原类别', positioning: '原定位', gradeId: 2, gradeName: '法器', level: 3, washCount: 2, hasUpgraded: false, isEquipped: true, lockStatus: 0, statusText: '已炼化', washQuality: 'normal', washQualityText: '普通', maxAffixCount: 5, basePanels: [{ key: 'patk', name: '物攻', value: -3 }], panels: [{ key: 'critRate', name: '暴击率', washBonus: 1.25, washCap: 3.5, affixType: 'main', affixTypeName: '主', isPercent: true }], capabilities: [{ kind: 'unequip', available: true, instanceId: 9 }] };
const overview = { items: [artifact], realmLevel: 20, equippedInstanceId: 9, capabilities: [], hasDisplayItems: true };
for (const entry of entries) for (const isPrivate of [false, true]) for (const wire of ['http', 'feedback', 'structured', 'malformed', 'internal']) test(`soul overview ${entry.op} ${wire} private=${isPrivate}`, async t => {
  const { app, requests } = await gameFixture(t, request => wire === 'http' ? { code: 'CONFLICT', message: '原查询拒绝' } : wire === 'internal' ? { code: 'INTERNAL', message: 'private overview SQL' } : businessEnvelope(request.bid, wire === 'malformed' ? {} : undefined, wire === 'malformed' ? [] : [{ title: wire === 'structured' ? '原标题' : '', heading: '原抬头', text: '原查询拒绝', quote: '原引用', blocks: [{ text: '原说明', quoted: true, inlineButtons: [{ label: '原内联', command: '/丹方' }] }], buttons: [{ label: '原返回', command: '/我' }], advice: wire === 'structured' ? [{ command: '/我的信息', description: '原服务建议' }] : [] }]), wire === 'http' ? 409 : wire === 'internal' ? 500 : 200);
  const event = isPrivate ? app.events.privateMessage({ text: entry.text, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.text, platform: 'qq-bot' }); const result = await app.runHandler(entry.handler, event); const view = inspectMessage(result.messages[0].nodes);
  assert.equal(requests.length, 1); assert.ok(requests[0].path.endsWith('/' + entry.op)); assert.deepEqual(requests[0].body.arguments, entry.args); assert.ok(requests[0].idempotencyKey); assert.equal(result.messages.length, 1);
  assert.ok(view.text.includes(wire === 'malformed' || wire === 'internal' ? '未获完整确认' : '原查询拒绝')); assert.ok(!view.text.includes('private overview')); assert.ok(!view.text.includes('可在储物袋中选择本命物进行炼化'));
  if (wire === 'feedback' || wire === 'structured') { for (const text of ['原抬头', '原引用', '原说明']) assert.ok(view.text.includes(text)); for (const command of ['/我', '/丹方']) assert.ok(view.commands.includes(command)); }
  if (wire === 'structured') { assert.ok(view.text.includes('原服务建议')); assert.ok(view.text.includes('原标题')); } else assert.ok(view.commands.includes('/储物袋 本命')); assert.ok(!view.commands.some(command => /^\/(炼化|本命物升级|本命物升品|本命物洗涤|分离)(?:\s|$)/.test(command)));
  assert.equal(result.messages[0].target?.targetId, isPrivate ? event.UserId : event.ChannelId); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const entry of entries) for (const isPrivate of [false, true]) test(`soul overview unchanged facts ${entry.op} private=${isPrivate}`, async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { mode: entry.handler === info ? 'equipped' : 'detail', overview })); const event = isPrivate ? app.events.privateMessage({ text: entry.text, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.text, platform: 'qq-bot' }); const result = await app.runHandler(entry.handler, event); const view = inspectMessage(result.messages[0].nodes);
  assert.equal(requests.length, 1); for (const text of ['原本命物', '等级：3', '物攻：-3', '1.25% / 3.5%', '2 次']) assert.ok(view.text.includes(text), view.text); assert.ok(view.commands.includes('/分离')); assert.equal(result.messages[0].target?.targetId, isPrivate ? event.UserId : event.ChannelId); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
const blockers = [
  ['refine', 'realmTooLow', '/查看主线', '推进主线积累修为'], ['gradeUpgrade', 'listed', '/我的上架', '不会自动下架'], ['gradeUpgrade', 'alreadyUpgraded', '/储物袋 本命', '此实例已升品'], ['gradeUpgrade', 'maxGrade', '/储物袋 本命', '品级上限'], ['upgradeLevel', 'maxLevel', '/我的境界', '未开放更多可升等级'], ['gradeUpgrade', 'materialsInsufficient', '/储物袋 本命', '未装备未锁定且排除目标自身'], ['upgradeLevel', 'itemsInsufficient', '/储物袋 材料 其它', '筑灵石'], ['wash', 'itemsInsufficient', '/储物袋 材料 其它', '洗涤石'], ['wash', 'pendingConfirmation', '/本命物信息', '放弃不返还已用洗涤石'], ['wash', 'serviceUnavailable', '/本命物信息', '服务暂不可用'], ['wash', 'futureReason', '/本命物信息', '暂不可用']
] as const;
for (const entry of entries) for (const isPrivate of [false, true]) for (const [kind, reasonCode, command, text] of blockers) test(`soul blocked ${entry.op} ${kind} ${reasonCode} private=${isPrivate}`, async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { mode: entry.handler === info ? 'equipped' : 'detail', overview: { ...overview, items: [{ ...artifact, capabilities: [{ kind, reasonCode, available: false, instanceId: 9, requiredQuantity: 3, availableQuantity: 0 }] }] } }));
  const result = await app.runHandler(entry.handler, isPrivate ? app.events.privateMessage({ text: entry.text, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.text, platform: 'qq-bot' })); const view = inspectMessage(result.messages[0].nodes);
  assert.equal(requests.length, 1); assert.ok(view.text.includes(text), view.text); assert.ok(view.commands.includes(command)); assert.ok(view.text.includes('原本命物')); assert.ok(!view.commands.some(command => /^\/(炼化|本命物升级|本命物升品|本命物洗涤|分离)(?:\s|$)/.test(command))); if (reasonCode === 'materialsInsufficient') { assert.ok(view.text.includes('需要3')); assert.ok(view.text.includes('可用0')); } assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const isPrivate of [false, true]) for (const mode of ['empty', 'not_equipped']) test(`soul info ${mode} private=${isPrivate}`, async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { mode, overview: { ...overview, items: [], equippedInstanceId: null, hasDisplayItems: mode !== 'empty', capabilities: [{ kind: 'soulPath', available: false, reasonCode: 'realmStageTooLow' }] } })); const event = isPrivate ? app.events.privateMessage({ text: '/我的本命物', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/我的本命物', platform: 'qq-bot' }); const result = await app.runHandler(info, event); const view = inspectMessage(result.messages[0].nodes);
  assert.equal(requests.length, 1); if (mode === 'empty') { assert.ok(view.text.includes('你还没有本命物')); assert.ok(view.commands.includes('/商店 积分')); } else { assert.ok(view.text.includes('当前未炼化本命物')); assert.ok(view.commands.includes('/储物袋 本命')); assert.ok(view.text.includes('当前境界尚未开放')); assert.ok(view.commands.includes('/查看主线')); } assert.equal(result.messages[0].target?.targetId, isPrivate ? event.UserId : event.ChannelId); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const entry of entries) for (const isPrivate of [false, true]) for (const wrong of ['capability', 'levels']) test(`soul contradictory ${entry.op} ${wrong} private=${isPrivate}`, async t => {
  const capability = wrong === 'capability' ? { kind: 'refine', instanceId: 10, available: true } : { kind: 'upgradeLevel', instanceId: 9, available: true, maxLevels: 0, requiredItemId: 1, requiredQuantity: 100, availableQuantity: 100 };
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { mode: entry.handler === info ? 'equipped' : 'detail', overview: { ...overview, items: [{ ...artifact, capabilities: [capability] }] } })); const result = await app.runHandler(entry.handler, isPrivate ? app.events.privateMessage({ text: entry.text, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.text, platform: 'qq-bot' })); const view = inspectMessage(result.messages[0].nodes);
  assert.equal(requests.length, 1); assert.ok(view.text.includes('未获完整确认')); assert.ok(!view.text.includes('当前炼化：')); assert.ok(!view.commands.some(command => /^\/(炼化|本命物升级)\b/.test(command))); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const isPrivate of [false, true]) test(`soul detail wrong result instance private=${isPrivate}`, async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { mode: 'detail', overview: { ...overview, items: [{ ...artifact, instanceId: 10, capabilities: [] }] } })); const result = await app.runHandler(detail, isPrivate ? app.events.privateMessage({ text: '/本命物详情 9', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/本命物详情 9', platform: 'qq-bot' })); assert.equal(requests.length, 1); assert.ok(result.messages[0].text.includes('未获完整确认')); assert.ok(!result.messages[0].text.includes('编号：10')); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const entry of entries) for (const isPrivate of [false, true]) test(`soul attributes split passive from wash ${entry.op} private=${isPrivate}`, async t => {
  const effectiveArtifact = { ...artifact, name: '金刚铃', category: '防御', positioning: '极限肉盾', gradeId: 3, gradeName: '灵器', level: 19, maxAffixCount: 6, capabilities: [...artifact.capabilities, { kind: 'upgradeLevel', available: true, instanceId: 9, maxLevels: 1, requiredItemId: 70, requiredQuantity: 100, availableQuantity: 100 }, { kind: 'wash', available: true, instanceId: 9, maxLevels: 1, requiredItemId: 71, requiredQuantity: 1, availableQuantity: 1 }], basePanels: [{ key: 'patk', name: '物攻', value: 2329.86 }, { key: 'matk', name: '法攻', value: 2329.86 }, { key: 'pdef', name: '物防', value: 1148 }, { key: 'mdef', name: '法防', value: 1148 }, { key: 'hp', name: '生命', value: 9840 }, { key: 'speed', name: '速度', value: 65.6 }], combatPanels: [{ key: 'patk', name: '物攻', value: 2581.86 }, { key: 'speed', name: '速度', value: 80 }], panels: [{ key: 'patk', name: '物攻', washBonus: 21, washCap: 70, affixType: 'sub', affixTypeName: '副', isPercent: false }, { key: 'speed', name: '速度', washBonus: 1.5, washCap: 3.25, affixType: 'main', affixTypeName: '主', isPercent: false }, ...artifact.panels] };
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { mode: entry.handler === info ? 'equipped' : 'detail', overview: { ...overview, realmLevel: 20, items: [effectiveArtifact] } }));
  const event = isPrivate ? app.events.privateMessage({ text: entry.text, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.text, platform: 'qq-bot' });
  const result = await app.runHandler(entry.handler, event);
  assert.equal(result.messages.length, 1); assert.equal(requests.length, 1);
  const view = inspectMessage(result.messages[0].nodes);
  if (!isPrivate) t.diagnostic('ARTIFACT_VALUE_BUBBLE=' + JSON.stringify({ operation: entry.op, text: view.text, commands: view.commands }));
  const base = '基础属性';
  const wash = '词条属性';
  for (const text of [base, '物攻：+2329.86', '速度：+65.6', wash, '已洗值 / 上限', '物攻（副）：21 / 70', '速度（主）：1.5 / 3.25', '暴击率（主）：1.25% / 3.5%']) {
    assert.ok(view.text.includes(text), view.text);
  }
  assert.ok(view.text.indexOf(base) < view.text.indexOf('物攻：+2329.86'));
  assert.ok(view.text.indexOf('速度：+65.6') < view.text.indexOf(wash));
  assert.ok(view.text.indexOf(wash) < view.text.indexOf('速度（主）：1.5 / 3.25'));
  assert.ok(!view.text.includes('物攻：+2581.86'));
  assert.ok(!view.text.includes('当前境界战斗加成'));
  assert.ok(view.text.includes('金刚铃（灵器）'));
  assert.match(view.text, /等级：19[^\\\n]*‹升级›/);
  assert.match(view.text, /词条属性[^\\\n]*‹洗涤›/);
  for (const command of ['/本命物升级', '/本命物洗涤', '/分离', '/储物袋 本命']) {
    assert.equal(view.commands.filter(value => value === command).length, 1, view.text);
  }
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
