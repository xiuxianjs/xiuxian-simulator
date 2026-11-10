import { withBusinessRecovery } from '@src/response/businessRecovery';
import { skillInventoryRecoveryTips } from '@src/response/skillInventoryRecovery';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { appendMiddlewareAdvice, sendMiddlewareReply } from '@src/response/middlewareReply';
import { useMessage } from '@src/utils/useMessage';
import { SKILL_TYPE_BATTLE, SKILL_TYPE_MYSTIC, SKILL_TYPE_PASSIVE } from '@src/constants';
import { MIN_PAGE } from '@src/constants/common';
import { parseRobotLearnedBooks } from '@src/api/bot/learned-books-queries';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { section } from '@src/response/presentation/sections';
import { DAMAGE_TYPE_TEXT } from '@src/utils/skillBookHelper';
import { buildLearnedBookListCommand, createLearnedBookSortRows, learnedBookSortLabel, parseLearnedBookListCommand } from '@src/utils/learnedBookSort';
import { Format, onResponse, useEvent } from 'alemonjs';
// 常量定义
const EMPTY_TOTAL = 0; // 空总数量

// 功法槽位类型列表
const SKILL_SLOTS = [SKILL_TYPE_BATTLE, SKILL_TYPE_MYSTIC, SKILL_TYPE_PASSIVE] as const;

