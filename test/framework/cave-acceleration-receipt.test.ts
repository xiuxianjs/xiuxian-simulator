import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import action from '../../src/response/cavePlot/action/res';
import { businessEnvelope, gameFixture } from './fixture';
before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const plot = { plotIndex: 2, plotState: 'cultivated', fieldGrade: 1, seedName: '原灵种', seedMatureHours: 12, seedStageSplit: null, cropName: '原灵植', baseYield: 3, expReward: 4, abnormalFlags: 0, abnormalStateCount: 0, isMature: false, plantedAt: null, matureAt: '2026-12-01T12:00:00Z', remainingSeconds: 7200, title: '原地块', detail: '原最新状态', capabilities: [{ kind: 'accelerate' }] };
const overview = { plots: [plot], maxPlots: 1, cultivatedCount: 1, plantedCount: 1, matureCount: 0, abnormalCount: 0, auraScore: 10, auraLevel: '原等级', auraLabel: '原灵气', activeFormations: [] };
const matureOverview = { ...overview, matureCount: 1, plots: [{ ...plot, isMature: true, remainingSeconds: 0, capabilities: [{ kind: 'harvest' }] }] };
const noExecution = (commands: string[]) => assert.ok(!commands.some(command => /^\/灵田加速\s+\d+\s+(灵肥|小绿瓶|灵石|催熟)/.test(command)));
const refusals = [
 ['当前没有可加速的灵植。', '灵肥', '/灵田', '无需再购买加速物资'],
 ['当前没有可加速的未成熟灵植', '灵石', '/灵田', '无需再购买加速物资'],
 ['该灵植数据异常，暂时无法加速。', '灵肥', '/灵田', '不重放整批'],
 ['该灵种本轮最多可使用 3 次加速道具（灵肥/小绿瓶）。', '灵肥', '/灵田', '购买更多道具不能增加额度'],
 ['灵肥不足。', '灵肥', '/储物袋', '缺失名称和数量'],
 ['小绿瓶不足。', '小绿瓶', '/我的信息', '小绿瓶是个人资源'],
 ['本轮普通加速次数已用完', '灵石', '/灵田', '其他方式能否使用'],
 ['灵石不足', '灵石', '/我的信息', '减少数量不能绕过'],
 ['冻结阵法生效中，请先解除冻结', '灵石', '/洞府阵法', '不自动移除阵法'],
 ['该地块24小时内已使用立即催熟', '催熟', '/灵田', '等待冷却恢复']
] as const;
for (const isPrivate of [false, true]) for (const [message, item, command, expected] of refusals) test(`successful cave envelope still explains refusal ${message} private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { mode: 'command', result: { message, overview } })); const text = '/灵田加速 2 ' + item + ' 1'; const event = isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' }); const result = await app.runHandler(action, event); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1); assert.deepEqual(requests[0].body.arguments, { mode: 'execute', plotIndex: '2', accelerator: ({ 灵肥: 'lingfei', 小绿瓶: 'greenBottle', 灵石: 'spiritStone', 催熟: 'ripen' } as const)[item], count: '1' }); assert.ok(requests[0].idempotencyKey); assert.equal(result.messages.length, 1); assert.ok(view.text.includes(message)); assert.ok(view.text.includes(expected), view.text); assert.ok(view.commands.includes(command)); assert.ok(view.text.includes('原最新状态')); assert.ok(view.commands.includes('/灵田加速 2')); assert.ok(view.text.indexOf(expected) > view.text.indexOf(message)); assert.ok(view.text.indexOf(expected) < view.text.indexOf('原最新状态')); noExecution(view.commands); assert.equal(result.messages[0].target?.targetId, isPrivate ? event.UserId : event.ChannelId); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
const partials = [
 ['第2块灵田已使用 2 份灵肥，成熟时间缩短 2 小时。（已达加速次数上限，灵肥不足，实际消耗 2 次）', '灵肥', ['普通加速已到本轮上限', '缺失名称和数量'], ['/灵田', '/储物袋']],
 ['第2块灵田已使用 2 瓶小绿瓶，成熟时间缩短 4 小时。（作物即将成熟，实际消耗 2 次）', '小绿瓶', ['不为凑满原请求继续购买或重复加速'], ['/灵田']],
 ['第2块灵田已使用 1 份灵肥，成熟时间缩短 1 小时。（灵肥不足，实际消耗 1 次）', '灵肥', ['缺失名称和数量'], ['/储物袋']],
 ['第2块灵田已使用 1 瓶小绿瓶，成熟时间缩短 2 小时。（已达加速次数上限，小绿瓶不足，作物即将成熟，实际消耗 1 次）', '小绿瓶', ['普通加速已到本轮上限', '小绿瓶是个人资源', '作物即将成熟'], ['/灵田', '/我的信息']],
 ['第2块灵田已使用 1 份灵肥，成熟时间缩短 1 小时。（原未知停止原因，实际消耗 1 次）', '灵肥', ['不重放整批'], ['/灵田']]
] as const;
for (const isPrivate of [false, true]) for (const snapshot of [false, true]) for (const [message, item, expectations, commands] of partials) test(`partial cave acceleration retains actual receipt snapshot=${snapshot} ${item} private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { mode: 'command', result: { message, overview: snapshot ? null : message.includes('作物即将成熟') ? matureOverview : overview, ...(snapshot ? { snapshotError: '操作已完成，暂时无法刷新灵田，请稍后查看。' } : {}) } })); const text = '/灵田加速 2 ' + item + ' 4'; const result = await app.runHandler(action, isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' })); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1); assert.deepEqual(requests[0].body.arguments, { mode: 'execute', plotIndex: '2', accelerator: item === '灵肥' ? 'lingfei' : 'greenBottle', count: '4' }); assert.ok(view.text.includes(message)); assert.ok(!view.text.includes('实际消耗 4 次')); for (const expected of expectations) assert.ok(view.text.includes(expected), view.text); for (const command of commands) assert.ok(view.commands.includes(command)); if (snapshot) assert.ok(view.text.includes('无法刷新灵田')); else assert.ok(view.text.includes('原最新状态')); noExecution(view.commands); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const isPrivate of [false, true]) for (const item of ['灵石', '催熟']) for (const count of ['1', '4']) test(`stone receipt does not infer missing counts ${item} ${count} private=${isPrivate}`, async t => {
 const message = item === '灵石' ? '第2块灵田缩短120分钟，消耗50灵石。本轮不触发变异。' : '第2块灵田已成熟，可前往收获；消耗150灵石。本轮不触发变异。'; const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { mode: 'command', result: { message, overview: item === '催熟' ? matureOverview : overview } })); const text = `/灵田加速 2 ${item} ${count}`; const result = await app.runHandler(action, isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' })); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1); assert.deepEqual(requests[0].body.arguments, { mode: 'execute', plotIndex: '2', accelerator: item === '灵石' ? 'spiritStone' : 'ripen', count }); assert.ok(view.text.includes(message)); assert.ok(!view.text.includes('实际完成4次')); if (count === '4') { assert.ok(view.text.includes('不能把请求次数当作全部已完成')); assert.ok(view.commands.includes('/灵田')); } else assert.ok(!view.text.includes('建议：')); noExecution(view.commands); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const isPrivate of [false, true]) test(`ordinary complete acceleration stays unchanged private=${isPrivate}`, async t => {
 const message = '第2块灵田已使用 1 份灵肥，成熟时间缩短 1 小时。'; const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { mode: 'command', result: { message, overview } })); const text = '/灵田加速 2 灵肥 1'; const result = await app.runHandler(action, isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' })); const view = inspectMessage(result.messages[0].nodes); assert.equal(requests.length, 1); assert.ok(view.text.includes(message)); assert.ok(!view.text.includes('建议：')); assert.ok(view.text.includes('原最新状态')); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});

for (const [text, accelerator] of [['/一键灵田加速', 'spiritStone'], ['/一键灵田催熟', 'ripen'], ['/一键加速', 'spiritStone'], ['/一键催熟', 'ripen']] as const) test(text + ' submits one batch and preserves partial receipt', async t => {
 const message = '本次已确认成功1块，合计消耗50灵石。第3块未执行：灵石不足';
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { mode: 'command', result: { message, overview } }));
 const result = await app.runHandler(action, app.events.groupMessage({ text, platform: 'qq-bot' }));
 assert.equal(requests.length, 1);
 assert.deepEqual(requests[0].body.arguments, { mode: 'all', plotIndex: null, accelerator, count: '1' });
 assert.ok(requests[0].idempotencyKey);
 assert.ok(inspectMessage(result.messages[0].nodes).text.includes(message));
 assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
