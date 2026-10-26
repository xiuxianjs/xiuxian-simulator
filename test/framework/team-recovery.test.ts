import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import create from '../../src/response/team/createTeam/res';
import apply from '../../src/response/team/joinTeam/res';
import approve from '../../src/response/team/approve/res';
import reject from '../../src/response/team/reject/res';
import disband from '../../src/response/team/disbandTeam/res';
import accept from '../../src/response/team/acceptInvitation/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

const cases = [
  { handler: create, command: "/创建队伍", reason: "玩家已经在队伍中", expected: "/我的队伍", text: "已有队伍时不能重复创建或加入" },
  { handler: apply, command: "/加入队伍 2", reason: "玩家已经在队伍中", expected: "/我的队伍", text: "是否离队由你决定" },
  { handler: apply, command: "/加入队伍 2", reason: "队伍人数已满", expected: "/队伍列表", text: "仍可加入的队伍" },
  { handler: approve, command: "/队伍同意 2", reason: "队伍人数已满", expected: "/我的队伍", text: "有空位后再审核" },
  { handler: approve, command: "/队伍同意 2", reason: "申请者境界不足", expected: "/我的队伍", text: "提升队长自身境界不能替申请人达标" },
  { handler: approve, command: "/队伍同意 2", reason: "申请者已加入其他队伍", expected: "/队伍申请", text: "本次拒绝不代表申请已删除" },
  { handler: approve, command: "/队伍同意 2", reason: "只有队长可以审核申请", expected: "/我的队伍", text: "请当前队长处理" },
  { handler: disband, command: "/解散队伍", reason: "只有队长可以解散队伍", expected: "/我的队伍", text: "请当前队长处理" },
  { handler: reject, command: "/队伍拒绝 2", reason: "队伍申请不存在或已处理", expected: "/队伍申请", text: "旧申请失效不代表本次已经同意" },
  { handler: apply, command: "/加入队伍 2", reason: "已申请该队伍，请等待审核", expected: "/我的队伍申请", text: "等待队长处理" },
  { handler: apply, command: "/加入队伍 2", reason: "待审核队伍申请已达上限", expected: "/我的队伍申请", text: "自行选择不再需要的申请取消" },
  { handler: accept, command: "/队伍邀请同意 2", reason: "队伍邀请不存在或已处理", expected: "/我的队伍邀请", text: "旧邀请不可用不等于本次已经入队" },
  { handler: accept, command: "/队伍邀请同意 2", reason: "队伍人数已满", expected: "/队伍列表", text: "等待目标队伍出现空位" },
  { handler: accept, command: "/队伍邀请同意 2", reason: "玩家已经在队伍中", expected: "/我的队伍", text: "先核对当前成员" },
  { handler: apply, command: "/加入队伍", reason: "teamId必须为正整数", expected: "/队伍列表", text: "按列表中的队伍编号申请" },
  { handler: approve, command: "/队伍同意 0", reason: "applicationId必须为正整数", expected: "/队伍申请", text: "队伍编号与申请编号不同" },
  { handler: accept, command: "/队伍邀请同意 0", reason: "invitationId必须为正整数", expected: "/我的队伍邀请", text: "不能用队伍编号代替邀请编号" },
  { handler: apply, command: "/加入队伍 2", reason: "境界不足，无法申请该队伍", expected: "/查看主线", text: "挑战主线获取修为" },
  { handler: accept, command: "/队伍邀请同意 2", reason: "境界不足", expected: "/我的境界", text: "核对当前修为和所需材料" }
];
for (const entry of cases) for (const isPrivate of [false, true]) for (const mode of ['http', 'feedback']) {
  test(`${entry.command} private=${isPrivate} ${mode} ${entry.reason}`, async t => {
    const { app, requests } = await gameFixture(t, request => mode === 'http'
      ? { code: 'CONFLICT', message: entry.reason }
      : businessEnvelope(request.bid, undefined, [{ title: '队伍', heading: '', text: entry.reason, buttons: [], advice: [] }]),
    mode === 'http' ? 409 : 200);
    const event = isPrivate
      ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' })
      : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].idempotencyKey);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(entry.reason));
    assert.ok(view.text.includes(entry.text), view.text);
    assert.ok(view.commands.includes(entry.expected));
    assert.ok(!view.commands.some(command => /^\/(?:加入队伍|队伍同意|队伍拒绝|队伍邀请同意|离开队伍|解散队伍|转让队长|队伍踢出)(?:\s|$)/.test(command)));
    assert.equal(message.target?.targetId, isPrivate ? event.UserId : event.ChannelId);
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}


for (const isPrivate of [false, true]) {
  test(`创建成功不再引导重复入队 private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { id: 23 }));
    const event = isPrivate ? app.events.privateMessage({ text: '/创建队伍', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/创建队伍', platform: 'qq-bot' });
    const result = await app.runHandler(create, event);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].idempotencyKey);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes('队伍ID：23'));
    assert.ok(view.commands.includes('/我的队伍'));
    assert.ok(view.commands.includes('/队伍申请'));
    assert.ok(!view.commands.some(command => command.startsWith('/加入队伍')));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const text of ['队伍服务未启用', '创建队伍响应不完整', 'record not found']) {
  test(`未知或服务错误不猜测队伍状态：${text}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{ title: '队伍', heading: '', text, buttons: [], advice: [] }]));
    const result = await app.runHandler(create, app.events.privateMessage({ text: '/创建队伍', platform: 'qq-bot' }));
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(text));
    assert.ok(!view.text.includes('建议：'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
