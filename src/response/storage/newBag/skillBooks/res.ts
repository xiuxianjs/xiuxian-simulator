import { appendMiddlewareAdvice, appendMiddlewareBlocks } from '@src/response/middlewareReply';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { storageBagRecoveryTips } from '@src/response/storageBagRecovery';
import { useMessage } from '@src/utils/useMessage';
/**
 * 功法分类处理器
 * 路由:
 *   /储物袋 功法 - 显示所有功法
 *   /储物袋 功法 2 - 显示所有功法第2页
 *   /储物袋 功法 战技 - 显示战技功法
 *   /储物袋 功法 战技 2 - 显示战技第2页
 *
 * 注意：功法仍使用 userSkillBooks 表
 */

import { EMPTY_STRING, ZERO_VALUE as EMPTY_TOTAL } from '@src/constants';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotStorageSkillBooks } from '@src/api/bot/queries';
import { selects } from '@src/response/config';
import { addOptions, createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';
import { renderSubTabs, SKILL_SUB_TABS } from '../tabs';
import { skillBookItemActions, skillBookPageActions } from '../capabilities';

const response = onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;

  try {
    const args = (e.MessageText ?? EMPTY_STRING)
      .replace(/\s+操作(?=\s|$)/, '')
      .replace(/^(!|！|\/|#|＃)?(我的)?(储物袋|背包)\s+功法\s*/, EMPTY_STRING)
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const [, parentNext] = useEvent();
    const response = await runRobotBusiness(
      e,
      'storage.skill-books',
      { args },
      parseRobotStorageSkillBooks,
      parentNext,
      adviceRenderer(async reply => {
        const md = Format.createMarkdown().addText(reply.text);

        if (reply.quote) {
          md.addBlockquote(Format.createMarkdown().addText(reply.quote));
        }
        appendMiddlewareBlocks(
          md,
          reply.blocks?.filter(block => block.text !== reply.text || block.inlineButtons?.length)
        );
        appendMiddlewareAdvice(md, reply.advice);

        await message.send(FormatGui({ isPrivate, bid, title: '储物袋 · 功法', content: md, footer: reply.buttons.length ? reply.buttons : undefined }));
      })
    );

    if (response.handled) {
      return;
    }
    const result = { data: response.data };
    const page = response.data.page;
    const skillType = response.data.requestedType;

    const baseCommand = skillType ? `/储物袋 功法 ${skillType}` : '/储物袋 功法';

    if (/\s+操作(?:\s|$)/.test(e.MessageText ?? '')) {
      const md = Format.createMarkdown().addText('选择批量操作；分解前会展示本批收益并要求确认，每次最多300本。');

      if (!skillBookPageActions(result.data.capabilities).length) {
        md.addNewline().addText('当前没有可用批量入口');
        appendMiddlewareAdvice(md, storageBagRecoveryTips('storage.skill-books', '暂无批量操作'));
      }

      void message.send(
        FormatGui({
          isPrivate,
          bid,
          title: '功法 · 批量处理',
          content: md,
          footer: [...skillBookPageActions(result.data.capabilities), { label: '返回功法', command: baseCommand }]
        })
      );

      return;
    }

    const total = result.data.total;
    const totalPages = result.data.totalPages;

    // 如果总数为0，显示暂无物品
    if (total === EMPTY_TOTAL) {
      const md = Format.createMarkdown();

      // 二级子类 tabs（内联 markdown）
      renderSubTabs(md, SKILL_SUB_TABS, skillType || '全部');

      md.addText('该类型暂无功法');
      appendMiddlewareAdvice(md, storageBagRecoveryTips('storage.skill-books', '该类型暂无功法'));

      void message.send(FormatGui({ isPrivate, bid, title: '储物袋 · 功法', content: md }));

      return;
    }

    const pageSkillBooks = result.data.items;

    // 显示功法列表
    const md = Format.createMarkdown();

    // 二级子类 tabs（内联 markdown）
    renderSubTabs(md, SKILL_SUB_TABS, skillType || '全部');

    if (!pageSkillBooks.length) {
      md.addText(`本页暂无功法，当前分类共 ${total} 本`);
      appendMiddlewareAdvice(md, storageBagRecoveryTips('storage.skill-books', '当前页无记录'));
    }
    let hasUnavailableLearn = false;

    md.addText('词条数值：当前 / 本功法上限').addNewline();
    // 格式化功法显示（使用功法ID作为编号）
    pageSkillBooks.forEach(item => {
      const lines = [`【${item.id}】`];

      lines.push(`「${item.displayName}」 ${item.displayGrade} · ${item.displaySkillType}`);
      for (let i = 0; i < item.attributeParts.length; i += 2) {
        lines.push(item.attributeParts.slice(i, i + 2).join(' ｜ '));
      }
      md.addText(lines[0]);
      addOptions(md, skillBookItemActions(item));
      if (!item.capabilities.some(capability => capability.kind === 'learn')) {
        md.addText('当前未提供学习入口，请核对实例详情与保护状态').addNewline();
        hasUnavailableLearn = true;
      }
      md.addText(lines[1]).addNewline();
      if (lines.length > 2) {
        md.addBlockquote(createQuoteMarkdown(lines.slice(2)));
      }
      md.addNewline();
    });

    if (hasUnavailableLearn) {
      appendMiddlewareAdvice(md, storageBagRecoveryTips('storage.skill-books', '未提供学习入口'));
    }

    // 使用 FormatGui nav 分页
    const pageBase = skillType ? `/储物袋 功法 ${skillType}` : '/储物袋 功法';

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '储物袋 · 功法',
        content: md,
        nav: {
          current: page,
          total: totalPages,
          command: `${pageBase} {page}`
        },
        footer: [
          { label: '我的功法', command: '/我的功法' },
          { label: '批量处理', command: `${baseCommand} 操作` }
        ]
      })
    );
  } catch (error) {
    logger.error('功法分类处理失败:', error);
    const md = Format.createMarkdown();

    md.addText('查询功法失败，请稍后重试');
    appendMiddlewareAdvice(md, storageBagRecoveryTips('storage.skill-books', '查询失败'));

    void message.send(FormatGui({ isPrivate, bid, title: '储物袋 · 功法', content: md }));
  }
});

export default response;
