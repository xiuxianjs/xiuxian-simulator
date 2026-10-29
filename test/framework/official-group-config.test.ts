import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createResult, getConfig, ResultCode, shutdownLogger } from 'alemonjs';
import more from '../../src/response/more/res';
import { businessEnvelope, gameFixture } from './fixture';

after(() => shutdownLogger());

test('同一实例配置更新后，更多按钮立即使用新官群链接，不复用旧链接', async t => {
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, {
    registered: false, moreVisibleCommands: [], foldVisibleCommands: []
  }));
  app.actions.on('message.send', () => [createResult(ResultCode.Ok, '已送达', { id: 'receipt' })]);
  const initial = app.run(() => getConfig().value);
  const oldMessages: string[] = [];
  for (const configured of ['https://example.com/group-a', 'https://example.com/group-b', '']) {
    app.configure({ ...initial, 'xiuxian-game': { ...initial?.['xiuxian-game'], official_group_url: configured } });
    const result = await app.runHandler(more, app.events.privateMessage({ text: '/更多', platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    const sent = result.messages[0];
    assert.equal(result.actions[sent.actionIndex].results?.[0].code, ResultCode.Ok);
    const links = sent.nodes.flatMap(node => node.type === 'BT.group' ? node.value.flatMap(row => row.value) : []);
    const group = links.find(button => button.value === '加入群聊');
    assert.equal(group?.options?.type, 'link');
    assert.equal(group?.options?.data, configured || 'https://qm.qq.com/q/vdFtnG7SEK');
    oldMessages.push(String(group?.options?.data));
  }
  assert.equal(oldMessages[0], 'https://example.com/group-a');
});
