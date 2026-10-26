import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import batch from '../../src/response/skillBook/batchDecompose/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const options = { success: true, message: '原预览', totalCount: 2, processCount: 2, remainingCount: 0, totalExp: 4000, gradeBreakdown: [{ id: 1, gradeName: '下品', level: 1, count: 2 }], estimatedItems: [{ itemId: 1, name: '功法残页', quantity: 4, expValue: 1000 }] };
const preview = { mode: 'preview', options, preview: options, selectedGrade: { id: 1, name: '下品' } };
const receipt = { success: true, message: '成功分解2本功法', decomposedCount: 2, remainingCount: 0, totalExp: 4000, items: options.estimatedItems };
const noWrites = (commands: string[]) => assert.ok(!commands.some(command => command === '确认分解' || /^\/(?:分解功法|解锁|换下)/.test(command)));
for (const isPrivate of [false, true]) for (const reason of ['暂无可分解的功法', '无效的品级：不存在', '预览失败', '分解预览与确认品级范围不一致']) for (const wire of ['http', 'feedback']) {
 test(`batch skill query next steps ${reason} ${wire} private=${isPrivate}`, async t => {
  const { app, requests } = await gameFixture(t, request => wire === 'http' ? { code: 'CONFLICT', message: reason } : businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: reason, buttons: [], advice: [] }]), wire === 'http' ? 409 : 200);
  const event = isPrivate ? app.events.privateMessage({ text: '/一键分解功法 下品', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/一键分解功法 下品', platform: 'qq-bot' });
  const result = await app.runHandler(batch, event);
  const view = inspectMessage(result.messages[0].nodes);
  assert.equal(requests.length, 1); assert.ok(requests[0].path.endsWith('/skill-books.batch-decompose-query'));
  assert.deepEqual(requests[0].body.arguments, { gradeName: '下品' }); assert.ok(requests[0].idempotencyKey);
  assert.ok(view.text.includes(reason)); assert.ok(view.text.includes('不自动解锁或换下')); assert.ok(view.text.includes('新预览仍需你确认'));
  for (const command of ['/储物袋 功法', '/一键分解功法']) assert.ok(view.commands.includes(command)); noWrites(view.commands);
  assert.equal(result.messages[0].target?.targetId, isPrivate ? event.UserId : event.ChannelId);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
 });
}
for (const isPrivate of [false, true]) for (const phase of ['query', 'confirm']) test(`batch skill structured ${phase} feedback retained private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, request => phase === 'confirm' && requests.length === 1 ? businessEnvelope(request.bid, preview) : businessEnvelope(request.bid, undefined, [{ title: '', heading: '原抬头', text: '原拒绝', quote: '原引用', blocks: [{ text: '原说明', quoted: true, inlineButtons: [{ label: '原内联', command: '/丹方' }] }], buttons: [{ label: '原返回', command: '/我的功法' }], advice: [{ command: '/我的信息', description: '原服务建议' }] }]));
 const event = isPrivate ? app.events.privateMessage({ text: '/一键分解功法 下品', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/一键分解功法 下品', platform: 'qq-bot' });
 let result = await app.runHandler(batch, event);
 if (phase === 'confirm') result = await app.dispatch(isPrivate ? app.events.privateMessage({ text: '确认分解', platform: 'qq-bot' }) : app.events.groupMessage({ text: '确认分解', platform: 'qq-bot' }));
 const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, phase === 'query' ? 1 : 2);
 for (const text of ['原抬头', '原拒绝', '原引用', '原说明', '原服务建议']) assert.ok(view.text.includes(text), view.text);
 for (const command of ['/我的信息', '/我的功法', '/丹方', '/我']) assert.ok(view.commands.includes(command)); noWrites(view.commands);
 assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const isPrivate of [false, true]) for (const data of [
 {}, { mode: 'choose', options: { ...options, success: false } },
 { mode: 'choose', options: { ...options, totalCount: 0, processCount: 0, gradeBreakdown: [] } },
 { ...preview, preview: { ...options, success: false } },
 { ...preview, selectedGrade: { id: 2, name: '下品' } }
]) test(`batch skill invalid query cannot offer confirmation ${JSON.stringify(data).slice(0, 70)} private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
 const result = await app.runHandler(batch, isPrivate ? app.events.privateMessage({ text: '/一键分解功法 下品', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/一键分解功法 下品', platform: 'qq-bot' }));
 const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1); assert.ok(/未获完整确认|范围不一致/.test(view.text)); noWrites(view.commands);
 assert.ok(view.commands.includes('/储物袋 功法'));
 await app.dispatch(isPrivate ? app.events.privateMessage({ text: '确认分解', platform: 'qq-bot' }) : app.events.groupMessage({ text: '确认分解', platform: 'qq-bot' }));
 assert.equal(requests.length, 1);
 assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const isPrivate of [false, true]) for (const outcome of ['unknown', 'internal', 'changed', 'empty', 'false', 'too-many', 'success', 'remaining', 'cancel', 'timeout', 'hint']) test(`batch skill real confirmation ${outcome} private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, request => {
  if (requests.length === 1) return businessEnvelope(request.bid, preview);
  if (outcome === 'internal') throw new Error('private SQL commit error');
  if (outcome === 'changed' || outcome === 'empty') return businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: outcome === 'changed' ? '功法状态已变化，请重新确认分解' : '没有符合条件的功法可分解（未锁定、未学习、指定品级）', buttons: [{ label: '原返回', command: '/一键分解功法' }], advice: [] }]);
  return businessEnvelope(request.bid, outcome === 'unknown' ? {} : outcome === 'false' ? { ...receipt, success: false } : outcome === 'too-many' ? { ...receipt, decomposedCount: 301 } : outcome === 'remaining' ? { ...receipt, decomposedCount: 300, remainingCount: 2, totalExp: 600000, items: [{ ...options.estimatedItems[0], quantity: 600 }] } : receipt);
 });
 const event = isPrivate ? app.events.privateMessage({ text: '/一键分解功法 下品', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/一键分解功法 下品', platform: 'qq-bot' });
 const first = await app.runHandler(batch, event);
 const firstView = inspectMessage(first.messages[0].nodes);
 assert.ok(firstView.text.includes('请在60秒内回复【确认分解】或【取消】'));
 assert.ok(firstView.commands.includes('取消'));
 assert.ok(firstView.text.includes('确认时重新筛选当前品级范围')); assert.ok(firstView.text.includes('预估总经验：4000')); assert.ok(firstView.commands.includes('确认分解'));
 let result;
 if (outcome === 'timeout') result = await app.invoke(event, () => mock.timers.tick(60_000));
 else result = await app.dispatch(isPrivate ? app.events.privateMessage({ text: outcome === 'cancel' ? '取消' : outcome === 'hint' ? '别的消息' : '确认分解', platform: 'qq-bot' }) : app.events.groupMessage({ text: outcome === 'cancel' ? '取消' : outcome === 'hint' ? '别的消息' : '确认分解', platform: 'qq-bot' }));
 const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, ['cancel', 'timeout', 'hint'].includes(outcome) ? 1 : 2);
 if (requests.length === 2) { assert.ok(requests[1].path.endsWith('/skill-books.batch-decompose')); assert.deepEqual(requests[1].body.arguments, { gradeId: '1' }); assert.ok(requests[1].idempotencyKey); }
 if (['unknown', 'internal', 'false', 'too-many'].includes(outcome)) { assert.ok(view.text.includes('功法分解结果未获完整确认'), view.text); assert.ok(!view.text.includes('private SQL')); assert.ok(!view.text.includes('分解成功')); assert.ok(view.commands.includes('/储物袋 材料 经验材料')); }
 else if (outcome === 'changed') assert.ok(view.text.includes('不重复执行旧分解'));
 else if (outcome === 'empty') assert.ok(view.text.includes('不自动解锁或换下'));
 else if (outcome === 'success' || outcome === 'remaining') { assert.ok(view.text.includes('分解成功')); assert.ok(view.text.includes(`分解数量：${outcome === 'remaining' ? 300 : 2} 本`)); assert.ok(view.text.includes(`总计折算经验：${outcome === 'remaining' ? 600000 : 4000}`)); assert.ok(view.text.includes(`功法残页 x${outcome === 'remaining' ? 600 : 4}`)); if (outcome === 'remaining') assert.ok(view.text.includes('剩余2本')); assert.ok(view.commands.includes('/一键分解功法 下品')); }
 else assert.ok(view.text.includes(outcome === 'cancel' ? '已取消分解操作' : outcome === 'timeout' ? '确认超时' : '请回复【确认分解】或【取消】'));
 if (outcome !== 'hint') noWrites(view.commands);
 assert.equal(result.messages[0].target?.targetId, isPrivate ? event.UserId : event.ChannelId);
 assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
 const follow = await app.dispatch(isPrivate ? app.events.privateMessage({ text: '确认分解', platform: 'qq-bot' }) : app.events.groupMessage({ text: '确认分解', platform: 'qq-bot' }));
 assert.equal(requests.length, outcome === 'hint' ? 2 : ['cancel', 'timeout'].includes(outcome) ? 1 : 2);
 if (outcome === 'hint') assert.ok(inspectMessage(follow.messages[0].nodes).text.includes('分解成功'));
});
for (const isPrivate of [false, true]) for (const mode of ['choose', 'all', 'internal']) test(`batch skill ${mode} query keeps read/confirm boundary private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, request => {
  if (mode === 'internal') throw new Error('private grade query SQL');
  if (requests.length === 1) return businessEnvelope(request.bid, mode === 'choose' ? { mode: 'choose', options } : { ...preview, selectedGrade: { id: 0, name: '全部品级' } });
  return businessEnvelope(request.bid, receipt);
 });
 const event = isPrivate ? app.events.privateMessage({ text: '/一键分解功法' + (mode === 'all' ? ' 全部' : ''), platform: 'qq-bot' }) : app.events.groupMessage({ text: '/一键分解功法' + (mode === 'all' ? ' 全部' : ''), platform: 'qq-bot' });
 const result = await app.runHandler(batch, event);
 const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1); assert.deepEqual(requests[0].body.arguments, { gradeName: mode === 'all' ? '全部' : '' });
 assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
 if (mode === 'choose') { for (const command of ['/一键分解功法 全部', '/一键分解功法 下品']) assert.ok(view.commands.includes(command)); noWrites(view.commands); }
 else if (mode === 'internal') { assert.ok(view.text.includes('预览未获完整确认')); assert.ok(!view.text.includes('private grade')); noWrites(view.commands); }
 else {
  assert.ok(view.text.includes('全部品级')); assert.ok(view.commands.includes('确认分解'));
  const follow = await app.dispatch(isPrivate ? app.events.privateMessage({ text: '确认分解', platform: 'qq-bot' }) : app.events.groupMessage({ text: '确认分解', platform: 'qq-bot' }));
  assert.equal(requests.length, 2); assert.deepEqual(requests[1].body.arguments, { gradeId: null });
  assert.ok(inspectMessage(follow.messages[0].nodes).text.includes('分解成功'));
  assert.equal(follow.actions[follow.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
 }
});
