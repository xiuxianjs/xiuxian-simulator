import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { createResult, ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import request from '../../src/response/friend/befriend/res';
import accept from '../../src/response/friend/acceptBefriend/res';
import reject from '../../src/response/friend/rejectBefriend/res';
import remove from '../../src/response/friend/deleteFriend/res';
import requestsList from '../../src/response/friend/friendRequest/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

const cases = [
  { handler: request, command: "/结交 2", reason: "不能添加自己为好友", expected: "/随机好友", text: "真实UID" },
  { handler: request, command: "/结交 2", reason: "该用户不存在", expected: "/随机好友", text: "已注册道友" },
  { handler: request, command: "/结交 2", reason: "对方已关闭好友申请", expected: "/我的好友", text: "修改本人的好友接收设置不能解除对方限制" },
  { handler: request, command: "/结交 2", reason: "你们已经是好友了", expected: "/我的好友", text: "以当前好友列表核对关系" },
  { handler: request, command: "/结交 2", reason: "你已拉黑对方，请先取消拉黑", expected: "/黑名单", text: "取消拉黑不会自动成为好友" },
  { handler: request, command: "/结交 2", reason: "无法向该用户发送结交申请", expected: "/我的好友", text: "确认对方接收意愿" },
  { handler: request, command: "/结交 2", reason: "好友数量已达上限（30人）", expected: "/我的好友", text: "核对本人好友数量" },
  { handler: request, command: "/结交 2", reason: "对方暂时无法添加好友", expected: "/我的好友", text: "自己的申请收件箱不能清理对方积压" },
  { handler: request, command: "/结交 2", reason: "对方待处理申请过多，请稍后再试", expected: "/我的好友", text: "等待对方处理" },
  { handler: request, command: "/结交 2", reason: "已发送过结交申请，请等待对方处理\n\n重复提醒", expected: "/我的好友", text: "只展示收到的申请" },
  { handler: accept, command: "/同意结交 22", reason: "对方好友数量已达上限", expected: "/好友申请", text: "服务端已结束本次申请" },
  { handler: accept, command: "/同意结交 22", reason: "好友数量已达上限（30人）", expected: "/我的好友", text: "核对本人好友数量" },
  { handler: accept, command: "/同意结交 22", reason: "申请不存在", expected: "/好友申请", text: "玩家UID不能代替申请ID" },
  { handler: accept, command: "/同意结交 22", reason: "好友申请已过期", expected: "/好友申请", text: "已处理或过期的旧编号" },
  { handler: reject, command: "/拒绝结交 22", reason: "该申请已处理或已过期", expected: "/好友申请", text: "申请失效不代表本次已经同意或拒绝" },
  { handler: reject, command: "/拒绝结交 22", reason: "申请不存在", expected: "/我的好友", text: "核对是否已成为好友" },
  { handler: reject, command: "/拒绝结交 0", reason: "操作失败，请稍后再试", expected: "/好友申请", text: "确认当前状态后再决定" },
  { handler: remove, command: "/删除好友 2 确认", reason: "道侣关系不能直接删除", expected: "/我的道侣", text: "先查看当前道侣关系" },
  { handler: remove, command: "/删除好友 2 确认", reason: "不是好友", expected: "/我的好友", text: "当前关系" },
  { handler: remove, command: "/删除好友 1 确认", reason: "不能对自己执行此操作", expected: "/我的好友", text: "选择其他玩家" }
];
for (const entry of cases) for (const isPrivate of [false, true]) for (const mode of ['http', 'feedback']) {
  test(`${entry.command} private=${isPrivate} ${mode} ${entry.reason}`, async t => {
    const { app, requests } = await gameFixture(t, request => mode === 'http'
      ? { code: 'CONFLICT', message: entry.reason }
      : businessEnvelope(request.bid, undefined, [{ title: '好友', heading: '', text: entry.reason, buttons: [], advice: [] }]),
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
    assert.ok(!view.commands.some(command => /^\/(?:结交|同意结交|拒绝结交|删除好友|解除道侣|取消拉黑)(?:\s|$)/.test(command)));
    assert.equal(message.target?.targetId, isPrivate ? event.UserId : event.ChannelId);
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}



const target = { id: 2, name: '青云' };
const workflow = { outcome: 'result', realmName: '炼气五层', targetId: '2', target };
for (const [outcome, expected, text] of [
  ['self', '/我的好友', '选择其他玩家'],
  ['not_friend', '/我的好友', '当前关系'],
  ['companion', '/我的道侣', '普通删除好友不会解除道侣关系'],
  ['failed', '/我的好友', '本次删除未获得成功确认']
] as const) for (const isPrivate of [false, true]) {
  test(`删除好友结构化拒绝不报告成功 ${outcome} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, value => businessEnvelope(value.bid, { ...workflow, removal: { outcome, realmName: '炼气五层' } }));
    const event = isPrivate ? app.events.privateMessage({ text: '/删除好友 2 确认', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/删除好友 2 确认', platform: 'qq-bot' });
    const result = await app.runHandler(remove, event);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].idempotencyKey);
    assert.deepEqual(requests[0].body.arguments, { targetUid: '2', confirmed: true });
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(text), view.text);
    assert.ok(view.commands.includes(expected));
    assert.ok(!view.text.includes('已删除好友'));
    assert.ok(!view.commands.some(command => /^\/(?:删除好友|解除道侣)\s/.test(command)));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
const access = { canUseFifthLayerFeature: false, canUseSpar: false, realmName: '炼气四层' };
for (const entry of [
  { handler: request, command: '/结交 2', data: { outcome: 'locked', realmName: '炼气四层', targetId: '', target: null } },
  { handler: remove, command: '/删除好友 2 确认', data: { outcome: 'locked', realmName: '炼气四层', targetId: '', target: null } },
  { handler: accept, command: '/同意结交 22', data: { access, data: null } },
  { handler: reject, command: '/拒绝结交 22', data: { access, data: null } },
  { handler: requestsList, command: '/好友申请', data: { access, data: null } }
]) for (const isPrivate of [false, true]) {
  test(`旧服务锁定回执不再臆测统一门槛，并展示修行路径 ${entry.command} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, value => businessEnvelope(value.bid, entry.data));
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes('尚未满足该功能的开放条件，具体境界要求请查看天书。当前境界：炼气四层'));
    assert.ok(view.text.includes('挑战主线获取修为'));
    assert.ok(view.text.includes('核对当前修为和所需材料'));
    for (const command of ['/查看主线', '/我的信息', '/我的境界', '/闭关', '/天书']) assert.ok(view.commands.includes(command));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const isPrivate of [false, true]) {
  test(`发送申请不再给发送者同意自己的按钮 private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, value => businessEnvelope(value.bid, { ...workflow, request: { success: true, requestId: 22, targetName: '青云', fromUserName: '本人', message: '好友申请已发送' } }));
    const event = isPrivate ? app.events.privateMessage({ text: '/结交 2', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/结交 2', platform: 'qq-bot' });
    const result = await app.runHandler(request, event);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].idempotencyKey);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes('已向「青云」发送结交申请'));
    assert.ok(view.text.includes('申请有效期：1小时'));
    assert.ok(view.commands.includes('/我的好友'));
    assert.ok(!view.commands.some(command => /^\/(?:同意结交|拒绝结交)\s/.test(command)));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const entry of [
  { handler: accept, command: '/同意结交', data: { access: { ...access, canUseFifthLayerFeature: true }, data: null } },
  { handler: reject, command: '/拒绝结交', data: { access: { ...access, canUseFifthLayerFeature: true }, data: null } }
]) for (const isPrivate of [false, true]) {
  test(`缺申请编号先查本人收件箱 ${entry.command} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, value => businessEnvelope(value.bid, entry.data));
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.commands.includes('/好友申请'));
    assert.ok(view.text.includes('玩家UID不能代替申请ID'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
