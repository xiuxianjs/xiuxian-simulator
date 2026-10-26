import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import wudao from '../../src/response/skillBook/wudao/res';
import { businessEnvelope, gameFixture } from './fixture';
before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const option = { key: 'physicalAttack', label: '物理攻击', isPercent: false, currentMax: 50, templateMax: 100, currentMaxText: '50', templateMaxText: '100' };
const options = { skillBookId: 2, skillBookName: '青莲诀', ownedStones: 2, status: 'ready', message: '', options: [option] };
const resultData = { skillBookId: 2, skillBookName: '青莲诀', key: option.key, label: option.label, isPercent: false, oldMax: 50, newMax: 100, templateMax: 100, growth: 50, remaining: 1, growthText: '50', newMaxText: '100', templateMaxText: '100' };
const spends = (command: string) => /^[/!！#＃]?悟道\s+\S+\s+\S/.test(command.trim());
for (const isPrivate of [false, true]) for (const label of ['', '物理攻击']) for (const wire of ['http', 'feedback', 'structured', 'malformed', 'internal']) test(`wudao ${label || 'options'} recovery ${wire} private=${isPrivate}`, async t => {
 const reason = '原悟道拒绝'; const { app, requests } = await gameFixture(t, request => wire === 'http' ? { code: 'CONFLICT', message: reason } : wire === 'internal' ? { code: 'INTERNAL', message: 'private stone SQL' } : businessEnvelope(request.bid, wire === 'malformed' ? {} : undefined, wire === 'malformed' ? [] : [{ title: '', heading: '原抬头', text: reason, quote: '原引用', blocks: [{ text: '原说明', quoted: true, inlineButtons: [{ label: '原内联', command: '/丹方' }, { label: '危险重放', command: '/悟道 2 物理攻击' }] }], buttons: [{ label: '原返回', command: '/我的功法' }, { label: '原属性', command: '/悟道 2 物理攻击' }], advice: wire === 'structured' ? [{ command: '/我的信息', description: '原服务建议' }, { command: '/悟道 2 物理攻击', description: '不要重放此写入建议' }] : [] }]), wire === 'http' ? 409 : wire === 'internal' ? 500 : 200);
 const text = '/悟道 0002' + (label ? ' ' + label : ''); const event = isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' });
 const result = await app.runHandler(wudao, event); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1); assert.ok(requests[0].path.endsWith('/skill-books.wudao')); assert.deepEqual(requests[0].body.arguments, { bookId: '0002', label }); assert.ok(requests[0].idempotencyKey);
 assert.ok(view.text.includes(wire === 'malformed' || wire === 'internal' ? '未获完整确认' : reason)); assert.ok(!view.text.includes('private stone')); assert.ok(!view.text.includes('不要重放此写入建议'));
 if (wire === 'feedback' || wire === 'structured') { for (const text of ['原抬头', '原引用', '原说明']) assert.ok(view.text.includes(text)); for (const command of ['/我的功法', '/丹方', '/我']) assert.ok(view.commands.includes(command)); }
 if (wire === 'structured') assert.ok(view.text.includes('原服务建议'));
 assert.ok(view.commands.includes('/悟道 0002')); assert.ok(view.text.includes('只读取当前候选，不消耗悟道石')); assert.ok(!view.commands.some(spends));
 assert.equal(result.messages[0].target?.targetId, isPrivate ? event.UserId : event.ChannelId); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const isPrivate of [false, true]) for (const text of ['/悟道 2abc 物理攻击', '/悟道 2.5 物理攻击', '/悟道 2e3', '/悟道 0', '/悟道 9007199254740993 生命', '/悟道 2 生命 不确认']) test(`wudao ambiguous input ${text} private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, () => { throw new Error('ambiguous input must not request'); });
 const result = await app.runHandler(wudao, isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' })); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 0); assert.ok(view.text.includes('参数错误')); assert.ok(view.commands.includes('/我的功法')); assert.ok(!view.commands.some(spends)); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const isPrivate of [false, true]) for (const reason of ['缺少道具：悟道石', '悟道石不足。', '【青莲诀】已无可悟道的属性', '该属性已达到模板约定上限。', '该属性当前值为0，无法悟道。', '未知属性：其他；可选：物理攻击', '系统未配置【悟道石】道具，请联系运营。']) test(`wudao specific refusal ${reason} private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{ title: '', heading: '悟道', text: reason, buttons: [{ label: '原属性', command: '/悟道 2 物理攻击' }], advice: [] }])); const text = '/悟道 2 其他';
 const result = await app.runHandler(wudao, isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' })); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1); assert.ok(view.text.includes(reason)); assert.ok(view.commands.includes('/悟道 2')); assert.ok(!view.commands.some(spends));
 if (reason === '缺少道具：悟道石' || reason === '悟道石不足。') { assert.ok(view.commands.includes('/珍宝楼')); assert.ok(view.text.includes('不保证当前有货')); }
 if (/已无可悟道|模板约定|当前值为0/.test(reason)) assert.ok(view.text.includes('不以提升人物境界或补石代替模板上限'));
 if (reason.startsWith('系统未配置')) { assert.ok(!view.commands.includes('/珍宝楼')); assert.ok(view.text.includes('异常不证明缺石或未消耗')); }
 assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
const malformedCases = [
 { label: '', data: {} }, { label: '', data: { bookId: 3, options, result: null } }, { label: '', data: { bookId: 2, options: { ...options, skillBookId: 3 }, result: null } },
 { label: '', data: { bookId: 2, options: { ...options, ownedStones: .5 }, result: null } }, { label: '', data: { bookId: 2, options: { ...options, options: [] }, result: null } },
 { label: '', data: { bookId: 2, options: { ...options, options: [{ ...option, currentMax: 100 }] }, result: null } }, { label: '', data: { bookId: 2, options, result: resultData } },
 ...[{ skillBookId: 3 }, { label: '生命' }, { key: 'bad' }, { remaining: .5 }, { growth: 0 }, { newMax: 101 }, { newMax: 50 }].map(patch => ({ label: '物理攻击', data: { bookId: 2, options, result: { ...resultData, ...patch } } }))
];
for (const isPrivate of [false, true]) for (const [index, scenario] of malformedCases.entries()) test(`wudao contradictory result ${index} private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, scenario.data)); const text = '/悟道 2' + (scenario.label ? ' ' + scenario.label : '');
 const result = await app.runHandler(wudao, isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' })); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1); assert.ok(view.text.includes('未获完整确认')); assert.ok(!view.text.includes('悟道成功')); assert.ok(!view.commands.some(spends)); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const isPrivate of [false, true]) for (const state of ['options', 'cap', 'partial', 'percent-empty']) test(`wudao authoritative ${state} private=${isPrivate}`, async t => {
 const percent = state === 'percent-empty';
 const selectedOption = percent ? { ...option, key: 'critRate', label: '暴击率', isPercent: true, currentMax: .95, templateMax: 1, currentMaxText: '0.95', templateMaxText: '1' } : state === 'partial' ? { ...option, templateMax: 150, templateMaxText: '150' } : option;
 const prepared = { ...options, ownedStones: percent ? 1 : 2, options: [selectedOption] };
 const settled = percent ? { ...resultData, key: 'critRate', label: '暴击率', isPercent: true, oldMax: .95, newMax: 1, templateMax: 1, growth: .05, remaining: 0, growthText: '0.05', newMaxText: '1', templateMaxText: '1' } : state === 'partial' ? { ...resultData, templateMax: 150, templateMaxText: '150' } : resultData;
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { bookId: 2, options: prepared, result: state === 'options' ? null : settled })); const text = '/悟道 0002' + (state === 'options' ? '' : ' ' + selectedOption.label);
 const event = isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' }); const result = await app.runHandler(wudao, event); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1); assert.deepEqual(requests[0].body.arguments, { bookId: '0002', label: state === 'options' ? '' : selectedOption.label });
 if (state === 'options') { assert.ok(view.text.includes('选择属性后消耗悟道石×1')); assert.ok(view.text.includes('悟道石 x1')); assert.ok(view.commands.includes('/悟道 2 物理攻击')); assert.ok(!view.text.includes('悟道成功')); }
 else { assert.ok(view.text.includes('悟道成功')); assert.ok(view.text.includes(`上限提升：+${settled.growthText}${percent ? '%' : ''}`)); assert.ok(view.text.includes(`当前上限：${settled.newMaxText}${percent ? '%' : ''} / ${settled.templateMaxText}${percent ? '%' : ''}`)); assert.ok(view.text.includes(`剩余悟道石：${settled.remaining}`)); assert.ok(!view.commands.some(spends)); assert.ok(view.commands.includes('/查看功法 2')); if (percent) { assert.ok(view.commands.includes('/珍宝楼')); assert.ok(JSON.stringify(result.messages[0].nodes).includes('核对悟道条件')); } }
 assert.equal(result.messages[0].target?.targetId, isPrivate ? event.UserId : event.ChannelId); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
test('wudao missing arguments keep original usage request', async t => {
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: '原悟道用法', buttons: [], advice: [] }])); const result = await app.runHandler(wudao, app.events.groupMessage({ text: '/悟道', platform: 'qq-bot' }));
 assert.equal(requests.length, 1); assert.deepEqual(requests[0].body.arguments, { bookId: null, label: '' }); assert.ok(result.messages[0].text.includes('原悟道用法')); assert.ok(!inspectMessage(result.messages[0].nodes).commands.some(command => command.startsWith('/悟道 '))); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
