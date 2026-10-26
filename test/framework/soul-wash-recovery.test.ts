import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, Router, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import preview from '../../src/response/soulArtifact/wash/res';
import confirm from '../../src/response/soulArtifact/washConfirm/res';
import cancel from '../../src/response/soulArtifact/washCancel/res';
import { businessEnvelope, gameFixture } from './fixture';
before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const entries = [
  { handler: preview, command: '/本命物洗涤', op: 'soul-artifacts.wash', args: { count: null } },
  { handler: confirm, command: '/确认本命物洗涤', op: 'soul-artifacts.wash-confirm', args: {} },
  { handler: cancel, command: '/取消本命物洗涤', op: 'soul-artifacts.wash-cancel', args: {} }
];
const pending = { instanceId: 9, artifactId: 7, artifactName: '青莲', times: 1, totalSuccess: 1, createdAt: 123, finalMessage: '已生成1次洗涤预览', results: [{ success: true, action: 'add', details: ['气血 +10'] }] };
const payloads = [{ pending }, { pending, message: '已保留 1 次本命物洗涤结果' }, { status: 'cancelled', totalSuccess: 1, message: '已放弃 1 次洗涤结果，洗涤石不返还，当前本命物效果保持不变' }];
const refusals = [
  { index: 0, text: '金丹及以上方可洗涤本命物', hint: '优先推进主线' },
  { index: 0, text: '需达到筑基初期后开放本命物·炼化', hint: '优先推进主线' },
  { index: 0, text: '请先炼化本命物', hint: '不自动炼化' },
  { index: 0, text: '洗涤石不足', hint: '持有数量' },
  { index: 0, text: '你有一份本命物洗涤结果待确认，请先发送 /确认本命物洗涤 或 /取消本命物洗涤', hint: '有效期60秒' },
  { index: 0, text: '当前没有可洗涤的成长结果', hint: '不反复确认旧结果' },
  { index: 0, text: '所有可用词条已达洗涤上限，无需继续洗涤', hint: '不以补充洗涤石' },
  { index: 0, text: '本命物洗涤仅支持单次，请直接发送 /本命物洗涤', hint: '不附数量' },
  { index: 1, text: '当前没有待确认的本命物洗涤结果', hint: '预览过期不代表洗涤石返还' },
  { index: 1, text: '待确认的本命物已不存在，结果已作废', hint: '旧结果当前不可继续' },
  { index: 2, text: '当前没有待取消的本命物洗涤结果', hint: '不反复确认旧结果' },
  { index: 2, text: '洗涤状态异常，请稍后重试', hint: '不直接重新洗涤' },
  { index: 2, text: '操作繁忙，请稍后再试', hint: '不重新生成预览' },
  { index: 1, text: '本命物服务尚未配置', hint: '失败提示不证明' }
];
const mutation = /^\/(?:本命物洗涤|确认本命物洗涤|取消本命物洗涤|炼化本命物)(?:\s|$)/;
for (const isPrivate of [false, true]) for (const wire of ['http', 'feedback']) for (const refusal of refusals) {
  test(`soul wash refusal ${refusal.text} ${wire} private=${isPrivate}`, async t => {
    const entry = entries[refusal.index];
    const { app, requests } = await gameFixture(t, request => wire === 'http' ? { code: 'CONFLICT', message: refusal.text } : businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: refusal.text, buttons: [], advice: [] }]), wire === 'http' ? 409 : 200);
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].path.endsWith('/' + entry.op));
    assert.deepEqual(requests[0].body.arguments, entry.args);
    assert.ok(requests[0].idempotencyKey);
    assert.ok(view.text.includes(refusal.text));
    assert.ok(view.text.includes(refusal.hint), view.text);
    assert.ok(!view.commands.some(command => mutation.test(command)));
    assert.equal(result.messages[0].target?.targetId, isPrivate ? event.UserId : event.ChannelId);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const entry of entries) for (const isPrivate of [false, true]) {
  test(`soul wash structured preservation ${entry.op} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{ title: '', heading: '原抬头', text: '原拒绝', quote: '原引用', blocks: [{ text: '原拒绝', quoted: false }, { text: '原说明', quoted: true, inlineButtons: [{ label: '原内联', command: '/丹方' }] }], buttons: [{ label: '原返回', command: '/我' }], advice: [{ command: '/储物袋', description: '原服务建议' }] }]));
    const result = await app.runHandler(entry.handler, isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' }));
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    for (const text of ['原抬头', '原引用', '原说明', '原服务建议', '失败提示不证明']) assert.ok(view.text.includes(text));
    for (const command of ['/我', '/丹方', '/本命物信息', '/储物袋']) assert.ok(view.commands.includes(command));
    assert.equal(view.text.split('原拒绝').length - 1, 1);
    assert.ok(!view.commands.some(command => mutation.test(command)));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
  for (const wire of ['malformed', 'internal']) {
    test(`soul wash uncertain ${entry.op} ${wire} private=${isPrivate}`, async t => {
      const { app, requests } = await gameFixture(t, request => wire === 'internal' ? { code: 'INTERNAL', message: 'private commit error' } : businessEnvelope(request.bid, {}), wire === 'internal' ? 500 : 200);
      const result = await app.runHandler(entry.handler, isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' }));
      const view = inspectMessage(result.messages[0].nodes);
      assert.equal(requests.length, 1);
      assert.ok(view.text.includes('本命物洗涤结果未获完整确认'));
      assert.ok(!view.text.includes('private commit'));
      assert.ok(view.commands.includes('/本命物信息'));
      assert.ok(view.commands.includes('/储物袋'));
      assert.ok(!view.commands.some(command => mutation.test(command)));
      assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    });
  }
}
for (const [index, entry] of entries.entries()) {
  test(`soul wash real router and unchanged result ${entry.op}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, payloads[index]));
    const router = Router.create({ events: ['message.create', 'private.message.create'] });
    router.use(entry.command.slice(1), async () => ({ default: entry.handler }));
    await app.mount({ responseRouter: router.define });
    const event = app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.dispatch(event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    if (index === 0) { assert.ok(view.text.includes('有效期60秒')); assert.ok(view.commands.includes('/确认本命物洗涤')); assert.ok(view.commands.includes('/取消本命物洗涤')); assert.ok(view.text.includes('气血 +10')); }
    if (index === 1) { assert.ok(view.text.includes('已保留 1 次')); assert.ok(view.commands.includes('/本命物信息')); }
    if (index === 2) { assert.ok(view.text.includes('洗涤石不返还')); assert.ok(view.commands.includes('/本命物洗涤')); }
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    await app.dispatch({ ...event });
    assert.equal(requests.length, 1);
  });
}

