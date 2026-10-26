import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import list from '../../src/response/email/MyEmailList/res';
import detail from '../../src/response/email/findEmail/res';
import claim from '../../src/response/email/receiveEmail/res';
import claimAll from '../../src/response/email/receiveAllEmail/res';
import remove from '../../src/response/email/deleteEmail/res';
import removeAll from '../../src/response/email/deleteAllEmail/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const entries = [
  { handler: list, command: '/我的邮件', operation: 'emails.list', args: { pageText: '1' }, expected: '/我的邮件 1', fallback: '邮件列表查询失败' },
  { handler: detail, command: '/查看邮件 101', operation: 'emails.detail', args: { idText: '101', idValue: '101' }, expected: '/我的邮件', fallback: '邮件详情查询失败' },
  { handler: claim, command: '/领取邮件 101', operation: 'emails.claim', args: { emailId: 101 }, expected: '/我的邮件', fallback: '领取结果未获完整确认' },
  { handler: claimAll, command: '/一键领取邮件', operation: 'emails.claim-all', args: {}, expected: '/我的邮件', fallback: '领取结果未获完整确认' },
  { handler: remove, command: '/删除邮件 101', operation: 'emails.delete', args: { emailId: 101 }, expected: '/我的邮件', fallback: '删除结果未获完整确认' },
  { handler: removeAll, command: '/一键删除邮件', operation: 'emails.delete-all', args: {}, expected: '/我的邮件', fallback: '删除结果未获完整确认' }
];
const cases = [
  { ...entries[0], reason: '暂无邮件', text: '列表空白或查询失败不证明奖励未发放' },
  { ...entries[1], reason: '没有找到编号为 101 的邮件', text: '不使用页内序号' },
  { ...entries[2], reason: '请输入正确的邮件ID', text: '不使用页内序号' },
  { ...entries[2], reason: '领取失败，邮件不存在或已领取\n\n重复提醒', text: '通用失败不能证明附件未到账' },
  { ...entries[3], reason: '暂无可领取的邮件附件', text: '本条汇总未提供逐封成功明细' },
  { ...entries[3], reason: '所有邮件附件已领取过，无需重复领取', text: '不能据此认定每封附件都已到账' },
  { ...entries[3], reason: '操作失败，请稍后再试', text: '不自动重复领取' },
  { ...entries[4], reason: '请输入正确的邮件ID', text: '从本人当前列表使用查看按钮' },
  { ...entries[4], reason: '无法删除该邮件（可能已删除或邮件不存在）', text: '不认定未删除' },
  { ...entries[5], reason: '暂无可删除的邮件', text: '已领取邮件或已读且无附件' },
  { ...entries[5], reason: '操作失败，请稍后再试', text: '不自动重发确认' }
];
for (const entry of cases) for (const isPrivate of [false, true]) for (const mode of ['http', 'feedback']) {
  test(`${entry.command} ${mode} private=${isPrivate} ${entry.reason}`, async t => {
    const { app, requests } = await gameFixture(t, request => mode === 'http' ? { code: 'CONFLICT', message: entry.reason }
      : businessEnvelope(request.bid, undefined, [{ title: '邮件', heading: '', text: entry.reason, buttons: [], advice: [] }]), mode === 'http' ? 409 : 200);
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].path.endsWith('/' + entry.operation));
    assert.deepEqual(requests[0].body.arguments, entry.args);
    assert.ok(requests[0].idempotencyKey);
    assert.equal(result.messages.length, 1);
    const view = inspectMessage(result.messages[0].nodes);
    assert.ok(view.text.includes(entry.reason));
    assert.ok(view.text.includes(entry.text), view.text);
    assert.ok(view.commands.includes(entry.expected));
    assert.ok(!view.commands.some(command => /^\/(领取邮件|删除邮件)\s/.test(command)));
    if (entry.reason.includes('重复提醒')) assert.equal(view.text.split('重复提醒').length - 1, 1);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const entry of entries) for (const isPrivate of [false, true]) {
  test(`${entry.command} incomplete receipt never proves missing or completed private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, {}));
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    assert.ok(view.text.includes(entry.fallback), view.text);
    assert.ok(view.commands.includes(entry.expected));
    assert.ok(!view.text.includes('领取成功'));
    assert.ok(!view.text.includes('删除完成'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const total of [0, 7]) for (const isPrivate of [false, true]) {
  test(`empty current email page preserves total=${total} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { pageText: '3', data: { total, list: [], hasClaimable: false, hasDeletable: false } }));
    const event = isPrivate ? app.events.privateMessage({ text: '/我的邮件 3', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/我的邮件 3', platform: 'qq-bot' });
    const result = await app.runHandler(list, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.ok(view.text.includes(total ? '本页暂无邮件，当前共 7 封邮件' : '暂无邮件'));
    assert.ok(view.commands.includes('/我的邮件 1'));
    assert.ok(!view.commands.includes('/一键领取邮件'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const isPrivate of [false, true]) {
  test(`partial email claim retains committed count without replay private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { claimed: 2, skipped: 1, total: 5 }));
    const event = isPrivate ? app.events.privateMessage({ text: '/一键领取邮件', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/一键领取邮件', platform: 'qq-bot' });
    const result = await app.runHandler(claimAll, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.ok(view.text.includes('成功领取 2 封邮件的附件'));
    assert.ok(view.text.includes('1 封未领取成功'));
    assert.ok(view.text.includes('不会因其他邮件失败而回滚'));
    assert.ok(!view.commands.includes('/一键领取邮件'));
    assert.ok(view.commands.includes('/我的邮件'));
    assert.ok(view.commands.includes('/储物袋'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
  test(`delete confirmation preserves original ID and server window private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { emailId: 101, deleted: false, confirmationRequired: true, confirmationExpiresInSeconds: 60 }));
    const event = isPrivate ? app.events.privateMessage({ text: '/删除邮件 101', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/删除邮件 101', platform: 'qq-bot' });
    const result = await app.runHandler(remove, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.ok(view.text.includes('60秒内有效'));
    assert.ok(view.commands.includes('/删除邮件 101'));
    assert.ok(!view.text.includes('删除完成'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const entry of entries) for (const isPrivate of [false, true]) {
  test(`${entry.command} server advice and blocks preserved private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{
      title: '邮件', heading: '', text: '原拒绝', quote: '原引用', blocks: [{ text: '原说明', quoted: true }],
      advice: [{ command: '/我的信息', description: '原建议' }], buttons: [{ label: '原返回', command: '/更多' }]
    }]));
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    for (const text of ['原拒绝', '原引用', '原说明', '原建议']) assert.ok(view.text.includes(text), view.text);
    for (const command of ['/我的信息', '/更多']) assert.ok(view.commands.includes(command));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
