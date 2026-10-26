import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import info from '../../src/response/caveFormation/info/res';
import activate from '../../src/response/caveFormation/activate/res';
import remove from '../../src/response/caveFormation/remove/res';
import { businessEnvelope, gameFixture } from './fixture';
before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const entries = [{ handler: info, op: 'cave-formations.list', text: '/洞府阵法', args: {} }, { handler: activate, op: 'cave-formations.activate', text: '/激活阵盘 隐息阵盘', args: { keyword: '隐息阵盘' } }, { handler: remove, op: 'cave-formations.remove', text: '/移除阵法 停时阵', args: { keyword: '停时阵' } }];
const noWrite = (commands: string[]) => assert.ok(!commands.some(command => /^\/(激活阵盘|移除阵法)(?:\s|$)/.test(command)));
for (const entry of entries) for (const isPrivate of [false, true]) for (const wire of ['http', 'feedback', 'structured', 'malformed', 'internal']) test(`formation ${entry.op} ${wire} private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, request => wire === 'http' ? { code: 'CONFLICT', message: '原阵法拒绝' } : wire === 'internal' ? { code: 'INTERNAL', message: 'private formation SQL' } : businessEnvelope(request.bid, wire === 'malformed' ? {} : undefined, wire === 'malformed' ? [] : [{ title: '原标题', heading: '原抬头', text: '原阵法拒绝', quote: '原引用', blocks: [{ text: '原说明', quoted: true, inlineButtons: [{ label: '原内联', command: '/灵田' }] }], buttons: [{ label: '原返回', command: '/洞府阵法' }], advice: wire === 'structured' ? [{ command: '/我的信息', description: '原服务建议' }] : [] }]), wire === 'http' ? 409 : wire === 'internal' ? 500 : 200);
 const event = isPrivate ? app.events.privateMessage({ text: entry.text, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.text, platform: 'qq-bot' }); const result = await app.runHandler(entry.handler, event); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1); assert.ok(requests[0].path.endsWith('/' + entry.op)); assert.deepEqual(requests[0].body.arguments, entry.args); assert.ok(requests[0].idempotencyKey); assert.equal(result.messages.length, 1); assert.ok(view.text.includes(wire === 'malformed' || wire === 'internal' ? entry.handler === info ? '获取洞府阵法失败' : '未获完整确认' : '原阵法拒绝')); assert.ok(!view.text.includes('private formation'));
 if (wire === 'feedback' || wire === 'structured') { for (const text of ['原标题', '原抬头', '原引用', '原说明']) assert.ok(view.text.includes(text)); for (const command of ['/灵田', '/洞府阵法']) assert.ok(view.commands.includes(command)); }
 if (wire === 'structured') assert.ok(view.text.includes('原服务建议')); else assert.ok(view.commands.includes('/储物袋 道具 其它 洞府阵法')); noWrite(view.commands); assert.equal(result.messages[0].target?.targetId, isPrivate ? event.UserId : event.ChannelId); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const isPrivate of [false, true]) for (const [handler, op, text, reason, expectedCommand, expectedText] of [
 [activate, 'cave-formations.activate', '/激活阵盘', '用法：/激活阵盘 阵盘名称\n示例：/激活阵盘 隐息阵盘', '/储物袋 道具 其它 洞府阵法', '不代选默认阵盘'],
 [activate, 'cave-formations.activate', '/激活阵盘 隐息阵盘', '你当前没有【隐息阵盘】，可前往 /商店 万宝楼 购买。', '/商店 万宝楼', '持续时间不与旧阵叠加'],
 [activate, 'cave-formations.activate', '/激活阵盘 灵肥', '【灵肥】不是可激活的阵盘。', '/储物袋 道具 其它 洞府阵法', '阵盘完整名称或模板编号'],
 [remove, 'cave-formations.remove', '/移除阵法', '用法：/移除阵法 阵法名称\n示例：/移除阵法 冻结阵盘', '/洞府阵法', '移除不会返还已用阵盘'],
 [remove, 'cave-formations.remove', '/移除阵法 冻结', '当前没有生效中的【冻结阵】可移除', '/洞府阵法', '已失效或已移除时无需重复移除']
] as const) test(`formation recovery ${reason} private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: reason, buttons: [], advice: [] }])); const result = await app.runHandler(handler, isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' })); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1); assert.ok(requests[0].path.endsWith('/' + op)); assert.ok(view.text.includes(reason)); assert.ok(view.text.includes(expectedText), view.text); assert.ok(view.commands.includes(expectedCommand)); noWrite(view.commands); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
const formation = { formationKey: 'yinxi', formationCategory: 'concealment', formationName: '隐息阵', formationEffect: '原实际效果', expiresAt: '2026-12-01T12:00:00Z' };
for (const isPrivate of [false, true]) for (const mode of ['empty', 'active', 'created', 'refreshed', 'replaced', 'removed']) test(`formation original result ${mode} private=${isPrivate}`, async t => {
 const entry = mode === 'empty' || mode === 'active' ? entries[0] : mode === 'removed' ? entries[2] : entries[1];
 const data = mode === 'empty' ? [] : mode === 'active' ? [{ ...formation, categoryLabel: '隐匿阵', remainingText: '1小时59分' }] : mode === 'removed' ? { removed: true, outcome: 'removed', replaced: false, category: formation.formationCategory, name: formation.formationName, durationHours: 12, formation } : { outcome: mode, replaced: mode === 'replaced', replacedFormationName: mode === 'replaced' ? '原同类阵法' : null, name: formation.formationName, durationHours: 12, formation };
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data)); const event = isPrivate ? app.events.privateMessage({ text: entry.text, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.text, platform: 'qq-bot' }); const result = await app.runHandler(entry.handler, event); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1); assert.deepEqual(requests[0].body.arguments, entry.args); assert.ok(view.text.includes(mode === 'empty' ? '暂无生效中的洞府阵法' : '隐息阵')); if (mode === 'empty') { assert.ok(view.text.includes('空列表不证明阵盘丢失')); assert.ok(view.commands.includes('/灵田')); noWrite(view.commands); } else if (mode === 'active') { assert.ok(view.text.includes('1小时59分')); assert.ok(view.text.includes('原实际效果')); assert.ok(view.commands.includes('/移除阵法 隐息阵')); } else if (mode === 'removed') assert.ok(view.text.includes('你已移除')); else { assert.ok(view.text.includes('12 小时')); if (mode === 'replaced') assert.ok(view.text.includes('原同类阵法')); if (mode === 'refreshed') assert.ok(view.text.includes('持续时间已刷新')); }
 assert.equal(result.messages[0].target?.targetId, isPrivate ? event.UserId : event.ChannelId); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const isPrivate of [false, true]) for (const keyword of ['001', '1abc', '1.5', '自定义 阵盘']) test(`formation original keyword ${keyword} private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: '未找到可激活的阵盘', buttons: [], advice: [] }])); const text = '/激活阵盘 ' + keyword; const result = await app.runHandler(activate, isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' })); assert.equal(requests.length, 1); assert.deepEqual(requests[0].body.arguments, { keyword }); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const isPrivate of [false, true]) test(`legacy typed zero-hour formation private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { outcome: 'created', replaced: false, name: '', durationHours: 0, formation: { ...formation, formationKey: '', formationName: '', formationEffect: '' } })); const text = '/激活阵盘 自定义阵盘'; const result = await app.runHandler(activate, isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' })); assert.equal(requests.length, 1); assert.ok(result.messages[0].text.includes('0 小时')); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
