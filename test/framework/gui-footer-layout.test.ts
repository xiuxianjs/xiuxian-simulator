import { Format, onResponse, ResultCode, shutdownLogger, useMessage } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createMarkdownText } from '../../node_modules/@alemonjs/qq-bot/lib/format.js';
import { FormatGui } from '../../src/utils/messageHelper';

after(() => shutdownLogger());

test('分页后的操作行带正文前缀，保留命令与多行分组', async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  for (const grouped of [false, true]) {
    const actions = [{ label: '开垦所有', command: '/开垦所有' }, { label: '播种空田', command: '/播种' }];
    const handler = onResponse(['private.message.create'], async () => {
      const [message] = useMessage();
      await message.send(FormatGui({
        isPrivate: true,
        title: '我的灵田',
        content: Format.createMarkdown().addBlockquote(Format.createMarkdown().addText('【6】凡阶灵田')),
        nav: { current: 2, total: 6, count: 28, command: '/我的灵田 页 {page}' },
        footer: grouped ? actions.map(action => [action]) : actions
      }));
    });
    const result = await app.runHandler(handler, app.events.privateMessage({ platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    for (const command of ['/开垦所有', '/播种', '/我的灵田 页 1', '/我的灵田 页 3']) {
      assert.ok(message.commands.includes(command));
    }
    const rendered = message.nodes.filter(node => node.type === 'Markdown').map(node => createMarkdownText(node.value)).join('\n');
    const lines = rendered.split('\n').filter(line => /text="\/(开垦所有|播种)"/.test(line));
    assert.equal(lines.length, grouped ? 2 : 1);
    for (const line of lines) assert.match(line, /^操作：\s*<qqbot-cmd-input/);
    assert.doesNotMatch(rendered, /```|^ {4}\S/m);
    for (const label of ['开垦所有', '播种空田', '上一页', '下一页']) {
      assert.ok(rendered.includes(`show="‹${label}›"`));
    }
  }
});
