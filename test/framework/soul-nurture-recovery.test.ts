import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import nurture from '../../src/response/soulPath/nurture/res';
import supply from '../../src/response/soulPath/supply/res';
import { businessEnvelope, gameFixture } from './fixture';
before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const entries = [{ handler: nurture, op: 'soul-path.nurture', text: '/神魂温养 定魂', input: '定魂' }, { handler: supply, op: 'soul-path.supply', text: '/神魂补给 自动', input: '自动' }];
const noWrites = (commands: string[]) => assert.ok(!commands.some(command => /^\/(?:神魂温养|神魂补给|确认神魂|选择道途|切换道途|道途突破)(?:\s|$)/.test(command)));
const receipt = { direction: 'ding_hun', directionName: '定魂', tier: 'steady', tierName: '稳进', stabilityBefore: 50, stabilityAfter: 60, insightGained: 6, proficiencyGained: 4, extraItems: [], dailyNurtureCount: 1, dailyNurtureLimit: 3, dailyNurtureProgressText: '原每日次数1/3', usedMonthCardExtra: false, rerollable: false };
for (const entry of entries) for (const isPrivate of [false, true]) for (const wire of ['http', 'feedback', 'structured', 'malformed', 'internal']) test(`${entry.op} ${wire} recovery private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, request => wire === 'http' ? { code: 'CONFLICT', message: '原神魂拒绝' } : wire === 'internal' ? { code: 'INTERNAL', message: 'private soul SQL' } : businessEnvelope(request.bid, wire === 'malformed' ? {} : undefined, wire === 'malformed' ? [] : [{ title: '', heading: '原抬头', text: '原神魂拒绝', quote: '原引用', blocks: [{ text: '原说明', quoted: true, inlineButtons: [{ label: '原内联', command: '/丹方' }] }], buttons: [{ label: '原返回', command: '/元婴神魂' }], advice: wire === 'structured' ? [{ command: '/我的信息', description: '原服务建议' }] : [] }]), wire === 'http' ? 409 : wire === 'internal' ? 500 : 200);
 const event = isPrivate ? app.events.privateMessage({ text: entry.text, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.text, platform: 'qq-bot' }); const result = await app.runHandler(entry.handler, event); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1); assert.ok(requests[0].path.endsWith('/' + entry.op)); assert.deepEqual(requests[0].body.arguments, { input: entry.input }); assert.ok(requests[0].idempotencyKey);
 assert.ok(view.text.includes(wire === 'malformed' || wire === 'internal' ? '未获完整确认' : '原神魂拒绝')); assert.ok(!view.text.includes('private soul'));
 if (wire === 'feedback' || wire === 'structured') { for (const text of ['原抬头', '原引用', '原说明']) assert.ok(view.text.includes(text)); for (const command of ['/元婴神魂', '/丹方']) assert.ok(view.commands.includes(command)); }
 if (wire === 'structured') assert.ok(view.text.includes('原服务建议')); else assert.ok(view.commands.includes('/神魂材料来源'));
 noWrites(view.commands); assert.equal(result.messages[0].target?.targetId, isPrivate ? event.UserId : event.ChannelId); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const isPrivate of [false, true]) for (const [reason, command, text] of [
 ['元婴期及以上方可温养神魂、选择道途', '/查看主线', '挑战主线获取修为'],
 ['请先选择道途，再开始温养神魂', '/元婴道途', '不代选或跳过确认'],
 ['今日基础温养次数已用尽。月卡或VIP6可额外进行1次低风险温养', '/元婴神魂', '不根据旧按钮推断额外次数'],
 ['出窍只能使用每日基础温养次数，今日次数已用尽', '/神魂材料来源', '不自动继续消耗'],
 ['神魂稳定不足30，无法贸然出窍。请先定魂', '/元婴神魂', '定魂也会消耗材料和次数'],
 ['神魂养成维护中，暂不可温养、突破或切换道途，已有进度保留', '/元婴神魂', '维护期间不反复温养'],
 ['你正在组队匹配或匹配副本队伍中，结束匹配后方可调整神魂与道途', '/匹配状态', '不自动取消或离队']
]) test(`soul nurture specific ${reason} private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: reason, buttons: [], advice: [] }]));
 const result = await app.runHandler(nurture, isPrivate ? app.events.privateMessage({ text: entries[0].text, platform: 'qq-bot' }) : app.events.groupMessage({ text: entries[0].text, platform: 'qq-bot' })); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1); assert.ok(view.text.includes(reason)); assert.ok(view.text.includes(text), view.text); assert.ok(view.commands.includes(command)); noWrites(view.commands); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const isPrivate of [false, true]) for (const count of [1, 3, 4]) for (const rerollable of [false, true]) test(`nurture actual result count=${count} reroll=${rerollable} private=${isPrivate}`, async t => {
 const data = { ...receipt, dailyNurtureCount: count, usedMonthCardExtra: count > 3, dailyNurtureProgressText: `原每日次数${count}/3`, rerollable, extraItems: [{ name: '原额外材料', quantity: 2 }] };
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data)); const event = isPrivate ? app.events.privateMessage({ text: entries[0].text, platform: 'qq-bot' }) : app.events.groupMessage({ text: entries[0].text, platform: 'qq-bot' }); const result = await app.runHandler(nurture, event); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1); for (const text of ['稳定 50 → 60', '感悟 +6 · 熟练 +4', '原额外材料×2', data.dailyNurtureProgressText]) assert.ok(view.text.includes(text));
 assert.equal(view.commands.includes('/神魂重选'), rerollable); if (count >= 3) { noWrites(view.commands); assert.ok(view.commands.includes('/神魂材料来源')); assert.ok(view.text.includes('基础次数和额外低风险资格分别核对')); } else assert.ok(view.commands.includes('/神魂温养 定魂'));
 assert.equal(result.messages[0].target?.targetId, isPrivate ? event.UserId : event.ChannelId); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const isPrivate of [false, true]) for (const direction of [null, 'wu_dao']) for (const today of [false, true]) test(`supply displays actual setting direction=${direction} today=${today} private=${isPrivate}`, async t => {
 const message = `日补给方向：${direction ? '悟道' : '自动'}。${today ? '今日已领，将用于下个结算日的补给' : '将用于下一次符合条件的秘境日补给'}。仅调整材料种类，不追加领取次数。`;
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { direction, directionName: direction ? '悟道' : '自动', message })); const text = '/神魂补给 ' + (direction ? '悟道' : '自动'); const event = isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' }); const result = await app.runHandler(supply, event); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1); assert.deepEqual(requests[0].body.arguments, { input: direction ? '悟道' : '自动' }); assert.ok(view.text.includes(message)); assert.ok(!view.text.includes('领取成功')); noWrites(view.commands); assert.equal(result.messages[0].target?.targetId, isPrivate ? event.UserId : event.ChannelId); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const entry of entries) for (const input of ['', '不存在', '定魂 不确认', '自动 额外']) test(`${entry.op} invalid direction preserves server usage ${input}`, async t => {
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: '原服务方向用法', buttons: [], advice: [] }])); const text = entry.text.split(' ')[0] + (input ? ' ' + input : '');
 const result = await app.runHandler(entry.handler, app.events.groupMessage({ text, platform: 'qq-bot' })); if (entry.handler === supply && !input) { assert.equal(requests.length, 0); assert.ok(result.messages[0].text.includes('选择后续补给方向')); return; } assert.equal(requests.length, 1); assert.deepEqual(requests[0].body.arguments, { input }); assert.ok(result.messages[0].text.includes('原服务方向用法')); noWrites(inspectMessage(result.messages[0].nodes).commands); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const isPrivate of [false, true]) for (const count of [0, -1, 9007199254740992]) test(`invalid nurture count ${count} private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { ...receipt, dailyNurtureCount: count })); const result = await app.runHandler(nurture, isPrivate ? app.events.privateMessage({ text: entries[0].text, platform: 'qq-bot' }) : app.events.groupMessage({ text: entries[0].text, platform: 'qq-bot' })); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1); assert.ok(view.text.includes('未获完整确认')); noWrites(view.commands); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
test('empty supply success text becomes unconfirmed instead of a blank bubble', async t => {
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { direction: null, directionName: '自动', message: '' })); const result = await app.runHandler(supply, app.events.groupMessage({ text: entries[1].text, platform: 'qq-bot' })); assert.equal(requests.length, 1); assert.ok(result.messages[0].text.includes('未获完整确认')); noWrites(inspectMessage(result.messages[0].nodes).commands); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
