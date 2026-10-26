import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import learned from '../../src/response/skillBook/mySkillBooks/res';
import hidden from '../../src/response/skillBook/hidden/res';
import { businessEnvelope, gameFixture } from './fixture';
before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const entries = [{ handler: learned, op: 'skill-books.learned', command: '/我的功法', first: '/我的功法 2' }, { handler: hidden, op: 'skill-books.hidden', command: '/我的隐藏功法', first: '/我的隐藏功法 1' }];
const numbers = ['upgradeCount', 'physicalAttack', 'magicAttack', 'physicalDefense', 'magicDefense', 'hp', 'physicalAttackPercent', 'magicAttackPercent', 'physicalDefensePercent', 'magicDefensePercent', 'hpPercent', 'speed', 'critRate', 'critDamage', 'maxPhysicalAttack', 'maxMagicAttack', 'maxPhysicalDefense', 'maxMagicDefense', 'maxHp', 'maxPhysicalAttackPercent', 'maxMagicAttackPercent', 'maxPhysicalDefensePercent', 'maxMagicDefensePercent', 'maxHpPercent', 'maxSpeed', 'maxCritRate', 'maxCritDamage'];
const book = { ...Object.fromEntries(numbers.map(key => [key, 0])), id: 2, name: '青莲诀', skillType: '战技', damageType: null, status: 2, statusText: '已学', listText: '原功法文本 物攻-3', slotText: '原槽位文本', attributeSummary: '原属性-3', canHide: true, canReset: true, isHidden: 0, proficiency: 65, physicalAttack: -3 };
const page = { items: [], inUseBooks: [], total: 0, totalPages: 1, currentPage: 1, pageSize: 5, proficiencyPoints: 7, canUseFifthLayerFeature: false };
const noWrites = (values: string[]) => assert.ok(!values.some(command => /^\/(?:隐藏功法|显示功法|学习功法|参悟|一键学习功法)(?:\s|$)|^\/换下/.test(command)));
for (const entry of entries) for (const isPrivate of [false, true]) for (const wire of ['http', 'feedback', 'structured', 'malformed', 'internal']) test(`${entry.command} query recovery ${wire} private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, request => wire === 'http' ? { code: 'CONFLICT', message: '原列表拒绝' } : wire === 'internal' ? { code: 'INTERNAL', message: 'private list SQL' } : businessEnvelope(request.bid, wire === 'malformed' ? {} : undefined, wire === 'malformed' ? [] : [{ title: '', heading: '原抬头', text: '原列表拒绝', quote: '原引用', blocks: [{ text: '原说明', quoted: true, inlineButtons: [{ label: '原内联', command: '/丹方' }] }], buttons: [{ label: '原返回', command: '/属性面板' }], advice: wire === 'structured' ? [{ command: '/我的信息', description: '原服务建议' }] : [] }]), wire === 'http' ? 409 : wire === 'internal' ? 500 : 200);
 const text = entry.command + ' 0002'; const event = isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' }); const result = await app.runHandler(entry.handler, event); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1); assert.ok(requests[0].path.endsWith('/' + entry.op)); assert.deepEqual(requests[0].body.arguments, { page: '0002' }); assert.ok(requests[0].idempotencyKey);
 assert.ok(view.text.includes(wire === 'malformed' || wire === 'internal' ? '未获完整确认' : '原列表拒绝')); assert.ok(!view.text.includes('private list'));
 if (wire === 'feedback' || wire === 'structured') { for (const text of ['原抬头', '原引用', '原说明']) assert.ok(view.text.includes(text)); for (const command of ['/属性面板', '/丹方', '/我']) assert.ok(view.commands.includes(command)); }
 if (wire === 'structured') assert.ok(view.text.includes('原服务建议')); else { assert.ok(view.commands.includes('/我的功法')); assert.ok(view.commands.includes('/我的隐藏功法')); }
 noWrites(view.commands); assert.ok(!view.commands.includes('/一键学习功法')); assert.equal(result.messages[0].target?.targetId, isPrivate ? event.UserId : event.ChannelId); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const entry of entries) for (const isPrivate of [false, true]) for (const state of ['empty', 'empty-later', 'bounds', 'list']) test(`${entry.command} ${state} recovery private=${isPrivate}`, async t => {
 const hiddenList = entry.op === 'skill-books.hidden'; const displayPage = state === 'bounds' ? 99 : state === 'empty-later' ? 8 : state === 'list' && !hiddenList ? 2 : 1;
 const data = { displayPage, page: { ...page, currentPage: hiddenList ? displayPage : Math.max(1, displayPage - 1), total: state === 'bounds' ? 12 : state === 'list' ? 1 : 0, totalPages: state === 'bounds' ? 3 : 1, items: state === 'list' ? [{ ...book, isHidden: hiddenList ? 1 : 0 }] : [] } };
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data)); const text = entry.command + ' ' + displayPage;
 const event = isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' }); const result = await app.runHandler(entry.handler, event); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1); assert.deepEqual(requests[0].body.arguments, { page: String(displayPage) });
 if (state === 'bounds') { assert.ok(view.text.includes('页码超出范围')); assert.ok(view.commands.includes(entry.first)); assert.ok(view.text.includes(hiddenList ? '隐藏列表从第1页开始' : '实例列表从第2页开始')); assert.ok(!view.commands.some(command => /\/(?:显示功法|升级功法)\s/.test(command))); }
 else if (state.startsWith('empty')) { assert.ok(view.text.includes(hiddenList ? '暂无隐藏功法' : '暂无已学习的功法')); assert.ok(view.commands.includes(hiddenList ? '/我的功法' : '/我的隐藏功法')); assert.ok(view.text.includes(hiddenList ? '隐藏列表为空不代表功法丢失' : '可见列表为空不等于没有已学实例')); }
 else { assert.ok(view.text.includes('原功法文本 物攻-3')); assert.ok(view.commands.includes('/查看功法 2')); assert.ok(view.commands.includes(hiddenList ? '/显示功法 2' : '/升级功法 2 选择')); if (!hiddenList) assert.ok(view.text.includes('原属性-3')); }
 assert.equal(result.messages[0].target?.targetId, isPrivate ? event.UserId : event.ChannelId); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const isPrivate of [false, true]) for (const displayPage of [1, 8]) test(`visible empty list retains hidden equipped slot page=${displayPage} private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { displayPage, page: { ...page, inUseBooks: [{ ...book, status: 3, isHidden: 1 }] } })); const text = '/我的功法 ' + displayPage;
 const result = await app.runHandler(learned, isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' })); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1); assert.ok(view.text.includes('原槽位文本')); assert.ok(view.text.includes('当前可见列表为空')); assert.ok(!view.text.includes('暂无已学习的功法')); assert.ok(view.commands.includes('/我的隐藏功法')); assert.ok(view.commands.includes('/查看功法 2')); assert.ok(view.text.includes('持有熟练点：7')); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const entry of entries) for (const raw of ['2abc', '2.5', '0', 'bad']) test(`${entry.command} original read-only page parsing remains ${raw}`, async t => {
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: '原页码反馈', buttons: [], advice: [] }]));
 const result = await app.runHandler(entry.handler, app.events.groupMessage({ text: entry.command + ' ' + raw + ' 多余', platform: 'qq-bot' })); assert.equal(requests.length, 1); assert.deepEqual(requests[0].body.arguments, { page: raw }); assert.ok(result.messages[0].text.includes('原页码反馈')); noWrites(inspectMessage(result.messages[0].nodes).commands); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