for (const isPrivate of [false, true]) for (const text of ['/本命物洗涤 abc', '/本命物洗涤 -1', '/本命物洗涤 1.5']) {
  test(`invalid wash input never creates paid preview ${text} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, payloads[0]));
    const result = await app.runHandler(preview, isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' }));
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 0);
    assert.ok(view.text.includes('仅支持单次'));
    assert.ok(view.text.includes('不附数量'));
    assert.ok(view.commands.includes('/本命物信息'));
    assert.ok(!view.commands.some(command => mutation.test(command)));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const isPrivate of [false, true]) {
  test(`numeric wash count remains server-owned private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: '本命物洗涤仅支持单次，请直接发送 /本命物洗涤', buttons: [], advice: [] }]));
    const result = await app.runHandler(preview, isPrivate ? app.events.privateMessage({ text: '/本命物洗涤 002', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/本命物洗涤 002', platform: 'qq-bot' }));
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].body.arguments, { count: '002' });
    assert.ok(inspectMessage(result.messages[0].nodes).text.includes('仅支持单次'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

for (const entry of entries.slice(1)) for (const isPrivate of [false, true]) for (const suffix of [' 3', ' abc', '确认']) {
  test(`invalid decision never applies pending result ${entry.command}${suffix} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, payloads[entries.indexOf(entry)]));
    const text = entry.command + suffix;
    const result = await app.runHandler(entry.handler, isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' }));
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 0);
    assert.ok(view.text.includes('确认与取消不接收参数'));
    assert.ok(view.text.includes('不附编号或数量'));
    assert.ok(view.commands.includes('/本命物信息'));
    assert.ok(!view.commands.some(command => mutation.test(command)));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
