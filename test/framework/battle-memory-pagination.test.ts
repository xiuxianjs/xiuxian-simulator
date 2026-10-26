import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createResult, Format, ResultCode, shutdownLogger } from 'alemonjs';
import { createTestApp, inspectMessage } from 'alemonjs/testing';
import { sendBattleResult } from '../../src/utils/battleMemoryMessage';
import { useMessage } from '../../src/utils/useMessage';
import pageHandler from '../../src/response/battle/memoryPage/res';

after(() => shutdownLogger());

for (const count of [0, 1, 2, 12, 13, 15, 16, 24, 25, 37]) {
  test(`${count}场回忆使用独立三列按钮，超过15场才分页且无空翻页入口`, async t => {
    const app = createTestApp();
    t.after(() => app.dispose());
    app.actions.on('message.send', () => [createResult(ResultCode.Ok, '已送达', { id: 'receipt' })]);
    const event = app.events.groupMessage({ text: '/连续爬塔', platform: 'qq-bot', userId: 'owner' });
    const result = await app.runHandler(async () => {
      const [message] = useMessage();
      await sendBattleResult(message, { bid: event.UserId, content: Format.createMarkdown().addText('战斗结算'),
        footer: [{ label: '继续挑战', command: '/连续爬塔' }] },
        Array.from({ length: count }, (_, index) => ({ id: `record-${index + 1}`, label: `回忆${index + 1}` })));
    }, event);
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, count > 1 ? 2 : 1);
    assert.match(inspectMessage(result.messages[0].nodes).text, /战斗结算/);
    for (const message of result.messages) {
      assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    }
    if (count <= 1) return;
    assert.ok(!JSON.stringify(result.messages[0].nodes).includes('components/battle-memory'));
    const rowsOf = (nodes: typeof result.messages[number]['nodes']) => nodes.flatMap(node =>
      node.type === 'BT.group' ? node.value.filter(row => row.value.length).map(row => row.value) : []);
    let nodes = result.messages[1].nodes;
    const seen: string[] = [];
    const commands: string[] = [];
    const pages = count > 15 ? Math.ceil(count / 12) : 1;
    for (let page = 1; page <= pages; page++) {
      const rows = rowsOf(nodes);
      assert.ok(rows.length <= 5);
      const buttons = rows.flat();
      const memories = buttons.filter(button => button.options?.type === 'link');
      assert.equal(memories.length, count > 15 ? Math.min(12, count - (page - 1) * 12) : count);
      for (const row of rows.filter(row => row.some(button => button.options?.type === 'link'))) assert.ok(row.length <= 3);
      seen.push(...memories.map(button => String(button.options?.data)));
      const previous = buttons.find(button => button.value === '上一页');
      const next = buttons.find(button => button.value === '下一页');
      assert.equal(Boolean(previous), page > 1);
      assert.equal(Boolean(next), page < pages);
      if (pages > 1) {
        assert.deepEqual(rows.at(-1)?.map(button => button.value), [ ...(page > 1 ? ['上一页'] : []), ...(page < pages ? ['下一页'] : []) ]);
      }
      if (!next) break;
      const command = String(next.options?.data);
      commands.push(command);
      const response = await app.runHandler(pageHandler, { ...event, MessageText: command });
      assert.deepEqual(response.errors, []);
      assert.equal(response.messages.length, 1);
      assert.equal(response.actions[response.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
      nodes = response.messages[0].nodes;
    }
    assert.equal(seen.length, count);
    assert.equal(new Set(seen).size, count);
    if (commands.length) {
      const response = await app.runHandler(pageHandler, { ...event, MessageText: commands[0], UserId: 'other' });
      assert.match(inspectMessage(response.messages[0].nodes).text, /失效或不可访问/);
      const previous = rowsOf(nodes).flat().find(button => button.value === '上一页');
      assert.ok(previous);
      const back = await app.runHandler(pageHandler, { ...event, MessageText: String(previous.options?.data) });
      assert.deepEqual(back.errors, []);
      assert.ok(rowsOf(back.messages[0].nodes).flat().some(button => button.value === '下一页'));
    }
  });
}

test('无效页码与过期分页不会返回记录', async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  app.actions.on('message.send', () => [createResult(ResultCode.Ok, '已送达', { id: 'receipt' })]);
  const event = app.events.privateMessage({ text: '/连续爬塔', platform: 'qq-bot' });
  const result = await app.runHandler(async () => {
    const [message] = useMessage();
    await sendBattleResult(message, { bid: event.UserId }, Array.from({ length: 16 }, (_, index) => ({ id: `record-${index}` })));
  }, event);
  const buttons = result.messages[1].nodes.flatMap(node => node.type === 'BT.group' ? node.value.flatMap(row => row.value) : []);
  const command = String(buttons.find(button => button.value === '下一页')?.options?.data);
  for (const page of ['0', '3', '9007199254740992']) {
    const response = await app.runHandler(pageHandler, { ...event, MessageText: command.replace(/2$/, page) });
    assert.match(inspectMessage(response.messages[0].nodes).text, /失效或不可访问/);
  }
  const now = Date.now();
  t.mock.method(Date, 'now', () => now + 30 * 60 * 1000 + 1);
  const expired = await app.runHandler(pageHandler, { ...event, MessageText: command });
  assert.match(inspectMessage(expired.messages[0].nodes).text, /失效或不可访问/);
});
