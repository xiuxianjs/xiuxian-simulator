import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createResult, ResultCode, shutdownLogger } from 'alemonjs';
import router from '../../src/router';
import robbery from '../../src/response/robbery/res';
import spar from '../../src/response/spar/res';
import profile from '../../src/response/message/viewInfo/res';
import cave from '../../src/response/cavePlot/visit/res';
import removeFriend from '../../src/response/friend/deleteFriend/res';
import friend from '../../src/response/friend/befriend/res';
import invite from '../../src/response/team/inviteTeam/res';
import master from '../../src/response/master/apply/res';
import kick from '../../src/response/team/kick/res';
import transfer from '../../src/response/team/transferLeader/res';
import position from '../../src/response/team/setPosition/res';
import triple from '../../src/response/robbery/triple/res';
import { businessEnvelope, gameFixture } from './fixture';

after(() => shutdownLogger());

for (const [command, operation, handler] of [['打劫', 'robbery', robbery], ['比试', 'spar', spar]] as const) {
  test(`${command}找不到目标时按服务端顺序发送候选按钮`, async t => {
    const ids = [9, 8, 2, 3, 4];
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { targetSuggestions: ids }));
    app.actions.on('mention.get', () => [createResult(ResultCode.Ok, 'No mentions', [])]);
    const event = app.events.groupMessage(
      { text: `/${command} harmless-placeholder`, platform: 'qq-bot', botId: '100017' },
      { Target: { scope: 'group', targetId: 'native-group' }, DirectUserId: 'direct-account' }
    );
    const result = await app.runHandler(handler, event);
    assert.deepEqual(result.errors, []);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].path, `/api/v2/robot/business/pvp.${operation}`);
    assert.equal(requests[0].body.channelId, 'native-group');
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    assert.ok(message.nodes);
    assert.match(message.text, /附近的修士/);
    assert.doesNotMatch(message.text, /本群|同境界|harmless-placeholder/);
    assert.deepEqual(message.commands.filter(text => text.startsWith(`/${command} `)), ids.map(uid => `/${command} ${uid}`));
  });

  test(`${command}附近没有候选时发送空状态`, async t => {
    const { app } = await gameFixture(t, request => businessEnvelope(request.bid, { targetSuggestions: [] }));
    app.actions.on('mention.get', () => [createResult(ResultCode.Ok, 'No mentions', [])]);
    await app.mount({ responseRouter: router });
    const result = await app.dispatch(app.events.privateMessage({ text: `/${command}`, platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    assert.match(message.text, /附近暂无可选的修士/);
    assert.equal(message.commands.some(text => text.startsWith(`/${command} `)), false);
  });
}

for (const [command, operation, handler, title, input, suffix] of [
  ['查看信息', 'profile.view', profile, '附近的修士'],
  ['查看灵田', 'cave.visit', cave, '附近的灵田'],
  ['结交', 'friends.request', friend, '附近的修士'],
  ['删除好友', 'friends.remove', removeFriend, '当前好友'],
  ['邀请入队', 'teams.invite', invite, '附近可邀请的修士'],
  ['拜师', 'master.apply', master, '附近可拜师的修士'],
  ['队伍踢出', 'teams.kick', kick, '当前队员'],
  ['转让队长', 'teams.leadership', transfer, '当前队员'],
  ['队伍位置设置', 'teams.position', position, '当前队员', ' 未知修士 3', ' 3'],
  ['三连打劫', 'pvp.robbery', triple, '附近的修士'],
  ['十连比试', 'pvp.spar', spar, '附近的修士']
] as const) {
  test(`${command}目标缺失时只展示候选操作`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { targetSuggestions: [8, 2] }));
    app.actions.on('mention.get', () => [createResult(ResultCode.Ok, 'No mentions', [])]);
    const event = app.events.privateMessage({ text: `/${command}${input ?? ''}`, platform: 'qq-bot' });
    const result = await app.runHandler(handler, event);
    assert.deepEqual(result.errors, []);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].path, `/api/v2/robot/business/${operation}`);
    assert.equal((requests[0].body.arguments as { suggestTargets?: boolean }).suggestTargets, true);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    assert.ok(message.nodes);
    assert.ok(message.text.includes(title));
    assert.doesNotMatch(message.text, /未知修士|同境界|本群/);
    assert.deepEqual(message.commands.filter(text => text.startsWith(`/${command} `)), [8, 2].map(uid => `/${command} ${uid}${suffix ?? ''}`));
  });
}

test('站位从裸指令到两个真实按钮回跳，只有最后一步提交队员和站位', async t => {
  const { app, requests } = await gameFixture(t, request => {
    const args = request.body.arguments as Record<string, unknown>;
    return businessEnvelope(request.bid, args.targetUid ? { outcome: 'updated' } : { targetSuggestions: [8] });
  });
  await app.mount({ responseRouter: router });

  const menu = await app.dispatch(app.events.privateMessage({ text: '/队伍位置设置', platform: 'qq-bot' }));
  assert.equal(requests.length, 0);
  assert.deepEqual(menu.errors, []);
  const first = menu.messages[0];
  assert.equal(menu.actions[first.actionIndex].results?.[0].code, ResultCode.Ok);
  assert.deepEqual(first.commands.filter(command => command.startsWith('/队伍位置设置 ')), [1, 2, 3, 4, 5, 6].map(i => `/队伍位置设置 ${i}`));

  const selectSlot = first.commands.find(command => command === '/队伍位置设置 3');
  assert.ok(selectSlot);
  const members = await app.dispatch(app.events.interaction({ text: selectSlot, platform: 'qq-bot', private: true }));
  assert.deepEqual(members.errors, []);
  assert.deepEqual(requests[0].body.arguments, { position: '3', suggestTargets: true });
  const second = members.messages[0];
  assert.equal(members.actions[second.actionIndex].results?.[0].code, ResultCode.Ok);
  assert.match(second.text, /当前队员/);
  const selectMember = second.commands.find(command => command === '/队伍位置设置 8 3');
  assert.ok(selectMember);

  const updated = await app.dispatch(app.events.interaction({ text: selectMember, platform: 'qq-bot', private: true }));
  assert.deepEqual(updated.errors, []);
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[1].body.arguments, { targetUid: '8', position: '3', suggestTargets: true });
  assert.match(updated.messages[0].text, /位置设置成功/);
  assert.equal(updated.actions[updated.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
