import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createResult, getConfig, onResponse, ResultCode, shutdownLogger, useMessage } from 'alemonjs';
import more from '../../src/response/more/res';
import { FormatGui } from '../../src/utils/messageHelper';
import { businessEnvelope, gameFixture } from './fixture';

after(() => shutdownLogger());

test('官群入口按配置在更多和默认底栏之间移动', async t => {
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, {
    registered: false, moreVisibleCommands: [], foldVisibleCommands: []
  }));
  app.actions.on('message.send', () => [createResult(ResultCode.Ok, '已送达', { id: 'receipt' })]);
  const initial = app.run(() => getConfig().value);
  const navigation = onResponse(['private.message.create'], async () => {
    const [message] = useMessage();
    await message.send(FormatGui({ title: '导航' }));
  });
  const customBar = onResponse(['private.message.create'], async () => {
    const [message] = useMessage();
    await message.send(FormatGui({ bar: [{ label: '继续', command: '/继续' }] }));
  });
  const event = () => app.events.privateMessage({ text: '/更多', platform: 'qq-bot' });
  async function keyboard(run: ReturnType<typeof app.runHandler>) {
    const result = await run;
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    const sent = result.messages[0];
    assert.equal(result.actions[sent.actionIndex].results?.[0].code, ResultCode.Ok);
    return sent.nodes.flatMap(node => node.type === 'BT.group' ? node.value.map(row => row.value) : []);
  }

  for (const [pinned, url] of [
    [undefined, 'https://example.com/group-a'],
    [true, 'https://example.com/group-b'],
    [true, 'https://example.com/group-c'],
    [true, ''],
    [false, 'https://example.com/group-d'],
    [undefined, undefined]
  ] as const) {
    app.configure({
      ...initial,
      'xiuxian-game': { ...initial?.['xiuxian-game'], official_group_button_pinned: pinned, official_group_url: url }
    });
    for (const isMore of [true, false]) {
      const rows = await keyboard(isMore ? app.runHandler(more, event()) : app.runHandler(navigation, event()));
      const expected = url && (pinned || isMore) ? [pinned ? '点击加入群聊' : '加入群聊'] : [];
      const links = rows.flat().filter(button => button.options?.type === 'link');
      assert.deepEqual(links.map(button => button.value), expected);
      if (expected.length > 0) {
        assert.equal(links[0].options?.data, url);
      }
      const navigationRow = ['我', '战', '本', '动', '店'];
      assert.deepEqual(rows.at(pinned && url ? -2 : -1)?.map(button => button.value), navigationRow);
      if (pinned && url) {
        assert.deepEqual(rows.at(-1)?.map(button => button.value), expected);
      }
    }
    assert.deepEqual((await keyboard(app.runHandler(customBar, event()))).map(row => row.map(button => button.value)), [['继续']]);
  }
});
