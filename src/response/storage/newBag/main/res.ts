import { appendMiddlewareAdvice, appendMiddlewareBlocks } from '@src/response/middlewareReply';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { storageBagRecoveryTips } from '@src/response/storageBagRecovery';
import { useMessage } from '@src/utils/useMessage';
/**
 * 新储物袋主入口处理器
 * 路由: /储物袋
 * 功能: 显示一级分类 tabs，点击直接进入对应分类
 */

import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotStorageMenu } from '@src/api/bot/inventory';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';
import type { RobotMiddlewareReply } from '@src/api/bot/middleware-entry';
import { createPrimaryTabsBar } from '../tabs';

const response = onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;

  const [, parentNext] = useEvent();
  const renderFailure = adviceRenderer(async (reply: RobotMiddlewareReply) => {
    const md = Format.createMarkdown();

    md.addText(reply.text);
    if (reply.quote) {
      md.addBlockquote(Format.createMarkdown().addText(reply.quote));
    }
    appendMiddlewareBlocks(
      md,
      reply.blocks?.filter(block => block.text !== reply.text || block.inlineButtons?.length)
    );
    appendMiddlewareAdvice(md, reply.advice);
    await message.send(FormatGui({ isPrivate, bid, title: '储物袋', content: md, footer: reply.buttons.length ? reply.buttons : createPrimaryTabsBar() }));
  });
  const response = await runRobotBusiness(e, 'storage.menu', {}, parseRobotStorageMenu, parentNext, renderFailure).catch(async error => {
    logger.error('储物袋菜单加载失败', error);
    await renderFailure({
      title: '',
      heading: '',
      text: '查询储物袋失败，请稍后重试',
      buttons: [],
      advice: storageBagRecoveryTips('storage.menu', '查询失败')
    });

    return { handled: true as const };
  });

  if (response.handled) {
    return;
  }
  const result = { data: response.data };
  const md = Format.createMarkdown();

  md.addText(result.data.message);

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '储物袋',
      content: md,
      footer: createPrimaryTabsBar()
    })
  );
});

export default response;
