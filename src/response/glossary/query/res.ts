import { commandText } from '@src/utils/commandPrefix';
import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotGlossaryView } from '@src/api/bot/glossary-robot-query';
import { useMessage } from '@src/utils/useMessage';
/**
 * 词典查询
 *
 * 指令格式：
 *   /词典            → 词典主页（最近词条列表）
 *   /词典 XXX        → 查询词条（精确+模糊）
 *   /词典 XXX p2     → 模糊搜索结果翻页
 */
import { parseQueryParams } from '@src/api/bot/glossary-robot-query';
import { selects } from '@src/response/config';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { section } from '@src/response/presentation/sections';
import { Format, onResponse, useEvent } from 'alemonjs';
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();

  const { keyword, page, searchReference } = parseQueryParams(e.MessageText ?? '');
  const searching = Boolean(keyword ?? searchReference);

  const loaded = await runRobotBusiness(
    e,
    'glossary.query',
    { keyword: keyword ?? '', category: '', page, ...(searchReference ? { searchReference } : {}) },
    value => parseRobotGlossaryView(value, searching ? 'search' : 'browse'),
    next
  );

  if (loaded.handled) {
    return;
  }
  const view = loaded.data;

  // ── 情况1: /词典 → 主页（最近词条列表） ──
  if (!searching) {
    const result = view.page!;
    const policy = view.policy!;
    const md = Format.createMarkdown();

    if (result.entries.length === 0) {
      md.addText('词典暂无内容，等待有缘人来编撰~');
      md.addNewline();
    } else {
      for (const entry of result.entries) {
        const e = entry as any;

        md.addBlockquote(
          createQuoteMarkdown(
            [`【${e.keyword}】【${e.category}】`, `${(e.content as string).slice(0, 30)}${e.content.length > 30 ? '...' : ''}`],
            [{ label: '查看', command: `/词典 ${e.keyword}` }]
          )
        );
      }
    }

    // 分类快捷按钮
    md.addText('📂 按分类浏览：');
    md.addNewline();

    for (const cat of policy.categories) {
      md.addButton(markdownButtonLabel(`${cat}`), { data: commandText(`词典分类 ${cat}`) });
      md.addText(' ');
    }

    md.addNewline();

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '词典',
        header: [{ label: '返回', command: '/更多' }],
        content: md,
        footer: [
          { label: '申请编辑', command: '/申请词典编辑权限' },
          { label: '录入词典', command: '/录入词典' },
          { label: '更多', command: '/更多' }
        ],
        nav: {
          current: result.currentPage,
          total: result.totalPages,
          count: result.total,
          command: '/词典 p{page}'
        }
      })
    );

    return;
  }

  // ── 情况2: /词典 XXX → 先精确匹配 ──
  const exact = view.exact;

  if (exact) {
    const entry = exact as any;
    const md = Format.createMarkdown();

    const lines = [`分类：${entry.category}`, entry.content, `作者：${entry.authorName}`];

    if (entry.editCount > 0) {
      lines.push(`编辑：${entry.editCount}次`);

      if (entry.lastEditorName) {
        lines.push(`最后编辑：${entry.lastEditorName}`);
      }
    }
    md.addBlockquote(section({ title: entry.keyword, lines }));
    md.addNewline();

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: `词典 · ${entry.keyword}`,
        header: [{ label: '返回词典', command: '/词典' }],
        content: md,
        footer: [
          { label: '返回词典', command: '/词典' },
          { label: `${entry.category}分类`, command: `/词典分类 ${entry.category}` },
          { label: '申请编辑', command: '/申请词典编辑权限' },
          { label: '录入词典', command: '/录入词典' }
        ]
      })
    );

    return;
  }

  // ── 情况3: 精确未匹配 → 模糊搜索 ──
  const result = view.page!;

  if (result.entries.length === 0) {
    const md = Format.createMarkdown();

    md.addText('未找到匹配结果');
    md.addNewline();
    md.addNewline();
    md.addText('💡 你可以录入该词条，贡献你的修仙知识~');

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '词典',
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

  const md = Format.createMarkdown();

  md.addText('词典搜索');
  if (!view.searchReference && result.totalPages > 1) {
    md.addNewline().addText('搜索翻页暂不可用，请重新输入关键词。');
  }
  md.addNewline();
  md.addNewline();

  for (const entry of result.entries) {
    const e = entry as any;

    md.addBlockquote(
      createQuoteMarkdown(
        [`【${e.keyword}】【${e.category}】`, `${(e.content as string).slice(0, 30)}${e.content.length > 30 ? '...' : ''}`],
        [{ label: '查看', command: `/词典 ${e.keyword}` }]
      )
    );
  }

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '词典',
      header: [{ label: '返回词典', command: '/词典' }],
      content: md,
      footer: [
        { label: '返回词典', command: '/词典' },
        { label: '申请编辑', command: '/申请词典编辑权限' },
        { label: '录入词典', command: '/录入词典' }
      ],
      nav: view.searchReference
        ? {
            current: result.currentPage,
            total: result.totalPages,
            count: result.total,
            command: `/词典 续查 ${view.searchReference} p{page}`
          }
        : undefined
    })
  );
});
