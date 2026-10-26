import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { Format, onResponse, ResultCode, shutdownLogger, useMessage } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { createMarkdownText } from '../../node_modules/@alemonjs/qq-bot/lib/format.js';
import { FormatGui } from '../../src/utils/messageHelper';
import { compactButtonSpacing } from '../../src/utils/compactButtonSpacing';
import { parseShopBrowseCommand, createShopCategoryFooter } from '../../src/response/shop/filters';
import { renderSubTabs, PROP_SUB_TABS } from '../../src/response/storage/newBag/tabs';

after(() => shutdownLogger());

test('相邻按钮紧贴，正文空格、分行、引用和原始输入均保留', async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const quote = Format.createMarkdown().addText('说明 ').addButton('‹甲›', { data: '/甲' })
    .addText(' ').addText('\t').addButton('‹乙›', { data: '/乙' })
    .addNewline().addText(' ').addButton('‹丙›', { data: '/丙' })
    .addText(' 后续说明');
  const content = Format.createMarkdown().addBlockquote(quote);
  const original = JSON.stringify(content.value);
  for (const raw of [false, true]) {
    const handler = onResponse(['private.message.create'], async () => {
      const [message] = useMessage();
      await message.send(FormatGui({
        isPrivate: true, content: raw ? [content.value] : content,
        header: [{ label: '甲', command: '/甲' }, { label: '乙', command: '/乙' }],
        footer: [[{ label: '甲', command: '/甲' }, { label: '乙', command: '/乙' }], [{ label: '丙', command: '/丙' }]],
        nav: { current: 2, total: 3, command: '/列表 {page}' }
      }));
    });
    const result = await app.runHandler(handler, app.events.privateMessage({ platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const rendered = message.nodes.flatMap(node => node.type === 'Markdown' ? [createMarkdownText(node.value)] : []).join('\n');
    assert.doesNotMatch(rendered, /\/>[ \t]+<qqbot-cmd-/);
    assert.match(rendered, /说明\s+<qqbot-cmd-/);
    assert.match(rendered, /show="‹乙›" \/>\n>\s+<qqbot-cmd-input text="\/丙"/);
    assert.match(rendered, /show="‹丙›" \/> 后续说明/);
    assert.ok(message.commands.includes('/列表 1'));
    assert.ok(message.commands.includes('/列表 3'));
  }
  assert.equal(JSON.stringify(content.value), original);
  const direct = Format.create().addMarkdown(content);
  assert.deepEqual(compactButtonSpacing(compactButtonSpacing(direct)).value, compactButtonSpacing(direct).value);
});

test('只有显式当前 tab 带尖头，分类切换保留真实命令与搜索条件', async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  for (const category of ['道具', '材料']) {
    const selection = parseShopBrowseCommand(`/商店 万宝楼 筛选 ${category} 搜索 培元丹 2`);
    const footer = createShopCategoryFooter(selection);
    assert.deepEqual(footer.filter(button => button.selected).map(button => button.label), [category]);
    const handler = onResponse(['private.message.create'], async () => {
      const [message] = useMessage();
      const content = Format.createMarkdown();
      renderSubTabs(content, PROP_SUB_TABS, '礼物');
      await message.send(FormatGui({
        isPrivate: true, content,
        header: [{ label: '物品', selected: true, command: '/物品' }, { label: '返回', command: '/返回' }],
        footer: [footer, [{ label: '领取', command: '/领取' }, { label: '取消', command: '/取消' }]]
      }));
    });
    const result = await app.runHandler(handler, app.events.privateMessage({ platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const text = message.text;
    assert.ok(text.includes('‹▸物品›'));
    assert.ok(text.includes('‹▸礼物›'));
    assert.ok(text.includes(`‹▸${category}›`));
    assert.doesNotMatch(text, /▸(?:返回|领取|取消)/);
    assert.ok(message.commands.includes('/储物袋 道具 礼物'));
    assert.ok(message.commands.includes(`/商店 万宝楼 筛选 ${category} 搜索 培元丹 1`));
  }
});