const response = onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? e.name.startsWith('private.');

  const [, parentNext] = useEvent();

  const selection = parseLearnedBookListCommand(e.MessageText ?? '');
  const pageCommand = buildLearnedBookListCommand(selection.sort, '{page}');

  // 页码由组合业务 API 按原规则解析。
  const failed = adviceRenderer(reply => sendMiddlewareReply(e, withBusinessRecovery('skill-books.learned', { ...reply, title: reply.title || '我的功法' }), 'footer')
  );

  const response = await runRobotBusiness(
    e,
    'skill-books.learned',
    { page: selection.page, ...(selection.sort ? { sort: selection.sort } : {}) },
    parseRobotLearnedBooks,
    parentNext,
    failed
  ).catch(async () => {
    await failed({ title: '', heading: '', text: '功法列表未获完整确认，请先核对当前列表与原反馈。', buttons: [], advice: [] });

    return { handled: true as const };
  });

  if (response.handled) {
    return;
  }
  const page = response.data.displayPage;
  const result = { data: response.data.page };

  const { inUseBooks, items, total, totalPages, currentPage, proficiencyPoints } = result.data;
  const emptyMessage = inUseBooks.length ? '💡当前可见列表为空，可核对装备槽位与隐藏列表' : '💡暂无已学习的功法';
  const sortLabel = selection.sort ? learnedBookSortLabel(selection.sort) : '';

  if (selection.showSortMenu && page > MIN_PAGE && items.length > EMPTY_TOTAL) {
    await message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '功法排序',
        content: Format.createMarkdown()
          .addText(`排序：${sortLabel || '默认'}`)
          .addNewline(),
        footer: [...createLearnedBookSortRows(selection.sort), [{ label: '返回列表', command: buildLearnedBookListCommand(selection.sort, page) }]]
      })
    );

    return;
  }

  // 构建当前装备功法槽位显示
  const slotContent = Format.createMarkdown();

  slotContent.addText(`持有熟练点：${proficiencyPoints}`);
  slotContent.addNewline();
  slotContent.addNewline();

  SKILL_SLOTS.forEach(slotType => {
    const equipped = inUseBooks.find(book => book.skillType === slotType);

    if (equipped) {
      slotContent.addBlockquote(
        section({
          title: slotType,
          suffix: `· ${equipped.slotText}`,
          lines: [],
          actions: [
            { label: '选择', command: `/切换${slotType}` },
            { label: '查看', command: `/查看功法 ${equipped.id}` },
            { label: '换下', command: `/换下${slotType}` }
          ]
        })
      );
    } else {
      slotContent.addBlockquote(
        section({
          title: slotType,
          lines: ['状态：空'],
          actions: [{ label: '选择', command: `/切换${slotType}` }]
        })
      );
    }
  });

  // 首页展示使用槽位，功法列表从第二页开始。
  if (page === MIN_PAGE) {
    if (total === EMPTY_TOTAL) {
      slotContent.addText(emptyMessage).addNewline();
      appendMiddlewareAdvice(slotContent, skillInventoryRecoveryTips('skill-books.learned', '可见列表为空'));
    }
    await message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '我的功法',
        header: [{ label: '返回', command: '/属性面板' }],
        content: slotContent,
        footer: [
          ...(total > EMPTY_TOTAL ? [{ label: '功法列表', command: buildLearnedBookListCommand(selection.sort) }] : []),
          ...(result.data.canUseFifthLayerFeature ? [{ label: '战斗模板', command: '/战斗模板' }] : []),
          { label: '一键学习', command: '/一键学习功法' },
          { label: '功法书', command: '/储物袋 功法' },
          { label: '隐藏列表', command: '/我的隐藏功法' }
        ],
        ...(total > EMPTY_TOTAL ? { nav: { current: MIN_PAGE, total: totalPages + 1, command: pageCommand } } : {})
      })
    );

    return;
  }

  // 如果没有功法
  if (total === EMPTY_TOTAL) {
    slotContent.addText(emptyMessage);
    appendMiddlewareAdvice(slotContent, skillInventoryRecoveryTips('skill-books.learned', '可见列表为空'));
    slotContent.addNewline();

    await message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '我的功法',
        header: [{ label: '返回', command: '/属性面板' }],
        content: slotContent,
        footer: [
          { label: '一键学习', command: '/一键学习功法' },
          { label: '功法书', command: '/储物袋 功法' }
        ]
      })
    );

    return;
  }

  // 如果页码超出范围
  if (items.length === EMPTY_TOTAL && total > EMPTY_TOTAL) {
    slotContent.addText('❌ 页码超出范围');
    slotContent.addNewline();
    slotContent.addText(`总功法数: ${total}，请选择 2-${totalPages + 1} 之间的页码`);
    appendMiddlewareAdvice(slotContent, skillInventoryRecoveryTips('skill-books.learned', '页码超出范围'));

    await message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '我的功法',
        header: [{ label: '返回', command: '/属性面板' }],
        content: slotContent,
        nav: { current: MIN_PAGE + 1, total: totalPages + 1, count: total, command: pageCommand },
        footer: [
          { label: '一键学习', command: '/一键学习功法' },
          { label: '功法书', command: '/储物袋 功法' }
        ]
      })
    );

    return;
  }

  // 构建功法列表
  const listContent = Format.createMarkdown();

  listContent.addText(sortLabel ? `排序：${sortLabel}` : '已学功法').addNewline();

  items.forEach(book => {
    const damage = book.damageType ? (DAMAGE_TYPE_TEXT[book.damageType] ?? book.damageType) : null;

    listContent.addBlockquote(
      section({
        title: book.name,
        id: book.id,
        suffix: `· ${book.statusText}`,
        lines: [[book.skillType, damage, `熟练度 ${book.proficiency}%`].filter(Boolean).join(' · ')],
        actions: [
          { label: '查看', command: `/查看功法 ${book.id}` },
          { label: '连续升级', command: `/升级功法 ${book.id} 选择` }
        ]
      })
    );
  });

  await message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '我的功法',
      content: listContent,
      footer: [
        [
          { label: '排序', command: `${buildLearnedBookListCommand(selection.sort, page)} 排序选项` },
          { label: '返回', command: '/我的功法' }
        ],
        [
          ...(result.data.canUseFifthLayerFeature ? [{ label: '战斗模板', command: '/战斗模板' }] : []),
          { label: '一键学习', command: '/一键学习功法' },
          { label: '一键分解预览', command: '/一键分解功法' },
          { label: '隐藏列表', command: '/我的隐藏功法' }
        ]
      ],
      nav: { current: currentPage + 1, total: totalPages + 1, count: total, command: pageCommand }
    })
  );
});

export default response;
