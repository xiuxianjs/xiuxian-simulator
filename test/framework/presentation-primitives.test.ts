import assert from 'node:assert/strict';
import { test } from 'node:test';
import { errorTitle, operationActionName } from '../../src/response/presentation/action-names';
import { buildBubble, bubbleIssues } from '../../src/response/presentation/bubble';
import { confirmBubble } from '../../src/response/presentation/presets';
import { bigNumber, joinValues, kvLine, noticeTitle, progressBar, quantityText, rewardLine, statusLine, titleWithStatus } from '../../src/response/presentation/format';
import { notificationNoticeData } from '../../src/notification/presentation';

type Nodes = { texts: string[]; bolds: string[]; commands: string[]; blockquotes: number };

/** 递归收集消息节点中的文本、加粗、按钮命令与引用块数量。 */
const collect = (node: unknown, out: Nodes): void => {
  if (Array.isArray(node)) {
    node.forEach(item => collect(item, out));

    return;
  }
  if (!node || typeof node !== 'object') {
    return;
  }
  const item = node as { type?: string; value?: unknown; options?: { data?: string } };

  if (item.type === 'MD.text') {
    out.texts.push(String(item.value));
  }
  if (item.type === 'MD.bold') {
    out.bolds.push(String(item.value));
  }
  if (item.type === 'MD.button') {
    out.commands.push(String(item.options?.data ?? ''));
  }
  if (item.type === 'MD.blockquote') {
    out.blockquotes += 1;
  }
  if (Array.isArray(item.value)) {
    collect(item.value, out);
  }
};

const emptyNodes = (): Nodes => ({ texts: [], bolds: [], commands: [], blockquotes: 0 });

test('统一格式：键值、多值、数量、奖励、状态', () => {
  assert.equal(kvLine('战力', 1255), '战力：1255');
  assert.equal(joinValues('小玉', '女修', '炼气一层'), '小玉 · 女修 · 炼气一层');
  assert.equal(joinValues(undefined, '', null, '炼气一层'), '炼气一层');
  assert.equal(quantityText('灵晶', 8), '灵晶 ×8');
  assert.equal(rewardLine(['灵晶 ×8', '清灵草 ×2']), '🎁 获得：灵晶 ×8、清灵草 ×2');
  assert.equal(statusLine('done', '分解成功'), '✅ 分解成功');
  assert.equal(statusLine('fail', ''), '❌');
  assert.equal(statusLine('none', '原样文本'), '原样文本');
  assert.equal(bigNumber(124000), '12.4万');
});

test('进度条：统一 10 格与百分比边界', () => {
  assert.equal(progressBar(5, 10), '▓▓▓▓▓░░░░░ 50%');
  assert.equal(progressBar(0, 0), '░░░░░░░░░░ 0%');
  assert.equal(progressBar(20, 10), '▓▓▓▓▓▓▓▓▓▓ 100%');
  assert.equal(progressBar(-1, 10), '░░░░░░░░░░ 0%');
});

test('buildBubble：标题带状态徽章，引用块内保留对象行与行内按钮', () => {
  const built = buildBubble({
    title: '功法 · 分解结果',
    status: 'done',
    sections: [
      {
        title: '青元剑诀',
        lines: ['类型：剑法 · 品级：玄阶', '🎁 获得：功法残页 ×2'],
        actions: [{ label: '查看储物袋', command: '/储物袋 功法' }]
      }
    ],
    footer: [{ label: '返回', command: '/我的功法' }]
  });
  const out = emptyNodes();

  collect(built.format.value, out);
  assert.ok(out.bolds.includes('功法 · 分解结果 ✅'), out.bolds.join('|'));
  assert.ok(out.bolds.includes('青元剑诀'), out.bolds.join('|'));
  assert.ok(out.texts.includes('类型：剑法 · 品级：玄阶'), out.texts.join('|'));
  assert.ok(out.commands.includes('/储物袋 功法'), out.commands.join('|'));
  assert.ok(out.commands.includes('/我的功法'), out.commands.join('|'));
  assert.equal(out.blockquotes, 1);
});

