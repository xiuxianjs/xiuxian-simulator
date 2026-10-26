import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import choose from '../../src/response/soulPath/choose/res';
import change from '../../src/response/soulPath/switch/res';
import advance from '../../src/response/soulPath/advance/res';
import reroll from '../../src/response/soulPath/reroll/res';
import confirm from '../../src/response/soulPath/confirm/res';
import { businessEnvelope, gameFixture } from './fixture';
before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const token = '01234567-89ab-cdef-0123-456789abcdef';
const previews = [
 { handler: choose, op: 'soul-path.choose-preview', command: '选择道途', input: '玄法', choose: true },
 { handler: change, op: 'soul-path.switch-preview', command: '切换道途', input: '御器道', choose: false },
 { handler: advance, op: 'soul-path.advance-preview', command: '道途突破', input: '', choose: false },
 { handler: reroll, op: 'soul-path.reroll-preview', command: '神魂重选', input: '', choose: false }
];
const entries = [...previews.map(entry => ({ handler: entry.handler, op: entry.op, text: '/' + entry.command + (entry.input ? ' ' + entry.input : ''), args: { input: entry.input } })), ...[false, true].map(choose => ({ handler: confirm, op: 'soul-path.confirm', text: '/确认神魂 ' + (choose ? 'choose:' : '') + token, args: { token: (choose ? 'choose:' : '') + token } }))];
const noConfirm = (commands: string[]) => assert.ok(!commands.some(command => /^[!！/#＃]?确认神魂(?:\s|$)/.test(command)));
const path = { message: '原确认完成。原费用已处理', pathKey: 'xuan_fa', pathName: '玄法', nodeName: '原节点', pathSwitchAvailableAt: null };
for (const entry of entries) for (const isPrivate of [false, true]) for (const wire of ['http', 'feedback', 'structured', 'malformed', 'internal']) test(`${entry.op} ${entry.text} ${wire} private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, request => wire === 'http' ? { code: 'CONFLICT', message: '原道途拒绝' } : wire === 'internal' ? { code: 'INTERNAL', message: 'private soul token SQL' } : businessEnvelope(request.bid, wire === 'malformed' ? {} : undefined, wire === 'malformed' ? [] : [{ title: '', heading: '原抬头', text: '原道途拒绝', quote: '原引用', blocks: [{ text: '原说明', quoted: true, inlineButtons: [{ label: '原内联', command: '/丹方' }, { label: '旧确认', command: '/确认神魂 ' + token }] }], buttons: [{ label: '原返回', command: '/元婴神魂' }, { label: '旧确认', command: '/确认神魂 ' + token }], advice: wire === 'structured' ? [{ command: '/我的信息', description: '原服务建议' }, { command: '/确认神魂 ' + token, description: '旧凭证写入建议' }] : [] }]), wire === 'http' ? 409 : wire === 'internal' ? 500 : 200);
 const event = isPrivate ? app.events.privateMessage({ text: entry.text, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.text, platform: 'qq-bot' }); const result = await app.runHandler(entry.handler, event); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1); assert.ok(requests[0].path.endsWith('/' + entry.op)); assert.deepEqual(requests[0].body.arguments, entry.args); assert.ok(requests[0].idempotencyKey); assert.ok(view.text.includes(wire === 'malformed' || wire === 'internal' ? '未获完整确认' : '原道途拒绝')); assert.ok(!view.text.includes('private soul')); assert.ok(!view.text.includes('旧凭证写入建议'));
 if (wire === 'feedback' || wire === 'structured') { for (const text of ['原抬头', '原引用', '原说明']) assert.ok(view.text.includes(text)); for (const command of ['/元婴神魂', '/丹方']) assert.ok(view.commands.includes(command)); }
 if (wire === 'structured') assert.ok(view.text.includes('原服务建议')); else assert.ok(view.commands.includes('/元婴道途')); noConfirm(view.commands);
 assert.equal(result.messages[0].target?.targetId, isPrivate ? event.UserId : event.ChannelId); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const entry of previews.filter(entry => !entry.input)) for (const isPrivate of [false, true]) for (const tail of [' 确认', ' 不确认', ' 玄法', '不确认']) test(`${entry.command}${tail} cannot create credential private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, () => { throw new Error('invalid argument must not request'); }); const text = '/' + entry.command + tail;
 const result = await app.runHandler(entry.handler, isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' })); assert.equal(requests.length, 0); assert.ok(result.messages[0].text.includes('参数错误')); noConfirm(inspectMessage(result.messages[0].nodes).commands); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const isPrivate of [false, true]) for (const invalid of ['', 'choose:', '-'.repeat(36), token + ' 多余', 'CHOOSE:' + token, '0123456789ab-cdef-0123-456789abcdef']) test(`invalid soul confirmation ${invalid} private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, () => { throw new Error('invalid credential must not request'); }); const text = '/确认神魂 ' + invalid;
 const result = await app.runHandler(confirm, isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' })); const view = inspectMessage(result.messages[0].nodes); assert.equal(requests.length, 0); assert.ok(view.text.includes('凭证格式无效')); assert.ok(view.commands.includes('/元婴道途')); noConfirm(view.commands); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const isPrivate of [false, true]) for (const [reason, command, text] of [
 ['凭证已过期或道途状态已变化，请重新预览', '/元婴道途', '凭证失效不证明操作从未执行'],
 ['确认凭证不存在或不属于你', '/元婴神魂', '不使用他人凭证'],
 ['道途尚在切换冷却中，可于 2026-12-01 12:00:00 后切换', '/元婴道途', '以原提示的可切换时刻为准'],
 ['神魂感悟不足，需要100，当前20', '/神魂材料来源', '温养可积累进度'],
 ['道途熟练不足，需要100，当前20', '/元婴神魂', '不自动温养或重复突破'],
 ['玄法的首发节点已全部圆融', '/元婴道途', '开放节点上限'],
 ['保底感悟不可重选', '/元婴神魂', '重选可能变差且需收回旧额外材料'],
 ['今日特权温养重选次数已用尽', '/神魂材料来源', '不自动退还、补领或购买权益']
]) test(`soul confirm recovery ${reason} private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: reason, buttons: [], advice: [] }])); const value = '/确认神魂 ' + token;
 const result = await app.runHandler(confirm, isPrivate ? app.events.privateMessage({ text: value, platform: 'qq-bot' }) : app.events.groupMessage({ text: value, platform: 'qq-bot' })); const view = inspectMessage(result.messages[0].nodes); assert.equal(requests.length, 1); assert.ok(view.text.includes(reason)); assert.ok(view.text.includes(text), view.text); assert.ok(view.commands.includes(command)); noConfirm(view.commands); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const entry of previews) for (const isPrivate of [false, true]) test(`valid ${entry.command} preview preserves risk and exact token private=${isPrivate}`, async t => {
 const message = '原预览标题\n原费用与风险\n请在10分钟内确认。'; const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { token, message })); const text = '/' + entry.command + (entry.input ? ' ' + entry.input : '');
 const event = isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' }); const result = await app.runHandler(entry.handler, event); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1); assert.deepEqual(requests[0].body.arguments, { input: entry.input }); for (const text of ['原预览标题', '原费用与风险', '请在10分钟内确认。', '尚未执行 · 确认后生效']) assert.ok(view.text.includes(text)); assert.ok(view.commands.includes('/确认神魂 ' + (entry.choose ? 'choose:' : '') + token)); assert.equal(result.messages[0].target?.targetId, isPrivate ? event.UserId : event.ChannelId); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const entry of [previews[0], previews[3]]) for (const isPrivate of [false, true]) for (const data of [{ token: '-'.repeat(36), message: '原费用' }, { token, message: '' }, {}]) test(`${entry.command} malformed preview ${JSON.stringify(data)} private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data)); const text = '/' + entry.command + (entry.input ? ' ' + entry.input : ''); const result = await app.runHandler(entry.handler, isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' })); assert.equal(requests.length, 1); assert.ok(result.messages[0].text.includes('未获完整确认')); noConfirm(inspectMessage(result.messages[0].nodes).commands); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const isPrivate of [false, true]) for (const action of ['choose', 'switch', 'advance', 'reroll']) test(`soul confirmation ${action} keeps original receipt private=${isPrivate}`, async t => {
 const data = action === 'choose' ? { mode: 'choose', result: path } : { mode: 'action', result: action === 'reroll' ? { action, nurture: { direction: 'wu_dao', directionName: '悟道', tier: 'steady', tierName: '稳进', stabilityBefore: 60, stabilityAfter: 50, insightGained: -4, proficiencyGained: -2, extraItems: [{ name: '新额外材料', quantity: 1 }] } } : { action, path } };
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data)); const value = (action === 'choose' ? 'choose:' : '') + token; const text = '/确认神魂 ' + value;
 const event = isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' }); const result = await app.runHandler(confirm, event); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1); assert.deepEqual(requests[0].body.arguments, { token: value }); assert.doesNotMatch(view.text, /重复确认可能回看原结果/); if (action === 'reroll') { assert.ok(view.text.includes('感悟 -4 · 熟练 -2')); assert.ok(view.text.includes('新额外材料×1')); assert.doesNotMatch(view.text, /以上为重选前后差额/); } else { assert.ok(view.text.includes('原确认完成')); assert.ok(view.text.includes('原费用已处理')); assert.ok(view.text.includes('原节点')); }
 noConfirm(view.commands); assert.equal(result.messages[0].target?.targetId, isPrivate ? event.UserId : event.ChannelId); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const isPrivate of [false, true]) for (const [value, data] of [
 [token, { mode: 'choose', result: path }], ['choose:' + token, { mode: 'action', result: { action: 'advance', path } }],
 ['choose:' + token, { mode: 'choose', result: { ...path, message: '' } }], [token, {}]
] as const) test(`contradictory soul confirmation ${JSON.stringify(data)} private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data)); const text = '/确认神魂 ' + value; const result = await app.runHandler(confirm, isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' })); assert.equal(requests.length, 1); assert.ok(result.messages[0].text.includes('未获完整确认')); noConfirm(inspectMessage(result.messages[0].nodes).commands); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
