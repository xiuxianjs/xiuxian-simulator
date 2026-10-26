import { appendMiddlewareAdvice, appendMiddlewareBlocks } from '@src/response/middlewareReply';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { storageBagRecoveryTips } from '@src/response/storageBagRecovery';
import { useMessage } from '@src/utils/useMessage';
/**
 * 天工分类处理器
 * 路由:
 *   /储物袋 天工 - 显示天工工具类型按钮（火焰/丹炉/炼器台）
 *   /储物袋 天工 火焰 - 显示火焰列表
 *   /储物袋 天工 火焰 2 - 显示火焰第2页
 *
 * 注意：天工物品使用独立的 user_profession_tools 表
 */

import { EMPTY_STRING, ZERO_VALUE as EMPTY_TOTAL } from '@src/constants';
import type { TiangongBagCapability, TiangongBagItem } from '@src/response-apps/storage/newBag/tiangong/app';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseProfessionToolBag } from '@src/api/bot/queries';
import { selects } from '@src/response/config';
import { addOptions, FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';
import { renderSubTabs } from '../tabs';

const itemAction = (kind: TiangongBagCapability, item: TiangongBagItem): { label: string; command: string } => {
  switch (kind) {
    case 'replace':
      return { label: '替换', command: `/替换 ${item.id}` };
    case 'unlock':
      return { label: '解锁', command: `/解锁 天工 ${item.id}` };
    case 'lock':
      return { label: '锁定', command: `/锁定 天工 ${item.id}` };
    case 'viewDetail':
      return { label: '详情', command: `/物品详情 ${item.name}` };
    default:
      throw new Error(`天工接口返回无效物品能力: ${kind}`);
  }
};

const pageAction = (kind: TiangongBagCapability, activeType: string): { label: string; command: string } => {
  switch (kind) {
    case 'lockAll':
      return { label: '一键锁定', command: `/锁定 天工 ${activeType}` };
    case 'unlockAll':
      return { label: '一键解锁', command: `/解锁 天工 ${activeType}` };
    default:
      throw new Error(`天工接口返回无效页面能力: ${kind}`);
  }
};

const response = onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;

  try {
    const args = (e.MessageText ?? EMPTY_STRING)
      .replace(/^(!|！|\/|#|＃)?(我的)?(储物袋|背包)\s+天工\s*/, EMPTY_STRING)
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const [, parentNext] = useEvent();
    const response = await runRobotBusiness(
      e,
      'storage.profession-tools',
      { args },
      parseProfessionToolBag,
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

        await message.send(FormatGui({ isPrivate, bid, title: '', content: md, footer: reply.buttons.length ? reply.buttons : undefined }));
      })
    );

    if (response.handled) {
      return;
    }
    const result = { data: response.data };
    const page = response.data.page;

    const { types, activeType, total, totalPages, items, capabilities } = result.data;
    const pageTools = items;

    const md = Format.createMarkdown();

    // 二级子类 tabs（动态，内联 markdown）
    const subTabs = types.map(t => ({ label: t, command: `/储物袋 天工 ${t}` }));

    renderSubTabs(md, subTabs, activeType ?? undefined);

    if (!activeType) {
      md.addText('暂无天工类型');
      appendMiddlewareAdvice(md, storageBagRecoveryTips('storage.profession-tools', '暂无天工类型'));

      void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

      return;
    }

    // 如果总数为0，显示暂无物品
    if (total === EMPTY_TOTAL) {
      md.addText('该类型暂无天工工具');
      appendMiddlewareAdvice(md, storageBagRecoveryTips('storage.profession-tools', '该类型暂无天工工具'));

      void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

      return;
    }

    if (!items.length) {
      md.addText(`本页暂无天工工具，当前分类共 ${total} 件`);
      appendMiddlewareAdvice(md, storageBagRecoveryTips('storage.profession-tools', '当前页无记录'));
    }
    let hasUnavailableReplace = false;

    // 格式化天工工具显示，添加快捷按钮
    pageTools.forEach(item => {
      const lockIcon = item.isLocked ? '🔒' : '';

      // 基础信息和操作按钮
      md.addText(`【${item.id}】 ${lockIcon}${item.name}-${item.grade}`);

      addOptions(
        md,
        item.capabilities.map(kind => itemAction(kind, item))
      );

      if (!item.capabilities.includes('replace')) {
        md.addText('当前未提供替换入口，请核对工具详情与职业状态');
        hasUnavailableReplace = true;
      }
      md.addNewline();

      // 图片面板行
    });

    if (hasUnavailableReplace) {
      appendMiddlewareAdvice(md, storageBagRecoveryTips('storage.profession-tools', '未提供替换入口'));
    }

    // 操作按钮放入 bar
    md.addNewline();

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '',
        content: md,
        nav: {
          current: page,
          total: totalPages,
          command: `/储物袋 天工 ${activeType} {page}`
        },
        footer: capabilities.map(kind => pageAction(kind, activeType))
      })
    );
  } catch (error) {
    logger.error('天工分类处理失败:', error);
    const md = Format.createMarkdown();

    md.addText('查询天工工具失败，请稍后重试');
    appendMiddlewareAdvice(md, storageBagRecoveryTips('storage.profession-tools', '查询失败'));

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
  }
});

export default response;
