import { appendMiddlewareAdvice, appendMiddlewareBlocks } from '@src/response/middlewareReply';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { storageBagRecoveryTips } from '@src/response/storageBagRecovery';
import { useMessage } from '@src/utils/useMessage';
/**
 * 本命物分类处理器
 * 路由:
 *   /储物袋 本命 - 显示储物袋中的本命物实例（未炼化且未上架）
 *
 * 数据来源：
 *   Go 本命物背包投影 → 服务端已筛选未炼化、未上架实例并给出操作资格
 */

import { EMPTY_STRING } from '@src/constants';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseSoulArtifactBag } from '@src/api/bot/queries';
import { selects } from '@src/response/config';
import { formatSoulArtifactItem } from '@src/response/storage/newBag/soulArtifacts/formatter';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';
const response = onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;

  try {
    const args = (e.MessageText ?? EMPTY_STRING)
      .replace(/^(!|！|\/|#|＃)?(我的)?(储物袋|背包)\s+本命\s*/, EMPTY_STRING)
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const [, parentNext] = useEvent();
    const response = await runRobotBusiness(
      e,
      'storage.soul-artifacts',
      { args },
      parseSoulArtifactBag,
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

        await message.send(
          FormatGui({
            isPrivate,
            bid,
            title: '储物袋 · 本命',
            content: md,
            footer: reply.buttons.length ? reply.buttons : [{ label: '商店', command: '/商店' }]
          })
        );
      })
    );

    if (response.handled) {
      return;
    }
    const result = { data: response.data };
    const page = response.data.page;

    const md = Format.createMarkdown();

    if (result.data.total === 0) {
      md.addText('暂无本命物');
      appendMiddlewareAdvice(md, storageBagRecoveryTips('storage.soul-artifacts', '暂无本命物'));
      md.addNewline();

      void message.send(FormatGui({ isPrivate, bid, title: '储物袋 · 本命', content: md }));

      return;
    }

    if (!result.data.items.length) {
      md.addText(`本页暂无本命物，当前背包共 ${result.data.total} 件`);
      appendMiddlewareAdvice(md, storageBagRecoveryTips('storage.soul-artifacts', '当前页无记录'));
    }
    let hasUnavailableRefine = false;

    for (const item of result.data.items) {
      formatSoulArtifactItem(item, md);
      if (!item.canRefine) {
        md.addText('当前未提供炼化入口，请核对实例详情与当前本命物');
        hasUnavailableRefine = true;
      }
      md.addNewline();
    }
    if (hasUnavailableRefine) {
      appendMiddlewareAdvice(md, storageBagRecoveryTips('storage.soul-artifacts', '未提供炼化入口'));
    }
    md.addNewline();

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '储物袋 · 本命',
        content: md,
        nav: {
          current: page,
          total: Math.ceil(result.data.total / result.data.pageSize),
          command: '/储物袋 本命 {page}'
        }
      })
    );
  } catch (error) {
    logger.error('本命物分类处理失败:', error);
    const md = Format.createMarkdown();

    md.addText('查询本命物失败，请稍后重试');
    appendMiddlewareAdvice(md, storageBagRecoveryTips('storage.soul-artifacts', '查询失败'));

    void message.send(FormatGui({ isPrivate, bid, title: '储物袋 · 本命', content: md }));
  }
});

export default response;
