import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import hide from '../../src/response/skillBook/hide/res';
import show from '../../src/response/skillBook/show/res';
import { unequipBattleSkill, unequipPassiveSkill, unequipMysticSkill } from '../../src/response/skillBook/unequip/res';
import { businessEnvelope, gameFixture } from './fixture';
before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const visibility = [
 { handler: hide, op: 'skill-books.hide', command: '/隐藏功法', args: { bookId: '0002' }, hidden: true },
 { handler: show, op: 'skill-books.show', command: '/显示功法', args: { bookId: '0002' }, hidden: false }
];
const unequips = [
 { handler: unequipBattleSkill, op: 'skill-books.unequip', command: '/换下战技', args: { skillType: '战技' } },
 { handler: unequipPassiveSkill, op: 'skill-books.unequip', command: '/换下被动技', args: { skillType: '被动技' } },
 { handler: unequipMysticSkill, op: 'skill-books.unequip', command: '/换下神通', args: { skillType: '神通' } }
];
const entries = [...visibility, ...unequips];
const noWrites = (commands: string[]) => assert.ok(!commands.some(command => /^\/(?:隐藏功法|显示功法|换下|切换|学习功法|分解功法|解锁)/.test(command)));
for (const entry of entries) for (const isPrivate of [false, true]) for (const wire of ['http', 'feedback', 'structured', 'malformed', 'internal']) test(`${entry.command} recovery ${wire} private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, request => wire === 'http' ? { code: 'CONFLICT', message: '原业务拒绝' } : wire === 'internal' ? { code: 'INTERNAL', message: 'private SQL commit' } : businessEnvelope(request.bid, wire === 'malformed' ? {} : undefined, wire === 'malformed' ? [] : [{ title: '', heading: '原抬头', text: '原业务拒绝', quote: '原引用', blocks: [{ text: '原说明', quoted: true, inlineButtons: [{ label: '原内联', command: '/丹方' }] }], buttons: [{ label: '原返回', command: '/我的功法' }], advice: wire === 'structured' ? [{ command: '/我的信息', description: '原服务建议' }] : [] }]), wire === 'http' ? 409 : wire === 'internal' ? 500 : 200);
 const text = entry.command + (entry.op === 'skill-books.unequip' ? '' : ' 0002');
 const event = isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' });
 const result = await app.runHandler(entry.handler, event); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1); assert.ok(requests[0].path.endsWith('/' + entry.op)); assert.deepEqual(requests[0].body.arguments, entry.args); assert.ok(requests[0].idempotencyKey);
 assert.ok(view.text.includes(wire === 'malformed' || wire === 'internal' ? '未获完整确认' : '原业务拒绝'), view.text); assert.ok(!view.text.includes('private SQL'));
 if (['feedback', 'structured'].includes(wire)) { for (const text of ['原抬头', '原引用', '原说明']) assert.ok(view.text.includes(text)); for (const command of ['/我的功法', '/丹方', '/我']) assert.ok(view.commands.includes(command)); }
 if (wire === 'structured') assert.ok(view.text.includes('原服务建议'));
 noWrites(view.commands); assert.equal(result.messages[0].target?.targetId, isPrivate ? event.UserId : event.ChannelId); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const entry of entries) for (const isPrivate of [false, true]) for (const tail of entry.op === 'skill-books.unequip' ? [' 不确认', ' 确认', ' 2'] : [' 2abc', ' 1.5', ' 1e2', ' 0', ' -1', ' 9007199254740993', ' 2 不确认']) test(`${entry.command}${tail} cannot mutate private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, () => { throw new Error('invalid input must not request'); });
 const text = entry.command + tail; const result = await app.runHandler(entry.handler, isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' }));
 const view = inspectMessage(result.messages[0].nodes); assert.equal(requests.length, 0); assert.ok(view.text.includes('参数错误')); assert.ok(view.commands.includes('/我的功法')); noWrites(view.commands); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const entry of visibility) for (const isPrivate of [false, true]) for (const reason of ['使用中的功法无法隐藏，请先换下后再隐藏', '【太虚诀】已经隐藏', '【太虚诀】已经显示', '找不到ID为 2 的已学功法']) test(`${entry.command} specific refusal ${reason} private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: reason, buttons: [], advice: [] }]));
 const text = entry.command + ' 0002'; const result = await app.runHandler(entry.handler, isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' })); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1); assert.ok(view.text.includes(reason)); assert.ok(view.commands.includes('/我的功法'));
 if (reason.includes('无法隐藏')) assert.ok(view.text.includes('不会自动卸下')); else if (!reason.startsWith('找不到')) { assert.ok(view.text.includes('已达到目标状态无需重复提交')); assert.ok(view.commands.includes('/我的隐藏功法')); }
 noWrites(view.commands); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const entry of unequips) for (const isPrivate of [false, true]) test(`${entry.command} no current skill gives state action private=${isPrivate}`, async t => {
 const reason = `当前没有使用中的${entry.args.skillType}`; const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: reason, buttons: [], advice: [] }]));
 const result = await app.runHandler(entry.handler, isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' })); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1); assert.ok(view.text.includes(reason)); assert.ok(view.text.includes('无需重复换下')); assert.ok(view.commands.includes('/我的功法')); noWrites(view.commands); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const entry of entries) test(`${entry.command} preserves successful state receipt`, async t => {
 const data = entry.op === 'skill-books.unequip' ? { outcome: 'unequipped', skillBook: { name: '太虚诀', skillType: 'skillType' in entry.args ? entry.args.skillType : null } } : { code: 'UPDATED', bookId: 2, name: '太虚诀', isHidden: 'hidden' in entry && entry.hidden, message: '原状态已处理' };
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
 const result = await app.runHandler(entry.handler, app.events.privateMessage({ text: entry.command + (entry.op === 'skill-books.unequip' ? '' : ' 0002'), platform: 'qq-bot' })); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1); assert.ok(view.text.includes(entry.op === 'skill-books.unequip' ? '换下成功' : '原状态已处理')); assert.ok(view.commands.includes('/我的功法')); noWrites(view.commands); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const entry of unequips) for (const invalidType of [false, true]) test(`${entry.command} validates nullable type and rejects mismatch=${invalidType}`, async t => {
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { outcome: 'unequipped', skillBook: { name: null, skillType: invalidType ? '错误类型' : null } }));
 const result = await app.runHandler(entry.handler, app.events.groupMessage({ text: entry.command, platform: 'qq-bot' })); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1); assert.ok(view.text.includes(invalidType ? '未获完整确认' : '未知功法')); assert.ok(!view.text.includes('错误类型')); if (invalidType) assert.ok(!view.text.includes('换下成功')); else assert.ok(view.text.includes(entry.args.skillType)); noWrites(view.commands); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
