import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import own from '../../src/response/cavePlot/info/res';
import logs from '../../src/response/cavePlot/logs/res';
import nearby from '../../src/response/cavePlot/nearby/res';
import visit from '../../src/response/cavePlot/visit/res';
import { businessEnvelope, gameFixture } from './fixture';
before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const entries = [
 { handler: own, op: 'cave.view', text: '/灵田', args: {} },
 { handler: logs, op: 'cave.logs', text: '/灵田记录', args: { page: '1' } },
 { handler: nearby, op: 'cave.nearby', text: '/附近灵田', args: {} },
 { handler: visit, op: 'cave.visit', text: '/查看灵田 2', args: { target: { uid: 2 } } }
];
for (const entry of entries) for (const isPrivate of [false, true]) for (const wire of ['http', 'feedback', 'structured', 'malformed', 'internal']) test(`cave query ${entry.op} ${wire} private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, request => wire === 'http' ? { code: 'CONFLICT', message: '原查询拒绝' } : wire === 'internal' ? { code: 'INTERNAL', message: 'private query SQL' } : businessEnvelope(request.bid, wire === 'malformed' ? {} : undefined, wire === 'malformed' ? [] : [{ title: '原标题', heading: '原抬头', text: '原查询拒绝', quote: '原引用', blocks: [{ text: '原说明', quoted: true, inlineButtons: [{ label: '原内联', command: '/丹方' }] }], buttons: [{ label: '原返回', command: '/我的境界' }], advice: wire === 'structured' ? [{ command: '/我的信息', description: '原服务建议' }] : [] }]), wire === 'http' ? 409 : wire === 'internal' ? 500 : 200);
 const event = isPrivate ? app.events.privateMessage({ text: entry.text, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.text, platform: 'qq-bot' }); const result = await app.runHandler(entry.handler, event); const view = inspectMessage(result.messages[0].nodes); assert.equal(requests.length, 1); assert.ok(requests[0].path.endsWith('/' + entry.op)); assert.deepEqual(requests[0].body.arguments, entry.args); assert.ok(requests[0].idempotencyKey); assert.equal(result.messages.length, 1); assert.ok(view.text.includes(wire === 'malformed' || wire === 'internal' ? '失败' : '原查询拒绝')); assert.ok(!view.text.includes('private query')); assert.ok(!view.text.includes('暂无灵田记录'));
 if (wire === 'feedback' || wire === 'structured') { for (const text of ['原标题', '原抬头', '原引用', '原说明']) assert.ok(view.text.includes(text)); for (const command of ['/丹方', '/我的境界']) assert.ok(view.commands.includes(command)); }
 if (wire === 'structured') assert.ok(view.text.includes('原服务建议')); else assert.ok(view.commands.includes('/我的职业')); assert.ok(!view.commands.some(command => /^\/(播种|开垦|偷药|协作灵田)\s/.test(command))); assert.equal(result.messages[0].target?.targetId, isPrivate ? event.UserId : event.ChannelId); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const entry of entries.slice(0, 2)) for (const isPrivate of [false, true]) for (const guide of [false, true]) test(`cave query retains real realm or profession refusal ${entry.op} guide=${guide} private=${isPrivate}`, async t => {
 const reason = guide ? '你尚未开始灵药师指引。\n\n请先发送 /加入灵药师，开启洞府灵田与灵药师成长。' : '炼气九层及以上方可使用洞府系统，当前境界：炼气八层'; const command = guide ? '/加入灵药师' : '/我的境界'; const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: reason, buttons: [{ label: '原指引入口', command }], advice: [] }])); const result = await app.runHandler(entry.handler, isPrivate ? app.events.privateMessage({ text: entry.text, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.text, platform: 'qq-bot' })); const view = inspectMessage(result.messages[0].nodes); assert.equal(requests.length, 1); assert.ok(view.text.includes(reason)); assert.ok(view.commands.includes(command)); assert.ok(view.commands.includes(guide ? '/我的职业' : '/查看主线')); assert.ok(view.text.includes(guide ? '职业进度与人物境界分别核对' : '挑战主线获取修为')); if (guide) assert.ok(view.text.includes('查看服务器当前步骤')); assert.ok(!view.commands.includes('/商店 万宝楼')); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
const plot = { plotIndex: 2, plotState: 'cultivated', fieldGrade: 1, seedName: '原灵种', seedMatureHours: 12, seedStageSplit: null, cropName: '原灵植', baseYield: 3, expReward: 4, abnormalFlags: 1, abnormalStateCount: 1, isMature: false, plantedAt: null, matureAt: '2026-12-01T12:00:00Z', remainingSeconds: 7200, title: '原地块', detail: '原地块详情', capabilities: [{ kind: 'care', careAction: 'water' }] };
const overview = { plots: [plot], maxPlots: 2, cultivatedCount: 1, plantedCount: 1, matureCount: 0, abnormalCount: 1, auraScore: 10, auraLevel: '原等级', auraLabel: '原灵气', activeFormations: [] };
const logData = { realmName: '元婴', canUseCave: true, lockedMessage: '', hasCavePlot: true, logs: [], page: 1, total: 0, totalPages: 1 };
const friend = { ownerId: 2, ownerName: '原田主', relation: 'friend', relationLabel: '好友', canViewPlots: true, canCollaborate: true, canSteal: true, auraText: '10分', summaryText: '', stolenStatusText: '原被访状态', recentLogs: [], capabilities: [{ kind: 'collaborate', careAction: 'water' }, { kind: 'steal' }], summary: overview };
for (const isPrivate of [false, true]) for (const entry of entries) test(`normal cave query facts ${entry.op} private=${isPrivate}`, async t => {
 const data = entry.handler === own ? { access: { canUseCave: true, hasCavePlot: true, lockedMessage: '', realmName: '元婴' }, overview } : entry.handler === logs ? { ...logData, logs: ['原记录，实际收获2份'], total: 1 } : entry.handler === nearby ? { players: [{ ownerId: 2, ownerName: '原田主', relation: 'friend', relationLabel: '好友', auraText: '10分', stolenStatusText: '原被访状态', canSteal: true }] } : friend;
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data)); const event = isPrivate ? app.events.privateMessage({ text: entry.text, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.text, platform: 'qq-bot' }); const result = await app.runHandler(entry.handler, event); const view = inspectMessage(result.messages[0].nodes); assert.equal(requests.length, 1); assert.ok(view.text.includes(entry.handler === logs ? '原记录，实际收获2份' : entry.handler === nearby ? '原田主' : '原地块详情')); if (entry.handler === visit) assert.ok(view.commands.includes('/协作灵田 2 浇灌 2')); assert.equal(result.messages[0].target?.targetId, isPrivate ? event.UserId : event.ChannelId); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const isPrivate of [false, true]) for (const kind of ['logs', 'nearby', 'restricted', 'visible-empty', 'missing-plot']) test(`cave query empty or limited ${kind} private=${isPrivate}`, async t => {
 const handler = kind === 'logs' ? logs : kind === 'nearby' ? nearby : kind === 'missing-plot' ? own : visit; const text = kind === 'logs' ? '/灵田记录' : kind === 'nearby' ? '/附近灵田' : kind === 'missing-plot' ? '/灵田 地块 99' : '/查看灵田 2'; const data = kind === 'logs' ? logData : kind === 'nearby' ? { players: [], message: '原列表为空说明' } : kind === 'missing-plot' ? { access: { canUseCave: true, hasCavePlot: true, lockedMessage: '', realmName: '元婴' }, overview } : kind === 'visible-empty' ? { ...friend, summary: { ...overview, plots: [] } } : { ...friend, relation: 'stranger', relationLabel: '陌生人', canViewPlots: false, canCollaborate: false, capabilities: [{ kind: 'steal' }], summary: null, auraText: '不可见', summaryText: '对方洞府气息全无，无从感知。' };
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data)); const result = await app.runHandler(handler, isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' })); const view = inspectMessage(result.messages[0].nodes); assert.equal(requests.length, 1); assert.ok(view.text.includes(kind === 'logs' ? '不证明之前操作未发生' : kind === 'nearby' ? '本次列表未返回目标' : kind === 'missing-plot' ? '旧详情编号不代表地块仍可用' : '不等于零产出'), view.text); assert.ok(view.commands.includes(kind === 'nearby' ? '/我的好友' : '/灵田')); if (kind === 'restricted') { assert.ok(view.text.includes('不可见')); assert.ok(!view.text.includes('原地块详情')); } assert.ok(!view.commands.some(command => /^\/(协作灵田|偷药|播种|开垦)\s/.test(command))); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const isPrivate of [false, true]) for (const kind of ['wrong-owner', 'invalid-owner']) test(`cave query bad target has no interaction buttons ${kind} private=${isPrivate}`, async t => {
 const handler = kind === 'wrong-owner' ? visit : nearby; const data = kind === 'wrong-owner' ? { ...friend, ownerId: 3 } : { players: [{ ownerId: -1, ownerName: '无效田主', relation: 'stranger', relationLabel: '陌生人', auraText: '0', stolenStatusText: '', canSteal: true }] }; const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data)); const text = kind === 'wrong-owner' ? '/查看灵田 2' : '/附近灵田'; const result = await app.runHandler(handler, isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' })); const view = inspectMessage(result.messages[0].nodes); assert.equal(requests.length, 1); assert.ok(view.text.includes('失败')); assert.ok(view.commands.includes('/我的信息')); assert.ok(!view.commands.some(command => /^\/(查看信息|协作灵田|偷药)\s/.test(command))); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});

for (const isPrivate of [false, true]) for (const text of ['/灵田', '/灵田 操作']) test(`灵田固定展示批量加速入口 ${text} private=${isPrivate}`, async t => {
 const data = { access: { canUseCave: true, hasCavePlot: true, lockedMessage: '', realmName: '元婴' }, overview: { ...overview, plots: [] } };
 const { app } = await gameFixture(t, request => businessEnvelope(request.bid, data));
 const event = isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' });
 const result = await app.runHandler(own, event);
 const view = inspectMessage(result.messages[0].nodes);
 for (const command of ['/一键灵田加速', '/一键灵田催熟']) {
  assert.ok(view.commands.includes(command), command);
  assert.ok([...command].length <= 80);
  assert.equal(Buffer.byteLength(command, 'utf8'), 19);
 }
 assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
