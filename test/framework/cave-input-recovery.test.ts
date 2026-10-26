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
const invalid = [
 ...['/一键播种', '/一键播种 聚灵丹 0', '/一键播种 聚灵丹 101', '/一键播种 聚灵丹 -1', '/一键播种 聚灵丹 1.5', '/一键播种 聚灵丹 abc', '/一键播种 聚灵丹 10 20'].map(text => ({ handler: plant, text })),
 ...['/开垦 -1', '/开垦 0', '/开垦 1.5', '/开垦 2abc', '/开垦 2 3', '/开垦 9007199254740992', '/开垦所有 2', '/一键开垦 不确认', '/开垦所有不确认'].map(text => ({ handler: cultivate, text })),
 ...['/播种0', '/播种 0', '/播种 0 聚灵草种', '/播种 9007199254740992 聚灵草种', '/播种 100000000000000000000', '/播种 2\n聚灵草种'].map(text => ({ handler: plant, text })),
 ...['/浇灌 2abc', '/浇灌 -1', '/浇灌 1.5', '/浇灌 2 3', '/一键浇灌 0', '/一键除虫 不确认', '/除虫 0', '/除草 9007199254740992', '/收割 2abc', '/一键收割 0', '/升级灵田 -1', '/升级灵田 2 不确认', '/灵田加速0', '/灵田加速 0', '/灵田加速 9007199254740992', '/灵田加速 2 3', '/灵田加速 2 灵肥 0', '/灵田加速 2 小绿瓶 -1', '/灵田加速 2 灵石 1.5', '/灵田加速 2 催熟 9007199254740992', '/灵田加速 2 灵肥 1 不确认'].map(text => ({ handler: action, text }))
];
for (const entry of invalid) for (const isPrivate of [false, true]) test(`invalid own cave input has no HTTP ${entry.text} private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, () => { throw new Error('invalid cave input must not execute'); }); const event = isPrivate ? app.events.privateMessage({ text: entry.text, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.text, platform: 'qq-bot' }); const result = await app.runHandler(entry.handler, event); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 0); assert.equal(result.messages.length, 1); assert.ok(view.text.includes('灵田参数格式错误')); assert.ok(view.text.includes('正整数')); assert.ok(view.commands.includes('/灵田')); assert.ok(!view.commands.some(command => /^\/(开垦|一键开垦|开垦所有|播种|浇灌|除虫|除草|收割|升级灵田|灵田加速)(?:\s|$)/.test(command))); assert.equal(result.messages[0].target?.targetId, isPrivate ? event.UserId : event.ChannelId); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
const valid = [
 ...[['/一键播种 聚灵丹', '10'], ['/一键播种 聚灵丹 100', '100'], ['/一键播种 聚灵丹 1', '1']].map(([text, count]) => ({ handler: plant, text, op: 'cave.plant', args: { plotIndex: null, seedName: null, recipeName: '聚灵丹', count } })),
 { handler: cultivate, text: '/开垦', op: 'cave.cultivate', args: { plotIndex: null } },
 { handler: cultivate, text: '  /开垦 002  ', op: 'cave.cultivate', args: { plotIndex: '2' } },
 { handler: cultivate, text: '/开垦所有', op: 'cave.cultivate', args: { plotIndex: null, all: true } },
 { handler: cultivate, text: '/一键开垦', op: 'cave.cultivate', args: { plotIndex: null, all: true } },
 { handler: plant, text: '/播种', op: 'cave.plant', args: { plotIndex: null, seedName: null } },
 { handler: plant, text: '/播种 002', op: 'cave.plant', args: { plotIndex: '2', seedName: null } },
 { handler: plant, text: '/播种 2 聚灵 草种', op: 'cave.plant', args: { plotIndex: '2', seedName: '聚灵 草种' } },
 { handler: plant, text: '/播种 聚灵草种 页 2', op: 'cave.plant', args: { plotIndex: null, seedName: '聚灵草种' } },
 ...['1abc', '1.5', '自定义 种子'].map(seedName => ({ handler: plant, text: '/播种 ' + seedName, op: 'cave.plant', args: { plotIndex: null, seedName } })),
 ...[['浇灌', 'water'], ['除虫', 'worm'], ['除草', 'weed'], ['收割', 'harvest'], ['升级灵田', 'upgrade']].map(([word, op]) => ({ handler: action, text: '/' + word, op: 'cave.' + op, args: { plotIndex: null } })),
 ...[['浇灌', 'water'], ['除虫', 'worm'], ['除草', 'weed'], ['收割', 'harvest']].map(([word, op]) => ({ handler: action, text: '/一键' + word + ' 002', op: 'cave.' + op, args: { plotIndex: '2' } })),
 { handler: action, text: '/灵田加速', op: 'cave.accelerate', args: { mode: 'usage', plotIndex: null, accelerator: null, count: null } },
 { handler: action, text: '/灵田加速 2', op: 'cave.accelerate', args: { mode: 'preview', plotIndex: '2', accelerator: null, count: null } },
 ...[['灵肥', 'lingfei'], ['小绿瓶', 'greenBottle'], ['灵石', 'spiritStone'], ['催熟', 'ripen']].map(([word, accelerator]) => ({ handler: action, text: '/灵田加速 2 ' + word + ' 002', op: 'cave.accelerate', args: { mode: 'execute', plotIndex: '2', accelerator, count: '2' } })),
 { handler: action, text: '/灵田加速 2 灵肥', op: 'cave.accelerate', args: { mode: 'execute', plotIndex: '2', accelerator: 'lingfei', count: null } },
 { handler: action, text: '/收割 9007199254740991', op: 'cave.harvest', args: { plotIndex: '9007199254740991' } }
];
for (const entry of valid) for (const isPrivate of [false, true]) test(`valid cave input retains exact target ${entry.text} private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: '原服务条件拒绝', buttons: [], advice: [] }])); const event = isPrivate ? app.events.privateMessage({ text: entry.text, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.text, platform: 'qq-bot' }); const result = await app.runHandler(entry.handler, event);
 assert.equal(requests.length, 1); assert.ok(requests[0].path.endsWith('/' + entry.op)); assert.deepEqual(requests[0].body.arguments, entry.args); assert.ok(requests[0].idempotencyKey); assert.ok(result.messages[0].text.includes('原服务条件拒绝')); assert.equal(result.messages[0].target?.targetId, isPrivate ? event.UserId : event.ChannelId); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const prefix of ['', '/', '#', '＃', '!', '！']) for (const isPrivate of [false, true]) test(`cave original prefix ${prefix} private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: '原服务条件拒绝', buttons: [], advice: [] }])); const text = prefix + '浇灌 2'; const result = await app.runHandler(action, isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' })); assert.equal(requests.length, 1); assert.deepEqual(requests[0].body.arguments, { plotIndex: '2' }); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
