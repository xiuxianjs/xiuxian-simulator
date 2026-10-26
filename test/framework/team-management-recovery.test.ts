import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { createResult, ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import invite from '../../src/response/team/inviteTeam/res';
import kick from '../../src/response/team/kick/res';
import transfer from '../../src/response/team/transferLeader/res';
import position from '../../src/response/team/setPosition/res';
import cancel from '../../src/response/team/cancelInvitation/res';
import reject from '../../src/response/team/rejectInvitation/res';
import realm from '../../src/response/team/setRealm/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

const cases = [
  { handler: invite, command: "/邀请入队 2", reason: "受邀者境界不足", expected: "/我的队伍", text: "不足的是受邀者的境界" },
  { handler: invite, command: "/邀请入队 2", reason: "玩家已经在队伍中", expected: "/我的队伍", text: "已在队伍中的是受邀者" },
  { handler: invite, command: "/邀请入队 2", reason: "对方已关闭队伍邀请", expected: "/我的好友", text: "修改你自己的接收设置无效" },
  { handler: invite, command: "/邀请入队 2", reason: "只有队长可以邀请", expected: "/我的队伍", text: "当前队长" },
  { handler: invite, command: "/邀请入队 2", reason: "队伍人数已满", expected: "/我的队伍", text: "有空位后再邀请" },
  { handler: invite, command: "/邀请入队 2", reason: "已邀请该玩家", expected: "/我的队伍", text: "本人的邀请收件箱不包含已发出的邀请" },
  { handler: invite, command: "/邀请入队 2", reason: "队伍待处理邀请已达上限", expected: "/我的队伍", text: "原邀请回执中的编号" },
  { handler: invite, command: "/邀请入队 1", reason: "不能邀请自己", expected: "/我的好友", text: "其他道友" },
  { handler: kick, command: "/队伍踢出 1", reason: "不能踢出自己", expected: "/我的队伍", text: "须选择其他成员" },
  { handler: kick, command: "/队伍踢出 2", reason: "只有队长可以踢人", expected: "/我的队伍", text: "需要队长权限" },
  { handler: kick, command: "/队伍踢出 2", reason: "目标不在队伍中", expected: "/我的队伍", text: "真实UID" },
  { handler: transfer, command: "/转让队长 2", reason: "你还未加入队伍", expected: "/队伍列表", text: "加入后再按本人权限" },
  { handler: transfer, command: "/转让队长 2", reason: "你不是队长", expected: "/我的队伍", text: "当前队长" },
  { handler: transfer, command: "/转让队长 1", reason: "不能转让给自己", expected: "/我的队伍", text: "须选择其他成员" },
  { handler: transfer, command: "/转让队长 2", reason: "目标成员不在队伍中", expected: "/我的队伍", text: "真实UID" },
  { handler: position, command: "/队伍位置设置 2 3", reason: "该成员已经在此位置", expected: "/我的队伍", text: "无需再次移动" },
  { handler: position, command: "/队伍位置设置 2 7", reason: "位置序号必须在1-6之间", expected: "/我的队伍", text: "1至6的整数" },
  { handler: position, command: "/队伍位置设置 2 0", reason: "位置必须在1-6之间", expected: "/我的队伍", text: "1至6的整数" },
  { handler: position, command: "/队伍位置设置 2 3", reason: "队员编号无效", expected: "/我的队伍", text: "真实UID" },
  { handler: cancel, command: "/取消队伍邀请 2", reason: "邀请不存在或已处理", expected: "/我的队伍", text: "本队待处理邀请编号" },
  { handler: cancel, command: "/取消队伍邀请 2", reason: "邀请编号无效", expected: "/我的队伍", text: "本人邀请收件箱只显示收到的邀请" },
  { handler: cancel, command: "/取消队伍邀请 2", reason: "你还未加入队伍", expected: "/队伍列表", text: "加入后再按本人权限" },
  { handler: cancel, command: "/取消队伍邀请 2", reason: "你不是队长", expected: "/我的队伍", text: "当前队长" },
  { handler: reject, command: "/队伍邀请拒绝 2", reason: "队伍邀请不存在或已处理", expected: "/我的队伍邀请", text: "旧邀请不可用" },
  { handler: reject, command: "/队伍邀请拒绝 0", reason: "invitationId必须为正整数", expected: "/我的队伍邀请", text: "邀请编号" },
  { handler: realm, command: "/设置队伍境界门槛 炼气", reason: "境界不存在", expected: "/我的队伍", text: "完整境界名称" },
  { handler: realm, command: "/设置队伍境界门槛 炼气", reason: "你不是队长", expected: "/我的队伍", text: "需要队长权限" }
];
for (const entry of cases) for (const isPrivate of [false, true]) for (const mode of ['http', 'feedback']) {
  test(`${entry.command} private=${isPrivate} ${mode} ${entry.reason}`, async t => {
    const { app, requests } = await gameFixture(t, request => mode === 'http'
      ? { code: 'CONFLICT', message: entry.reason }
      : businessEnvelope(request.bid, undefined, [{ title: '队伍', heading: '', text: entry.reason, buttons: [], advice: [] }]),
    mode === 'http' ? 409 : 200);
    app.actions.on('mention.get', () => [createResult(ResultCode.Ok, 'No mentions', [])]);
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
    if (entry.command.startsWith('/邀请入队') && /受邀者|已经在队伍/.test(entry.reason)) {
      assert.ok(!view.text.includes('挑战主线获取修为'));
      assert.ok(!view.text.includes('核对当前修为和所需材料'));
    }
    if (entry.command.startsWith('/取消队伍邀请') || /已邀请|待处理邀请/.test(entry.reason)) assert.ok(!view.commands.includes('/我的队伍邀请'));
    assert.ok(!view.commands.some(command => /^\/(?:加入队伍|队伍同意|队伍拒绝|队伍邀请同意|离开队伍|解散队伍|转让队长|队伍踢出)(?:\s|$)/.test(command)));
    assert.equal(message.target?.targetId, isPrivate ? event.UserId : event.ChannelId);
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}



for (const entry of [
  { handler: invite, text: '/邀请入队', expected: '/我的好友' },
  { handler: kick, text: '/队伍踢出', expected: '/我的队伍' },
  { handler: transfer, text: '/转让队长', expected: '/我的队伍' },
  { handler: position, text: '/队伍位置设置', expected: '/我的队伍' }
]) for (const target of ['2', '@目标']) for (const isPrivate of [false, true]) {
  test(`目标未找到也发送明确反馈 ${entry.text} ${target} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { outcome: 'target_missing' }));
    app.actions.on('mention.get', () => [createResult(ResultCode.Ok, 'Target mention', [{ UserId: 'target-bid', IsBot: false }])]);
    const text = `${entry.text} ${target}${entry.handler === position ? ' 3' : ''}`;
    const event = isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].idempotencyKey);
    const args = requests[0].body.arguments;
    const selector = target === '2' ? { targetUid: '2' } : { targetBid: 'target-bid' };
    assert.deepEqual(args, entry.handler === invite || entry.handler === kick
      ? { target: target === '2' ? { uid: 2 } : { bid: 'target-bid' } }
      : { ...selector, ...(entry.handler === position ? { position: '3' } : {}) });
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes('未找到有效的目标'));
    assert.ok(view.commands.includes(entry.expected));
    assert.ok(!view.text.includes('成功'));
    assert.equal(message.target?.targetId, isPrivate ? event.UserId : event.ChannelId);
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const data of [{ id: 17, status: 0 }, { id: 17, status: 1 }, { status: 0 }, { id: -1, status: 0 }, { id: '17', status: 0 }]) for (const isPrivate of [false, true]) {
  test(`邀请成功仅待处理的真实编号提供撤销 ${JSON.stringify(data)} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
    const event = isPrivate ? app.events.privateMessage({ text: '/邀请入队 2', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/邀请入队 2', platform: 'qq-bot' });
    const result = await app.runHandler(invite, event);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].idempotencyKey);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    const cancellable = data.status === 0 && data.id === 17;
    assert.equal(view.text.includes('邀请编号：17'), cancellable);
    assert.equal(view.commands.includes('/取消队伍邀请 17'), cancellable);
    assert.ok(view.text.includes(data.status === 1 ? '对方已自动同意邀请' : '邀请已发送'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const command of ['/设置队伍境界门槛 无', '/设置队伍境界门槛 取消']) for (const isPrivate of [false, true]) {
  test(`取消门槛未生效不能报告成功 ${command} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { outcome: 'cancel_noop', realmId: null }));
    const event = isPrivate ? app.events.privateMessage({ text: command, platform: 'qq-bot' }) : app.events.groupMessage({ text: command, platform: 'qq-bot' });
    const result = await app.runHandler(realm, event);
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].body.arguments, { realmName: null });
    assert.ok(requests[0].idempotencyKey);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes('本次未取消境界门槛'));
    assert.ok(!view.text.includes('已取消队伍境界门槛'));
    assert.ok(view.commands.includes('/我的队伍'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
