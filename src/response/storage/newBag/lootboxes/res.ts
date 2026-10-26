import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { appendMiddlewareAdvice, appendMiddlewareBlocks } from '@src/response/middlewareReply';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { lootboxRecoveryTips } from '@src/response/lootboxRecovery';
import { useMessage } from '@src/utils/useMessage';
/**
 * 礼盒分类处理器
 * 路由:
 *   /储物袋 礼盒 - 显示礼盒列表
 *   /储物袋 礼盒 2 - 显示礼盒第2页
 */

import { EMPTY_STRING, ZERO_VALUE as EMPTY_TOTAL } from '@src/constants';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseBackendLootboxes } from '@src/api/bot/queries';
import { selects } from '@src/response/config';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';
import { createPrimaryTabsBar } from '../tabs';
import { lootboxActions } from './capabilities';

const response = onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;

  try {
    const args = (e.MessageText ?? EMPTY_STRING)
      .replace(/^(!|！|\/|#|＃)?(我的)?(储物袋|背包)\s+礼盒\s*/, EMPTY_STRING)
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const [, parentNext] = useEvent();
    const response = await runRobotBusiness(
      e,
      'storage.lootboxes',
      { args },
      parseBackendLootboxes,
      parentNext,
      adviceRenderer(async reply => {
        const md = Format.createMarkdown().addText(reply.text);

        if (reply.quote) {
          md.addBlockquote(createQuoteMarkdown(reply.quote.split('\n')));
        }
        appendMiddlewareBlocks(
          md,
          reply.blocks?.filter(block => block.text !== reply.text || block.inlineButtons?.length)
        );
        appendMiddlewareAdvice(md, reply.advice);
        await message.send(
          FormatGui({ isPrivate, bid, title: '礼盒', content: md, footer: [...createPrimaryTabsBar('礼盒'), ...(reply.buttons.length ? [reply.buttons] : [])] })
        );
      })
    );

    if (response.handled) {
      return;
    }
    const result = { data: response.data };
    const page = response.data.page;

    const md = Format.createMarkdown();

    if (result.data.total === EMPTY_TOTAL) {
      md.addText('暂无礼盒');
      appendMiddlewareAdvice(md, lootboxRecoveryTips('storage.lootboxes', '暂无礼盒'));

      void message.send(FormatGui({ isPrivate, bid, title: '礼盒', content: md, footer: createPrimaryTabsBar('礼盒') }));

      return;
    }

    if (result.data.items.length === 0) {
      md.addText(`本页暂无礼盒，当前共 ${result.data.total} 条礼盒记录`);
      appendMiddlewareAdvice(md, lootboxRecoveryTips('storage.lootboxes', '本页无记录'));
    }
    result.data.items.forEach(item => {
      const lootboxMd = Format.createMarkdown().addText(` 🎁 ${item.name} x${item.quantity}`);

      const actions = lootboxActions(item);

      actions.forEach(action => {
        lootboxMd.addText(' ');
        lootboxMd.addButton(markdownButtonLabel(`${action.label}`), { data: action.command });
      });
      if (actions.length === 0) {
        lootboxMd.addText(' · 当前没有可用开启入口');
        appendMiddlewareAdvice(lootboxMd, lootboxRecoveryTips('storage.lootboxes', '暂无可用开启选项'));
      }
      md.addBlockquote(lootboxMd);
      md.addNewline();
      if (item.description) {
        md.addBlockquote(Format.createMarkdown().addText(` ${item.description}`));
      }
    });

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '礼盒',
        content: md,
        nav: {
          current: page,
          total: Math.ceil(result.data.total / result.data.pageSize),
          command: '/储物袋 礼盒 {page}'
        },
        footer: createPrimaryTabsBar('礼盒')
      })
    );
  } catch (error) {
    logger.error('礼盒分类处理失败:', error);
    const md = Format.createMarkdown();

    md.addText('查询礼盒失败，请稍后重试');
    appendMiddlewareAdvice(md, lootboxRecoveryTips('storage.lootboxes', '查询失败'));

    void message.send(FormatGui({ isPrivate, bid, title: '礼盒', content: md, footer: createPrimaryTabsBar('礼盒') }));
  }
});

export default response;