test('confirmBubble：目标与代价分段，确认取消同块且保留返回', () => {
  const built = confirmBubble({
    title: '功法 · 分解确认',
    target: ['功法：青元剑诀', '类型：剑法 · 品级：玄阶'],
    changes: ['🎁 返还：功法残页 ×2'],
    costs: ['确认后功法消失，不可撤销'],
    actions: [
      { label: '确认分解', command: '/分解功法 101' },
      { label: '取消', command: '/我的功法' }
    ],
    back: { label: '返回功法', command: '/我的功法' }
  });
  const out = emptyNodes();

  collect(built.format.value, out);
  assert.ok(out.bolds.includes('目标'), out.bolds.join('|'));
  assert.ok(out.bolds.includes('代价'), out.bolds.join('|'));
  assert.ok(out.texts.includes('⚠️ 确认后功法消失，不可撤销'), out.texts.join('|'));
  assert.ok(out.commands.includes('/分解功法 101'));
  assert.ok(out.commands.includes('/我的功法'));
  assert.equal(out.blockquotes, 2);
});

test('bubbleIssues：拦截空标题、按钮超限与超长命令', () => {
  const codes = (input: Parameters<typeof bubbleIssues>[0], limit?: number) => bubbleIssues(input, limit).map(issue => issue.code);

  assert.deepEqual(codes({ title: '  ', sections: [] }), ['EMPTY_TITLE']);
  assert.ok(codes({ title: '标题', header: new Array(4).fill(0).map(() => ({ label: 'b', command: '/b' })), sections: [] }).includes('TOO_MANY_HEADER_BUTTONS'));
  assert.ok(
    codes({ title: '标题', sections: [{ lines: ['x'], actions: new Array(4).fill(0).map(() => ({ label: 'b', command: '/b' })) }] }).includes('TOO_MANY_SECTION_BUTTONS')
  );
  assert.ok(
    codes({
      title: '标题',
      sections: [],
      footer: [[{ label: 'a', command: '/a' }], [{ label: 'b', command: '/b' }], [{ label: 'c', command: '/c' }]]
    }).includes('TOO_MANY_FOOTER_ROWS')
  );
  assert.ok(
    codes({
      title: '标题',
      sections: [],
      footer: [new Array(5).fill(0).map((_, index) => ({ label: `b${index}`, command: `/b${index}` }))]
    }).includes('TOO_MANY_FOOTER_BUTTONS')
  );
  assert.ok(codes({ title: '标题', sections: [], footer: new Array(5).fill(0).map(() => ({ label: 'b', command: '/b' })) }, 4).includes('TOO_MANY_BUTTONS'));
  assert.ok(codes({ title: '标题', sections: [], footer: [{ label: '长命令', command: `/${'名'.repeat(80)}` }] }).includes('COMMAND_TOO_LONG'));
  assert.deepEqual(codes({ title: '标题', sections: [{ lines: ['正常'] }] }), []);
});

test('错误标题与状态徽章：<动作> · 未完成 与四态符号', () => {
  assert.equal(operationActionName('skill-books.decompose'), '功法');
  assert.equal(operationActionName('unknown-operation.x'), '操作');
  assert.equal(errorTitle('guild.members'), '宗门 · 未完成');
  assert.equal(errorTitle(), '操作 · 未完成');
  assert.equal(titleWithStatus('功能维护', 'warn'), '功能维护 ⚠️');
  assert.equal(titleWithStatus('标题', 'none'), '标题');
  assert.equal(titleWithStatus('', 'fail'), '');
  assert.equal(noticeTitle('修炼提醒'), '修炼提醒 · 通知');
  assert.equal(noticeTitle('我的通知'), '我的通知');
});

test('通知气泡：标题追加通知、正文逐行保留、按钮与键盘符合规范', () => {
  const nodes = notificationNoticeData([{ type: 'Text', value: '【修炼提醒】\n\n你的闭关已到期，可出关领取。' }], 'meditation.limit');
  const out = emptyNodes();

  collect(nodes, out);
  assert.ok(out.bolds.includes('修炼提醒 · 通知'), out.bolds.join('|'));
  assert.ok(out.texts.includes('你的闭关已到期，可出关领取。'), out.texts.join('|'));
  const commands = out.commands.filter(Boolean);

  assert.ok(commands.includes('/出关'), commands.join('|'));
  assert.ok(commands.includes('/我的通知'), commands.join('|'));
  assert.ok(commands.length <= 3, commands.join('|'));
  assert.equal(out.blockquotes, 1);
});
