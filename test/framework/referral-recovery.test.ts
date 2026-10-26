import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import bind from '../../src/response/referral/bindCode/res';
import claim from '../../src/response/referral/claimReward/res';
import code from '../../src/response/referral/viewCode/res';
import invitees from '../../src/response/referral/invitees/res';
import count from '../../src/response/referral/rewardRules/count/res';
import realm from '../../src/response/referral/rewardRules/realm/res';
import vip from '../../src/response/referral/rewardRules/vip/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const entries = [
  { handler: bind, command: '/绑定邀请码 tt-2', operation: 'referral.bind', args: { code: 'tt-2' }, expected: '/我的信息', fallback: '绑定失败' },
  { handler: claim, command: '/领取邀请奖励', operation: 'referral.claim', args: {}, expected: '/我的邀请', fallback: '领取失败' },
  { handler: code, command: '/邀请码', operation: 'referral.code', args: {}, expected: '/我的邀请', fallback: '查询邀请码信息失败' },
  { handler: invitees, command: '/我的邀请', operation: 'referral.invitees', args: { page: 1 }, expected: '/我的邀请 1', fallback: '服务暂时不可用' },
  { handler: count, command: '/邀请人数奖励', operation: 'referral.rules-count', args: {}, expected: '/我的邀请', fallback: '查询失败' },
  { handler: realm, command: '/邀请境界奖励', operation: 'referral.rules-realm', args: {}, expected: '/我的邀请', fallback: '查询失败' },
  { handler: vip, command: '/邀请VIP奖励', operation: 'referral.rules-vip', args: {}, expected: '/我的邀请', fallback: '查询失败' }
];
const cases = [
  ...entries.map(entry => ({ ...entry, reason: '原操作未获完整确认\n\n重复提醒', text: entry.handler === bind ? '不自动换码重绑' : entry.handler === claim ? '失败不能证明奖励未到账' : entry.handler === invitees ? '查询失败不代表绑定记录丢失' : '邀请码及规则页可能已同步达成记录' })),
  { ...entries[0], reason: '邀请码格式错误，请输入 tt-uid', expected: '/邀请码', text: '真实、完整的小写tt-开头邀请码' },
  { ...entries[0], reason: '不能绑定自己的邀请码', expected: '/邀请码', text: '不能用自己的码绑定' },
  { ...entries[0], reason: '邀请码对应的玩家不存在', expected: '/邀请码', text: '请邀请人提供' },
  { ...entries[0], reason: '仅可在注册30天内绑定邀请码', expected: '/邀请码', text: '提升境界或更换码不能延长窗口' },
  { ...entries[0], reason: '你已经绑定过邀请码了', text: '邀请码页展示本人对外的码而非已绑定对象' },
  { ...entries[1], reason: '暂无可领取的奖励', text: '邀请人提升自己不能替对方达标' },
  { ...entries[1], reason: '旧奖励缺少可恢复快照，请联系管理员核对', text: '不能修复历史奖励数据' },
  { ...entries[1], reason: '已达成奖励快照异常', text: '不将当前配置替代已达成奖励' },
  { ...entries[1], reason: '奖励配置已失效，无法领取', text: '联系管理员核对已达成奖励快照' }
];
for (const entry of cases) for (const isPrivate of [false, true]) for (const mode of ['http', 'feedback']) {
  test(`${entry.command} ${mode} private=${isPrivate} ${entry.reason}`, async t => {
    const { app, requests } = await gameFixture(t, request => mode === 'http' ? { code: 'CONFLICT', message: entry.reason }
      : businessEnvelope(request.bid, undefined, [{ title: '邀请', heading: '', text: entry.reason, buttons: [], advice: [] }]), mode === 'http' ? 409 : 200);
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
    assert.ok(!view.commands.includes('/领取邀请奖励'));
    assert.ok(!view.commands.some(command => /^\/绑定邀请码\s/.test(command)));
    if (entry.reason.includes('重复提醒')) assert.equal(view.text.split('重复提醒').length - 1, 1);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const entry of entries) for (const isPrivate of [false, true]) {
  test(`${entry.command} malformed result includes next action private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, {}));
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.ok(view.text.includes(entry.fallback), view.text);
    assert.ok(view.commands.includes(entry.expected));
    assert.ok(!view.commands.includes('/领取邀请奖励'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
const overview = (pendingCount: number) => ({ code: 'tt-1', inviteCount: 2, inviteLimit: null, pendingRewards: pendingCount, rulePanels: {
  count: { pendingCount, groups: [] }, realm_level: { pendingCount, groups: [] }, vip_level: { pendingCount, groups: [] }
} });
for (const entry of entries.slice(4)) for (const pending of [0, 1]) for (const isPrivate of [false, true]) {
  test(`${entry.command} empty rules retain historical pending=${pending} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, overview(pending)));
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.ok(view.text.includes('暂无'));
    assert.ok(view.text.includes('不能据此判断历史已达成记录失效'));
    assert.equal(view.commands.includes('/领取邀请奖励'), pending > 0);
    assert.ok(view.commands.includes('/我的邀请'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const total of [0, 7]) for (const isPrivate of [false, true]) {
  test(`empty invitee page retains total=${total} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { items: [], page: 3, pageSize: 5, total }));
    const event = isPrivate ? app.events.privateMessage({ text: '/我的邀请 3', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/我的邀请 3', platform: 'qq-bot' });
    const result = await app.runHandler(invitees, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.ok(view.text.includes(`我邀请的道友：${total} 人`));
    assert.ok(view.commands.includes('/我的邀请 1'));
    assert.ok(!view.commands.includes('/领取邀请奖励'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const entry of entries) for (const isPrivate of [false, true]) {
  test(`${entry.command} original structured advice retained private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{
      title: '邀请', heading: '', text: '原原因', quote: '原引用', blocks: [{ text: '原说明', quoted: true }],
      advice: [{ command: '/我的信息', description: '原建议' }], buttons: [{ label: '查看进度', command: '/我的邀请' }]
    }]));
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    for (const text of ['原原因', '原引用', '原说明', '原建议']) assert.ok(view.text.includes(text), view.text);
    for (const command of ['/我的信息', '/我的邀请']) assert.ok(view.commands.includes(command));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
