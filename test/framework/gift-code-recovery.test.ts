import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import hub from '../../src/response/redeemCode/res';
import redeem from '../../src/response/redeemCode/claim/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const entries = [
  { handler: hub, command: '/兑换码', operation: 'gift-codes.hub', args: {}, expected: '/我的信息', fallback: '兑换码入口加载失败' },
  { handler: redeem, command: '/礼包码 ab cd', operation: 'gift-codes.redeem', args: { code: 'ABCD' }, expected: '/我的邮件', fallback: '礼包码兑换失败' },
];
const cases = [
  { ...entries[0], reason: '入口暂不可用', detail: '不据此判断已有兑换或邮件失效' },
  { ...entries[1], reason: '礼包码已达到个人领取上限', detail: '不代表上限会每日重置' },
  { ...entries[1], reason: '礼包码已领取', detail: '先核对之前的礼包邮件' },
  { ...entries[1], reason: '礼包码已被使用或正在处理中', detail: '不能只凭这次提示判断是否已发给本人' },
  { ...entries[1], reason: '礼包领取正在处理中，请稍后重试', detail: '核对领取状态' },
  { ...entries[1], reason: '礼包码不在有效期内', expected: '/兑换码', detail: '尚未开始和已过期不能混为一谈' },
  { ...entries[1], reason: '礼包码不存在或已失效', expected: '/兑换码', detail: '向兑换码发布方核对完整码' },
  { ...entries[1], reason: '礼包码已领完', expected: '/兑换码', detail: '剩余名额' },
  { ...entries[1], reason: '运营服务未初始化\n\n重复提醒', detail: '不能认定未发奖' },
];
for (const entry of cases) for (const isPrivate of [false, true]) for (const mode of ['http', 'feedback']) {
  test(`${entry.command} private=${isPrivate} ${mode} ${entry.reason}`, async t => {
    const { app, requests } = await gameFixture(t, request => mode === 'http' ? { code: 'CONFLICT', message: entry.reason }
      : businessEnvelope(request.bid, undefined, [{ title: '礼包', heading: '', text: entry.reason, buttons: [], advice: [] }]), mode === 'http' ? 409 : 200);
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].path.endsWith('/' + entry.operation));
    assert.deepEqual(requests[0].body.arguments, entry.args);
    assert.ok(requests[0].idempotencyKey);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(entry.reason));
    assert.ok(view.text.includes(entry.detail), view.text);
    assert.ok(view.commands.includes(entry.expected));
    assert.ok(!view.commands.some(command => /^\/礼包码\s/.test(command)));
    if (entry.reason.includes('重复提醒')) assert.equal(view.text.split('重复提醒').length - 1, 1);
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const entry of entries) for (const isPrivate of [false, true]) {
  test(`${entry.command} incomplete result has advice private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, {}));
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const view = inspectMessage(result.messages[0].nodes);
    assert.ok(view.text.includes(entry.fallback), view.text);
    assert.ok(view.commands.includes(entry.expected));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const command of ['/礼包码', '/礼品码']) for (const isPrivate of [false, true]) {
  test(`${command} missing code never creates executable fake code private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { outcome: 'usage' }));
    const event = isPrivate ? app.events.privateMessage({ text: command, platform: 'qq-bot' }) : app.events.groupMessage({ text: command, platform: 'qq-bot' });
    const result = await app.runHandler(redeem, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].body.arguments, { code: '' });
    assert.ok(view.text.includes('真实兑换码'));
    assert.ok(view.text.includes('示例文本不是可领取的礼包'));
    assert.ok(!view.commands.includes('/礼包码 ABCD1234'));
    for (const command of ['/兑换码', '/我的邮件']) assert.ok(view.commands.includes(command));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const kind of ['custom']) for (const isPrivate of [false, true]) {
  test(`${kind} settled mail and pending remote confirmation stay authoritative private=${isPrivate}`, async t => {
    const text = '兑换成功，奖励已发送至邮件';
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { outcome: 'result', kind, data: { message: text, rewardSummary: ['灵石 ×11'] } }));
    const event = isPrivate ? app.events.privateMessage({ text: '/礼包码 fixture', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/礼包码 fixture', platform: 'qq-bot' });
    const result = await app.runHandler(redeem, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.ok(view.text.includes(text));
    assert.ok(view.text.includes('灵石 ×11'));
    assert.ok(view.commands.includes('/我的邮件'));
    assert.ok(!view.commands.some(command => /^\/礼包码\s/.test(command)));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const entry of entries.slice(1)) for (const isPrivate of [false, true]) {
  test(`${entry.command} existing advice/quotes survive private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{
      title: '礼包', heading: '', text: '原拒绝', quote: '原引用', blocks: [{ text: '原说明', quoted: true }],
      buttons: [{ label: '查询本人', command: '/我的信息' }], advice: [{ command: '/兑换码', description: '原建议' }]
    }]));
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    for (const text of ['原拒绝', '原引用', '原说明', '原建议']) assert.ok(view.text.includes(text), view.text);
    for (const command of ['/兑换码', '/我的信息']) assert.ok(view.commands.includes(command));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

for (const kind of ['comeback', 'test']) test(`retired ${kind} response cannot render a successful claim`, async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { outcome: 'result', kind, data: { message: '旧礼包发放成功', rewardSummary: ['礼盒 ×1'] } }));
  const result = await app.runHandler(redeem, app.events.privateMessage({ text: '/礼包码 OLD', platform: 'qq-bot' }));
  assert.equal(requests.length, 1);
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  const view = inspectMessage(message.nodes);
  assert.match(view.text, /礼包码兑换失败/);
  assert.doesNotMatch(view.text, /旧礼包发放成功|礼盒 ×1/);
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
});
