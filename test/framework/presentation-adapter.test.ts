import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Format, onResponse, useMessage, useEvent } from 'alemonjs';
import { createPresentationHarness } from '../helpers/framework-presentation.mjs';

test('迁移适配器执行真实事件选择，并保留发送回执和节点快照', async () => {
  const state = { sent: [] };
  const framework = createPresentationHarness(state);
  const handler = onResponse(['private.message.create'], async () => {
    const format = Format.create().addText('first');
    await useMessage()[0].send({ format });
    assert.equal(state.sent.length, 1, '旧断言的收集点必须发生在真实动作中');
    format.addText('later');
  });
  const skipped = await framework.run(handler, { name: 'message.create', UserId: 'player' });
  assert.equal(skipped.messages.length, 0);
  const result = await framework.run(handler, { name: 'private.message.create', UserId: 'player' });
  assert.equal(result.messages.length, 1);
  assert.equal(result.messages[0].text, 'first');
  assert.equal(result.actions[0].results[0].code, 2000);
  assert.deepEqual(state.sent[0], result.messages[0].nodes);
});

test('适配器跟踪框架 next，异常会失败而不会留下实例', async () => {
  const framework = createPresentationHarness({ sent: [] });
  let advanced = 0;
  const handler = onResponse(['message.create'], () => useEvent()[1]());
  await framework.run(handler, { name: 'message.create', UserId: 'player' }, () => {
    advanced++;
  });
  assert.equal(advanced, 1);
  await assert.rejects(
    framework.run(
      () => {
        throw new Error('fixture failure');
      },
      { name: 'message.create', UserId: 'player' }
    ),
    /fixture failure/
  );
  const result = await framework.run(() => {}, { name: 'message.create', UserId: 'player' });
  assert.deepEqual(result.errors, []);
});

test('旧契约夹具中的缺失身份保持缺失，不补造机器人或会话字段', async () => {
  const framework = createPresentationHarness({ sent: [] });
  const event = { name: 'message.create', UserId: 'player', BotId: undefined, ChannelId: undefined, Target: undefined };
  await framework.run(current => {
    assert.equal(current.BotId, undefined);
    assert.equal(current.ChannelId, undefined);
    assert.equal(current.Target, undefined);
  }, event);
  assert.deepEqual(event, { name: 'message.create', UserId: 'player', BotId: undefined, ChannelId: undefined, Target: undefined });
});
