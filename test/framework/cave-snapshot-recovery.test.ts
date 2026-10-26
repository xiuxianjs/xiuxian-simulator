import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import cultivate from '../../src/response/cavePlot/cultivate/res';
import plant from '../../src/response/cavePlot/plant/res';
import action from '../../src/response/cavePlot/action/res';
import { businessEnvelope, gameFixture } from './fixture';
before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const entries = [
 { handler: cultivate, op: 'cave.cultivate', text: '/开垦 2', args: { plotIndex: '2' } },
 { handler: plant, op: 'cave.plant', text: '/播种 2 赤灵果种子', args: { plotIndex: '2', seedName: '赤灵果种子' } },
 ...[['浇灌', 'water'], ['除虫', 'worm'], ['除草', 'weed'], ['收割', 'harvest'], ['升级灵田', 'upgrade']].map(([word, op]) => ({ handler: action, op: 'cave.' + op, text: '/' + word + ' 2', args: { plotIndex: '2' } })),
 { handler: action, op: 'cave.accelerate', text: '/灵田加速 2 灵肥 1', args: { mode: 'execute', plotIndex: '2', accelerator: 'lingfei', count: '1' } }
];
const wrap = (op: string, result: unknown) => op === 'cave.cultivate' ? result : op === 'cave.plant' ? { mode: 'plant', result } : { mode: 'command', result };
const noWrite = (commands: string[]) => assert.ok(!commands.some(command => /^\/(开垦|一键开垦|开垦所有|播种|浇灌|除虫|除草|收割|升级灵田|灵田加速)(?:\s|$)/.test(command)));
for (const entry of entries) for (const isPrivate of [false, true]) for (const wire of ['http', 'feedback', 'structured', 'malformed', 'internal']) test(`own cave ${entry.op} ${wire} private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, request => wire === 'http' ? { code: 'CONFLICT', message: '原灵田拒绝' } : wire === 'internal' ? { code: 'INTERNAL', message: 'private cave SQL' } : businessEnvelope(request.bid, wire === 'malformed' ? {} : undefined, wire === 'malformed' ? [] : [{ title: '原标题', heading: '原抬头', text: '原灵田拒绝', quote: '原引用', blocks: [{ text: '原说明', quoted: true, inlineButtons: [{ label: '原内联', command: '/丹方' }] }], buttons: [{ label: '原返回', command: '/我的信息' }], advice: wire === 'structured' ? [{ command: '/我的信息', description: '原服务建议' }] : [] }]), wire === 'http' ? 409 : wire === 'internal' ? 500 : 200);
 const event = isPrivate ? app.events.privateMessage({ text: entry.text, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.text, platform: 'qq-bot' }); const result = await app.runHandler(entry.handler, event); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1); assert.ok(requests[0].path.endsWith('/' + entry.op)); assert.deepEqual(requests[0].body.arguments, entry.args); assert.ok(requests[0].idempotencyKey); assert.equal(result.messages.length, 1); assert.ok(view.text.includes(wire === 'malformed' || wire === 'internal' ? '未获完整确认' : '原灵田拒绝')); assert.ok(!view.text.includes('private cave'));
 if (wire === 'feedback' || wire === 'structured') { for (const text of ['原标题', '原抬头', '原引用', '原说明']) assert.ok(view.text.includes(text)); for (const command of ['/丹方', '/我的信息']) assert.ok(view.commands.includes(command)); }
 if (wire === 'structured') assert.ok(view.text.includes('原服务建议')); else { assert.ok(view.commands.includes('/灵田')); assert.ok(view.text.includes('不重放整批')); } noWrite(view.commands); assert.equal(result.messages[0].target?.targetId, isPrivate ? event.UserId : event.ChannelId); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const entry of entries) for (const isPrivate of [false, true]) for (const snapshotError of ['操作已完成，暂时无法刷新灵田，请稍后查看。', null]) test(`own cave receipt without snapshot ${entry.op} ${snapshotError} private=${isPrivate}`, async t => {
 const receipt = '原第2块已完成，原消耗【灵土】x5，原收获【灵植】x2。'; const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, wrap(entry.op, { message: receipt, snapshotError, overview: null })));
 const event = isPrivate ? app.events.privateMessage({ text: entry.text, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.text, platform: 'qq-bot' }); const result = await app.runHandler(entry.handler, event); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1); assert.deepEqual(requests[0].body.arguments, entry.args); assert.ok(view.text.includes(receipt)); assert.ok(view.text.includes(snapshotError ?? '灵田状态未获完整确认')); assert.ok(view.text.includes('刷新失败不代表操作回滚')); for (const command of ['/灵田', '/储物袋']) assert.ok(view.commands.includes(command)); noWrite(view.commands); assert.equal(result.messages[0].target?.targetId, isPrivate ? event.UserId : event.ChannelId); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const isPrivate of [false, true]) test(`plant next selection snapshot failure private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { mode: 'plant', result: { message: '第2块播种已完成，消耗灵种1份', needsSeedSelection: true, snapshotError: '播种已完成，暂时无法读取下一次播种选项，请稍后查看。', overview: null } })); const text = '/播种 2 赤灵果种子'; const result = await app.runHandler(plant, isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' })); const view = inspectMessage(result.messages[0].nodes); assert.equal(requests.length, 1); assert.ok(view.text.includes('消耗灵种1份')); assert.ok(view.text.includes('无法读取下一次播种选项')); assert.ok(view.commands.includes('/灵田')); noWrite(view.commands); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const isPrivate of [false, true]) for (const [reason, expectedCommand, expectedText] of [
 ['灵石不足', '/我的信息', '核对可用灵石'],
 ['境界不足', '/查看主线', '挑战主线获取修为']
]) test(`known cave refusal stays ahead of unknown-result fallback ${reason} private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: reason, buttons: [], advice: [] }])); const text = '/灵田加速 2 灵石 1'; const result = await app.runHandler(action, isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' })); const view = inspectMessage(result.messages[0].nodes); assert.equal(requests.length, 1); assert.ok(view.text.includes(reason)); assert.ok(view.text.includes(expectedText)); assert.ok(view.commands.includes(expectedCommand)); assert.ok(!view.text.includes('刷新失败不代表操作回滚')); noWrite(view.commands); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
