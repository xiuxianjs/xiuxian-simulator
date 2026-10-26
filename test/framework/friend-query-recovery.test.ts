import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import block from '../../src/response/friend/blockUser/res';
import unblock from '../../src/response/friend/unblockUser/res';
import blocklist from '../../src/response/friend/blocklist/res';
import overview from '../../src/response/friend/friendList/res';
import random from '../../src/response/friend/randomFriend/res';
import settings from '../../src/response/friend/friendSettings/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

const access = { canUseFifthLayerFeature: true, canUseSpar: true, realmName: '炼气五层' };
const cases = [
  { handler: block, command: '/拉黑 青云', reason: '未找到名为「青云」的玩家', expected: '/我的好友', text: '完整道号' },
  { handler: block, command: '/拉黑 青云', reason: '该用户不存在', expected: '/我的好友', text: 'UID、黑名单记录ID和 @提及不能代替名称' },
  { handler: block, command: '/拉黑 本人', reason: '不能拉黑自己', expected: '/我的好友', text: '核对后的完整道号' },
  { handler: block, command: '/拉黑 青云', reason: '黑名单数量已达上限（100人）', expected: '/黑名单', text: '满额时由你决定' },
  { handler: block, command: '/拉黑 青云', reason: '该用户已在黑名单中', expected: '/黑名单', text: '本人当前列表' },
  { handler: block, command: '/拉黑 青云', reason: '操作失败，请稍后再试', expected: '/黑名单', text: '失败提示不能证明状态完全没变' },
  { handler: unblock, command: '/取消拉黑 21', reason: '该记录不存在', expected: '/黑名单', text: '玩家UID不能代替黑名单记录ID' },
  { handler: unblock, command: '/取消拉黑 青云', reason: '该用户不在黑名单中', expected: '/黑名单', text: '记录失效时重新查列表' },
  { handler: unblock, command: '/取消拉黑 21', reason: '操作失败，请稍后再试', expected: '/我的好友', text: '分别按当前查询结果确认' }
];
for (const entry of cases) for (const isPrivate of [false, true]) for (const mode of ['http', 'feedback']) {
  test(`黑名单中断 ${entry.command} ${entry.reason} ${mode} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, value => mode === 'http' ? { code: 'CONFLICT', message: entry.reason }
      : businessEnvelope(value.bid, undefined, [{ title: '黑名单', heading: '', text: entry.reason, buttons: [], advice: [] }]), mode === 'http' ? 409 : 200);
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].idempotencyKey);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(entry.reason));
    assert.ok(view.text.includes(entry.text), view.text);
    assert.ok(view.commands.includes(entry.expected));
    assert.ok(!view.commands.some(command => /^\/(?:拉黑|取消拉黑|删除好友|解除道侣)\s/.test(command)));
    assert.equal(message.target?.targetId, isPrivate ? event.UserId : event.ChannelId);
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const entry of [
  { handler: block, command: '/拉黑 青云', data: { access, data: { outcome: 'blocked', name: '青云', realmName: '炼气五层' } }, text: '已将青云加入黑名单', advice: '黑名单写入与后续好友关系处理分开完成' },
  { handler: unblock, command: '/取消拉黑 21', data: { access, data: { outcome: 'removed', name: '青云', blockedUserId: 2, realmName: '炼气五层' } }, text: '已将青云移出黑名单', advice: '不会自动恢复好友' },
  { handler: block, command: '/拉黑', data: { access, data: null }, text: '使用方法：拉黑 <玩家名称>', advice: '按玩家名称匹配' },
  { handler: unblock, command: '/取消拉黑', data: { access, data: null }, text: '使用方法：取消拉黑 <记录ID或玩家名称>', advice: '玩家UID不能代替黑名单记录ID' },
  { handler: blocklist, command: '/黑名单', data: { access, data: [] }, text: '黑名单为空', advice: '查看自己的好友设置' },
  { handler: random, command: '/随机好友', data: { access: { ok: true, realmName: '炼气五层' }, player: null }, text: '当前没有可以推荐的道友', advice: '没有推荐候选不代表所有玩家都不存在' },
  { handler: overview, command: '/我的好友 3', data: { access, data: { total: 10, currentPage: 3, pageSize: 10, maxFriends: 30, myGender: 1, hasCompanion: false, list: [] } }, text: '本页暂无好友', advice: '当前页为空不代表好友关系已经删除' },
  { handler: overview, command: '/我的好友', data: { access, data: { total: 0, currentPage: 1, pageSize: 10, maxFriends: 30, myGender: 1, hasCompanion: false, list: [] } }, text: '暂无好友', advice: '核对本人收到的待处理结交申请' }
]) for (const isPrivate of [false, true]) {
  test(`结构化查询与成功后的真实状态 ${entry.command} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, value => businessEnvelope(value.bid, entry.data));
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(entry.text), view.text);
    assert.ok(view.text.includes(entry.advice), view.text);
    if (entry.command === '/我的好友 3') assert.ok(view.commands.includes('/我的好友 1'));
    if (entry.handler === random || entry.command === '/我的好友') assert.ok(view.commands.includes('/好友申请'));
    if (entry.handler === block || entry.handler === unblock) {
      assert.ok(requests[0].idempotencyKey);
      assert.deepEqual(requests[0].body.arguments, entry.command === '/拉黑 青云' ? { targetName: '青云' } : entry.command === '/取消拉黑 21' ? { recordId: '21' } : entry.handler === block ? { targetName: '' } : {});
    }
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const isEnabled of [false, true]) for (const isPrivate of [false, true]) {
  test(`好友设置只改变本人接收偏好 enabled=${isEnabled} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, value => businessEnvelope(value.bid, { canUseFifthLayerFeature: true, realmName: '炼气五层', isEnabled }));
    const text = `/好友设置 ${isEnabled ? '开启' : '关闭'}`;
    const event = isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' });
    const result = await app.runHandler(settings, event);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].idempotencyKey);
    assert.deepEqual(requests[0].body.arguments, { enabled: isEnabled });
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(isEnabled ? '接受好友申请 ✓' : '已关闭好友申请'));
    assert.ok(view.text.includes('此设置仅控制本人'));
    assert.ok(view.text.includes('不会改变对方设置'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const isPrivate of [false, true]) {
  test(`设置回执状态不一致也发送核对入口 private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, value => businessEnvelope(value.bid, { canUseFifthLayerFeature: true, realmName: '炼气五层', isEnabled: false }));
    const event = isPrivate ? app.events.privateMessage({ text: '/好友设置 开启', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/好友设置 开启', platform: 'qq-bot' });
    const result = await app.runHandler(settings, event);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes('好友设置状态不一致'));
    assert.ok(view.commands.includes('/好友设置'));
    assert.ok(!view.text.includes('接受好友申请 ✓'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
  test(`非有限页码发送提示并不请求业务 private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, () => { throw new Error('Unexpected backend call'); });
    const text = `/我的好友 ${'9'.repeat(400)}`;
    const event = isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' });
    const result = await app.runHandler(overview, event);
    assert.equal(requests.length, 0);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes('页码超出可查询范围'));
    assert.ok(view.commands.includes('/我的好友 1'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

for (const [input, args] of [
  ['21青云', { exactName: '21青云' }],
  ['21.5', { exactName: '21.5' }],
  ['+21', { recordId: '21' }]
]) for (const isPrivate of [false, true]) {
  test(`完整姓名不会被截成其他黑名单编号 ${input} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, value => businessEnvelope(value.bid, { access, data: { outcome: 'removed', name: input, blockedUserId: 2, realmName: '炼气五层' } }));
    const text = `/取消拉黑 ${input}`;
    const event = isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' });
    const result = await app.runHandler(unblock, event);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].idempotencyKey);
    assert.deepEqual(requests[0].body.arguments, args);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.ok(inspectMessage(message.nodes).text.includes(`已将${input}移出黑名单`));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
