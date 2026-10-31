import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { Format, ResultCode, shutdownLogger } from 'alemonjs';
import { createTestApp, inspectMessage } from 'alemonjs/testing';
import { FormatGui, createQuoteMarkdown } from '../../src/utils/messageHelper';
import { useMessage } from '../../src/utils/useMessage';

after(() => shutdownLogger());

test('详情文字和动作保留在同一个引用块中，真实发送器保留目标与节点', async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const result = await app.runHandler(
    async event => {
      const content = Format.createMarkdown().addBlockquote(
        createQuoteMarkdown(['【12】青云宗', '简介：山门常开'], [{ label: '加入', command: '/加入宗门 12' }])
      );
      await useMessage()[0].send(FormatGui({ isPrivate: false, bid: event.UserId, title: '宗门', content, bar: false }));
    },
    app.events.groupMessage({ groupId: 'guild-room' })
  );
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  assert.equal(message.target?.targetId, 'guild-room');
  const quotes = message.nodes.flatMap(node => (node.type === 'Markdown' ? node.value.filter(child => child.type === 'MD.blockquote') : []));
  assert.equal(quotes.length, 1);
  const quote = quotes[0];
  assert.equal(quote.type, 'MD.blockquote');
  if (quote.type !== 'MD.blockquote' || !Array.isArray(quote.value)) throw new Error('Expected a structured quote');
  const detail = inspectMessage([{ type: 'Markdown', value: quote.value }]);
  assert.ok(detail.text.includes('【12】青云宗'));
  assert.ok(detail.text.includes('简介：山门常开'));
  assert.deepEqual(detail.commands, ['/加入宗门 12']);
});

test('空指令和纯空白指令不会进入实际发送按钮，展示项保留为文字', async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const result = await app.runHandler(async () => {
    const content = Format.createMarkdown().addText('功法列表');
    content.addBlockquote(Format.createMarkdown()
      .addButton('空指令', { data: '' })
      .addButton('空白指令', { data: ' \t\n' })
      .addButton('查看', { data: '/查看功法 12' }));
    await useMessage()[0].send(FormatGui({
      content, bar: false,
      footer: [{ label: '当前排序', selected: true }, { label: '无操作', command: '  ' }, { label: '下一页', command: '/我的功法 3' }]
    }));
  }, app.events.groupMessage({ platform: 'qq-bot' }));
  assert.equal(result.messages.length, 1);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(result.messages[0].nodes);
  assert.deepEqual(view.commands, ['/查看功法 12', '/我的功法 3']);
  assert.match(view.text, /当前排序/);
  assert.match(view.text, /无操作/);
});
