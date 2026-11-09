import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createResult, ResultCode, shutdownLogger } from 'alemonjs';
import router from '../../src/router';
import robbery from '../../src/response/robbery/res';
import spar from '../../src/response/spar/res';
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
    assert.match(message.text, /同境界道友/);
    assert.doesNotMatch(message.text, /本群|harmless-placeholder/);
    assert.deepEqual(message.commands.filter(text => text.startsWith(`/${command} `)), ids.map(uid => `/${command} ${uid}`));
  });

  test(`${command}没有同境界候选时发送空状态`, async t => {
    const { app } = await gameFixture(t, request => businessEnvelope(request.bid, { targetSuggestions: [] }));
    app.actions.on('mention.get', () => [createResult(ResultCode.Ok, 'No mentions', [])]);
    await app.mount({ responseRouter: router });
    const result = await app.dispatch(app.events.privateMessage({ text: `/${command}`, platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    assert.match(message.text, /暂无可选的同境界道友/);
    assert.equal(message.commands.some(text => text.startsWith(`/${command} `)), false);
  });
}
