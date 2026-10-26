import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotGlossaryView } from '@src/api/bot/glossary-robot-query';
import { useMessage } from '@src/utils/useMessage';
/**
 * 词典分类浏览
 *
 * 指令格式：
 *   /词典分类            → 显示所有分类按钮
 *   /词典分类 道具        → 查看该分类下的词条列表
 *   /词典分类 道具 p2     → 分类词条翻页
 */
import { parseCategoryParams } from '@src/api/bot/glossary-robot-query';
import { selects } from '@src/response/config';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();

  const { category, page } = parseCategoryParams(e.MessageText ?? '');
  const loaded = await runRobotBusiness(
    e,
    'glossary.category',
    { keyword: '', category: category ?? '', page },
    value => parseRobotGlossaryView(value, 'category'),
    next
  );

  if (loaded.handled) {
    return;
  }
  const view = loaded.data;
  const policy = view.policy!;

  // ── 情况1: /词典分类 → 显示所有分类 ──
  if (!category) {
    const md = Format.createMarkdown();

    md.addText('📂 选择要浏览的词典分类：');
    md.addNewline();
    md.addNewline();

    for (const cat of policy.categories) {
      md.addButton(markdownButtonLabel(`${cat}`), { data: `/词典分类 ${cat}` });
      md.addText(' ');
    }

    md.addNewline();

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '词典分类',
        header: [{ label: '返回词典', command: '/词典' }],
        content: md,
        footer: [
          { label: '返回词典', command: '/词典' },
          { label: '申请编辑', command: '/申请词典编辑权限' },
          { label: '录入词典', command: '/录入词典' }
        ]
      })
    );

    return;
  }

  // 校验分类名
  if (!policy.categoryValid) {
    const md = Format.createMarkdown();

    md.addText(`❌ 未知分类「${category}」`);
    md.addNewline();
    md.addText(`可用分类：${policy.categories.join('、')}`);
    md.addNewline();
    md.addNewline();

    for (const cat of policy.categories) {
      md.addButton(markdownButtonLabel(`${cat}`), { data: `/词典分类 ${cat}` });
      md.addText(' ');
    }

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '词典分类',
        header: [{ label: '返回词典', command: '/词典' }],
        content: md,
        footer: [
          { label: '返回词典', command: '/词典' },
          { label: '申请编辑', command: '/申请词典编辑权限' }
        ]
      })
    );

    return;
  }

  // ── 情况2: /词典分类 XXX → 分类下的词条列表 ──
  const result = view.page!;
  const md = Format.createMarkdown();

  if (result.entries.length === 0) {
    md.addText(`「${category}」分类下暂无词条`);
    md.addNewline();
    md.addNewline();
    md.addText('💡 你可以用 /录入词典 来创建词条~');
  } else {
    md.addText(`📂 ${category} · 词条列表`);
    md.addNewline();
    md.addNewline();

    for (const entry of result.entries) {
      const e = entry as any;

      md.addBlockquote(
        createQuoteMarkdown(
          [`【${e.keyword}】`, `${(e.content as string).slice(0, 30)}${e.content.length > 30 ? '...' : ''}`],
          [{ label: '查看', command: `/词典 ${e.keyword}` }]
        )
      );
    }
  }

  md.addNewline();

  // 分类切换按钮
  md.addText('📂 切换分类：');
  md.addNewline();

  for (const cat of policy.categories) {
    if (cat === category) {
      md.addText(`[${cat}] `);
    } else {
      md.addButton(markdownButtonLabel(`${cat}`), { data: `/词典分类 ${cat}` });
      md.addText(' ');
    }
  }

  md.addNewline();

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '词典分类',
      header: [{ label: '返回词典', command: '/词典' }],
      content: md,
      footer: [
        { label: '返回词典', command: '/词典' },
        { label: '申请编辑', command: '/申请词典编辑权限' },
        { label: '录入词典', command: '/录入词典' }
      ],
      nav: {
        current: result.currentPage,
        total: result.totalPages,
        count: result.total,
        command: `/词典分类 ${category} p{page}`
      }
    })
  );
});
