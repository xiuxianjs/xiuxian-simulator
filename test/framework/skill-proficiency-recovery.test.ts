import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import proficiency from '../../src/response/skillBook/proficiency/res';
import { businessEnvelope, gameFixture } from './fixture';
before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const receipt = { outcome: 'ok', skillBookName: '青莲剑诀', consumedPoints: 3, oldProficiency: 60, newProficiency: 61, remainingPoints: 2, successCount: 1, failCount: 2, pityTriggered: false };
const noWrites = (commands: string[]) => assert.ok(!commands.some(command => /^\/(?:参悟|解锁|分解功法|学习功法)\s/.test(command)));
for (const isPrivate of [false, true]) for (const wire of ['http', 'feedback', 'structured', 'malformed', 'internal']) test(`proficiency recovery ${wire} private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, request => wire === 'http' ? { code: 'CONFLICT', message: '原参悟拒绝' } : wire === 'internal' ? { code: 'INTERNAL', message: 'private points SQL' } : businessEnvelope(request.bid, wire === 'malformed' ? {} : undefined, wire === 'malformed' ? [] : [{ title: '', heading: '原抬头', text: '原参悟拒绝', quote: '原引用', blocks: [{ text: '原说明', quoted: true, inlineButtons: [{ label: '原内联', command: '/丹方' }] }], buttons: [{ label: '原返回', command: '/我的功法' }], advice: wire === 'structured' ? [{ command: '/我的信息', description: '原服务建议' }] : [] }]), wire === 'http' ? 409 : wire === 'internal' ? 500 : 200);
 const event = isPrivate ? app.events.privateMessage({ text: '/参悟 青莲 剑诀 所有', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/参悟 青莲 剑诀 所有', platform: 'qq-bot' });
 const result = await app.runHandler(proficiency, event); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1); assert.ok(requests[0].path.endsWith('/skill-books.proficiency')); assert.deepEqual(requests[0].body.arguments, { tokens: ['青莲', '剑诀', '所有'] }); assert.ok(requests[0].idempotencyKey);
 assert.ok(view.text.includes(wire === 'malformed' || wire === 'internal' ? '未获完整确认' : '原参悟拒绝')); assert.ok(!view.text.includes('private points'));
 if (wire === 'feedback' || wire === 'structured') { for (const text of ['原抬头', '原引用', '原说明']) assert.ok(view.text.includes(text)); for (const command of ['/我的功法', '/丹方', '/我']) assert.ok(view.commands.includes(command)); }
 if (wire === 'structured') assert.ok(view.text.includes('原服务建议'));
 noWrites(view.commands); assert.equal(result.messages[0].target?.targetId, isPrivate ? event.UserId : event.ChannelId); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const isPrivate of [false, true]) for (const points of ['1.5', '2abc', '1e2', '0x2', '0', '-1', '9007199254740993', '不确认']) test(`proficiency rejects ambiguous spend ${points} private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, () => { throw new Error('invalid spend must not request'); }); const text = `/参悟 2 ${points}`;
 const result = await app.runHandler(proficiency, isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' })); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 0); assert.ok(view.text.includes('完整正整数')); assert.ok(view.commands.includes('/我的功法')); noWrites(view.commands); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const isPrivate of [false, true]) for (const reason of ['当前熟练点不足，无法完成参悟操作。', '该功法熟练度已达圆满，无法继续提升。', '找不到功法「旧编号」，请使用 /我的功法 查看可用功法', '您还没有已学习的功法']) test(`proficiency specific refusal ${reason} private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: reason, buttons: reason.includes('熟练点不足') ? [{ label: '原比试', command: '/比试' }, { label: '原明悟', command: '/服用 明悟丹 1' }] : [], advice: [] }]));
 const text = '/参悟 2 全部'; const result = await app.runHandler(proficiency, isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' })); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1); assert.ok(view.text.includes(reason)); assert.ok(view.commands.includes('/我的功法')); noWrites(view.commands);
 if (reason.includes('熟练点不足')) { assert.ok(view.commands.includes('/比试')); assert.ok(view.commands.includes('/服用 明悟丹 1')); assert.ok(view.text.includes('最多至60%，不会补充熟练点')); }
 if (reason.includes('圆满')) assert.ok(view.text.includes('无需继续投入熟练点'));
 assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const isPrivate of [false, true]) for (const state of ['partial', 'pity', 'full', 'no-points', 'omitted-zero']) test(`proficiency keeps actual settlement ${state} private=${isPrivate}`, async t => {
 const data = state === 'pity' ? { ...receipt, oldProficiency: 95, newProficiency: 96, consumedPoints: 7, failCount: 6, pityTriggered: true } : state === 'full' ? { ...receipt, oldProficiency: 99, newProficiency: 100, consumedPoints: 1, failCount: 0 } : state === 'no-points' ? { ...receipt, remainingPoints: 0 } : state === 'omitted-zero' ? { outcome: 'ok', consumedPoints: 1, newProficiency: 1, successCount: 1, remainingPoints: 2 } : receipt;
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data)); const requestedPoints = state === 'pity' ? '0007' : state === 'omitted-zero' ? '0001' : '0003'; const text = `/参悟 青莲 剑诀 ${requestedPoints}`;
 const result = await app.runHandler(proficiency, isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' })); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1); assert.deepEqual(requests[0].body.arguments, { tokens: ['青莲', '剑诀', requestedPoints] });
 assert.ok(view.text.includes(`消耗熟练点: ${data.consumedPoints}`)); assert.ok(view.text.includes(`剩余熟练点: ${data.remainingPoints}`)); assert.ok(view.text.includes('参悟完成'));
 if (state === 'pity') { assert.ok(view.text.includes('本次触发过保底成功')); assert.ok(!view.text.includes('下次必成功')); }
 if (state === 'full' || state === 'no-points') { noWrites(view.commands); assert.ok(view.commands.includes('/我的功法')); if (state === 'full') assert.ok(view.text.includes('100%')); else assert.ok(view.commands.includes('/比试')); }
 else { assert.ok(view.commands.includes('/参悟 青莲 剑诀 1')); assert.ok(view.commands.includes('/参悟 青莲 剑诀 全部')); }
 assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const isPrivate of [false, true]) for (const patch of [{ consumedPoints: -1 }, { consumedPoints: 9007199254740992 }, { successCount: 5 }, { failCount: -1 }, { newProficiency: 101 }, { newProficiency: 59 }, { newProficiency: 62 }, { remainingPoints: -1 }]) test(`proficiency inconsistent settlement ${JSON.stringify(patch)} private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { ...receipt, ...patch })); const text = '/参悟 2 3';
 const result = await app.runHandler(proficiency, isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' })); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1); assert.ok(view.text.includes('未获完整确认')); assert.ok(!view.text.includes('参悟完成')); noWrites(view.commands); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const text of ['/参悟', '/参悟 青莲', '/参悟 2 所有', '/参悟 青莲 剑诀 全部']) test(`proficiency original usage and all alias ${text}`, async t => {
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: '使用方法：原服务用法', buttons: [], advice: [] }]));
 const result = await app.runHandler(proficiency, app.events.groupMessage({ text, platform: 'qq-bot' })); assert.equal(requests.length, 1); assert.deepEqual(requests[0].body.arguments, { tokens: text.slice(3).trim() ? text.slice(3).trim().split(/\s+/) : [] }); assert.ok(result.messages[0].text.includes('原服务用法')); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
