import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, Router, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import batch from '../../src/response/skillBook/batchLearn/res';
import { businessEnvelope, gameFixture } from './fixture';
before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const candidate = { userSkillBookId: 2, skillId: 1, gradeLevel: 1, name: '青莲诀', skillType: '战技' };
const selection = { candidates: [candidate], skippedConflicts: [] };
const learned = { userSkillBookId: 2, success: true, message: '学习成功', skillBook: { name: '青莲诀', skillType: '战技' } };
const commands = { preview: '/一键学习功法', execute: '/一键学习功法 确认', cancel: '/取消一键学习功法' };
const noWrites = (values: string[]) => assert.ok(!values.some(command => /^(?:\/一键学习功法\s+确认|\/(?:学习功法|解锁|分解功法|换下))/.test(command)));
for (const mode of ['preview', 'execute', 'cancel'] as const) for (const isPrivate of [false, true]) for (const wire of ['http', 'feedback', 'structured', 'malformed', 'internal']) test(`batch learn ${mode} ${wire} private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, request => wire === 'http' ? { code: 'CONFLICT', message: '原拒绝' } : wire === 'internal' ? { code: 'INTERNAL', message: 'private commit SQL' } : businessEnvelope(request.bid, wire === 'malformed' ? {} : undefined, wire === 'malformed' ? [] : [{ title: '', heading: '原抬头', text: '原拒绝', quote: '原引用', blocks: [{ text: '原说明', quoted: true, inlineButtons: [{ label: '原内联', command: '/丹方' }] }], buttons: [{ label: '原返回', command: '/我的功法' }], advice: wire === 'structured' ? [{ command: '/我的信息', description: '原服务建议' }] : [] }]), wire === 'http' ? 409 : wire === 'internal' ? 500 : 200);
 const event = isPrivate ? app.events.privateMessage({ text: commands[mode], platform: 'qq-bot' }) : app.events.groupMessage({ text: commands[mode], platform: 'qq-bot' });
 const result = await app.runHandler(batch, event); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1); assert.ok(requests[0].path.endsWith('/skill-books.batch-learn')); assert.deepEqual(requests[0].body.arguments, { mode }); assert.ok(requests[0].idempotencyKey);
 assert.ok(view.text.includes(wire === 'malformed' || wire === 'internal' ? '未获完整确认' : '原拒绝')); assert.ok(!view.text.includes('private commit'));
 if (wire === 'feedback' || wire === 'structured') { for (const text of ['原抬头', '原引用', '原说明']) assert.ok(view.text.includes(text)); for (const command of ['/我的功法', '/丹方', '/我']) assert.ok(view.commands.includes(command)); }
 if (wire === 'structured') assert.ok(view.text.includes('原服务建议'));
 noWrites(view.commands); assert.equal(result.messages[0].target?.targetId, isPrivate ? event.UserId : event.ChannelId); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const isPrivate of [false, true]) for (const text of ['/一键学习功法 确认 多余', '/一键学习功法 不确认', '/一键学习功法 yes', '/一键学习功法 2', '/一键学习功法 取消', '/取消一键学习功法 确认', '/取消一键学习功法 多余']) test(`batch learn ambiguous input ${text} private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, () => { throw new Error('invalid input must not request'); });
 const result = await app.runHandler(batch, isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' })); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 0); assert.ok(view.text.includes('参数错误')); assert.ok(view.commands.includes('/我的功法')); noWrites(view.commands); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const isPrivate of [false, true]) for (const outcome of ['preview', 'success', 'partial', 'failed', 'skipped', 'cancel', 'empty']) test(`batch learn actual result ${outcome} private=${isPrivate}`, async t => {
 const candidate2 = { ...candidate, userSkillBookId: 3, skillId: 2, name: '玄冰诀' };
 const data = outcome === 'preview' ? { mode: 'preview', selection, results: [] } : { mode: 'execute', selection: { ...selection, candidates: outcome === 'partial' ? [candidate, candidate2] : [candidate], skippedConflicts: outcome === 'skipped' ? [{ name: '旧青莲', skillType: '战技', reason: '已有同技能功法' }, { name: '旧青莲', skillType: '战技', reason: '已有同技能功法' }] : [] }, results: outcome === 'failed' ? [{ ...learned, success: false, message: '该功法已被锁定，无法学习' }] : outcome === 'partial' ? [learned, { userSkillBookId: 3, success: false, message: '功法不存在或已被删除' }] : [learned] };
 const { app, requests } = await gameFixture(t, request => ['cancel', 'empty'].includes(outcome) ? businessEnvelope(request.bid, undefined, [{ title: '一键学习功法', heading: '', text: outcome === 'cancel' ? '已取消一键学习功法' : '暂无可学习的功法', buttons: [{ label: '原背包', command: '/我的储物袋 功法' }], advice: [] }]) : businessEnvelope(request.bid, data));
 const text = outcome === 'preview' ? commands.preview : outcome === 'cancel' ? commands.cancel : commands.execute;
 const result = await app.runHandler(batch, isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' })); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1); assert.deepEqual(requests[0].body.arguments, { mode: outcome === 'preview' ? 'preview' : outcome === 'cancel' ? 'cancel' : 'execute' });
 if (outcome === 'preview') { for (const text of ['预计学习 1 本', '青莲诀', '确认时重新筛选', '取消不撤销已学结果']) assert.ok(view.text.includes(text)); assert.ok(view.commands.includes(commands.execute)); assert.ok(view.commands.includes('/我的功法')); }
 else {
  noWrites(view.commands);
  if (outcome === 'cancel') { assert.ok(view.text.includes('取消只结束本次选择')); assert.ok(view.commands.includes(commands.preview)); }
  else if (outcome === 'empty') { assert.ok(view.text.includes('暂无可学习的功法')); assert.ok(view.commands.includes('/储物袋 功法')); }
  else if (outcome === 'failed') { assert.ok(view.text.includes('本次未成功学习功法')); assert.ok(view.text.includes('该功法已被锁定')); assert.ok(!view.text.includes('没有新功法可学习')); assert.ok(!view.text.includes('分解时')); }
  else { assert.ok(view.text.includes('成功学习 1 本')); if (outcome === 'partial') { assert.ok(view.text.includes('失败 1 本')); assert.ok(view.text.includes('功法不存在或已被删除')); assert.ok(view.text.includes('核对本人未学实例')); } if (outcome === 'skipped') { assert.ok(view.text.includes('旧青莲')); assert.ok(view.text.includes('×2')); assert.ok(view.text.includes('不会替换、返还或继承')); } }
 }
 assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const isPrivate of [false, true]) for (const kind of ['empty-selection', 'wrong-mode', 'preview-results', 'missing-result', 'wrong-id', 'success-no-book', 'cancel-data']) test(`batch learn contradictory receipt ${kind} private=${isPrivate}`, async t => {
 const data = { mode: kind === 'preview-results' ? 'preview' : 'execute', selection: kind === 'empty-selection' ? { candidates: [], skippedConflicts: [] } : selection, results: kind === 'missing-result' ? [] : kind === 'wrong-id' ? [{ ...learned, userSkillBookId: 99 }] : kind === 'success-no-book' ? [{ ...learned, skillBook: undefined }] : [learned] };
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
 const text = kind === 'cancel-data' ? commands.cancel : kind === 'wrong-mode' || kind === 'preview-results' ? commands.preview : commands.execute;
 const result = await app.runHandler(batch, isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' })); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1); assert.ok(view.text.includes('未获完整确认')); assert.ok(!view.text.includes('成功学习')); noWrites(view.commands); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
test('batch learn confirmation reselects current candidates and cancellation has no invented expiry', async t => {
 const newCandidate = { ...candidate, userSkillBookId: 9, name: '新入袋功法' };
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, requests.length === 1 ? { mode: 'preview', selection, results: [] } : { mode: 'execute', selection: { ...selection, candidates: [newCandidate] }, results: [{ ...learned, userSkillBookId: 9, skillBook: { name: newCandidate.name, skillType: newCandidate.skillType } }] }));
 const first = await app.runHandler(batch, app.events.groupMessage({ text: commands.preview, platform: 'qq-bot' }));
 assert.ok(inspectMessage(first.messages[0].nodes).text.includes('青莲诀'));
 await app.clock.advance(61_000);
 const result = await app.runHandler(batch, app.events.groupMessage({ text: commands.execute, platform: 'qq-bot' }));
 assert.equal(requests.length, 2); assert.deepEqual(requests.map(request => request.body.arguments), [{ mode: 'preview' }, { mode: 'execute' }]); const view = inspectMessage(result.messages[0].nodes); assert.ok(view.text.includes('新入袋功法')); assert.ok(!view.text.includes('过期')); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const mode of ['preview', 'execute', 'cancel'] as const) test(`batch learn real router ${mode} only dispatches once`, async t => {
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: mode === 'cancel' ? '已取消一键学习功法' : '暂无可学习的功法', buttons: [], advice: [] }]));
 const router = Router.create({ events: ['message.create', 'private.message.create'] }); router.use('一键学习功法', async () => ({ default: batch })); router.use('取消一键学习功法', async () => ({ default: batch })); await app.mount({ responseRouter: router.define });
 const event = app.events.groupMessage({ text: commands[mode], platform: 'qq-bot' }); const result = await app.dispatch(event); assert.equal(requests.length, 1); assert.deepEqual(requests[0].body.arguments, { mode }); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok); await app.dispatch({ ...event }); assert.equal(requests.length, 1);
});
