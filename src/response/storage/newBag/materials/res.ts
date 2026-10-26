import { appendMiddlewareAdvice, appendMiddlewareBlocks } from '@src/response/middlewareReply';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { storageBagRecoveryTips } from '@src/response/storageBagRecovery';
import { useMessage } from '@src/utils/useMessage';
/**
 * 材料分类处理器
 * 路由:
 *   /储物袋 材料 - 显示二级分类
 *   /储物袋 材料 草药 - 显示草药列表
 *   /储物袋 材料 草药 2 - 显示草药第2页
 *   /储物袋 材料 经验 - 显示经验材料列表
 *   /储物袋 材料 其它 - 显示其它材料列表
 */

import { EMPTY_STRING, ZERO_VALUE as EMPTY_TOTAL } from '@src/constants';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotStorageBag } from '@src/api/bot/inventory';
import { selects } from '@src/response/config';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';
import { MATERIAL_SUB_TABS, renderSubTabs } from '../tabs';
import { inventoryItemActions, inventoryPageActions } from '../capabilities';

const response = onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;

  try {
    const args = (e.MessageText ?? EMPTY_STRING)
      .replace(/^(!|！|\/|#|＃)?(我的)?(储物袋|背包)\s+材料\s*/, EMPTY_STRING)
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const [, parentNext] = useEvent();
    const response = await runRobotBusiness(
      e,
      'storage.materials',
      { args },
      parseRobotStorageBag,
      parentNext,
      adviceRenderer(async reply => {
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
        await message.send(FormatGui({ isPrivate, bid, title: '', content: md, footer: reply.buttons.length ? reply.buttons : undefined }));
      })
    );

    if (response.handled) {
      return;
    }
    const result = { data: response.data };

    const activeSubcategory = result.data.activeSubcategory;

    // 映射英文代码到中文名称
    const subcategoryNameMap: Record<string, string> = {
      herb: '草药',
      exp: '经验材料',
      other: '其它'
    };

    const subcategoryName = subcategoryNameMap[activeSubcategory] || activeSubcategory;

    const md = Format.createMarkdown();

    // 二级子类 tabs（内联 markdown）
    renderSubTabs(md, MATERIAL_SUB_TABS, subcategoryName);

    // 如果总数为0，显示暂无物品
    if (result.data.total === EMPTY_TOTAL) {
      md.addText('该分类暂无物品');
      appendMiddlewareAdvice(md, storageBagRecoveryTips('storage.materials', '该分类暂无物品'));

      void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

      return;
    }

    // 显示物品列表

    // 格式化每个物品（使用物品ID作为编号）

    if (!result.data.items.length) {
      md.addText(`本页暂无物品，当前分类共 ${result.data.total} 条记录`);
      appendMiddlewareAdvice(md, storageBagRecoveryTips('storage.materials', '当前页无记录'));
    }

    result.data.items.forEach(item => {
      const lockIcon = item.isLocked ? '🔒' : '';
      const gradeName = item.grade?.name ?? '未知';
      const realmName = item.realm?.name ?? '未知';

      md.addBlockquote(
        createQuoteMarkdown(
          [` 【${item.id}】${lockIcon}${item.name} x${item.quantity}`, ` 品级: ${gradeName} | 境界: ${realmName}`],
          inventoryItemActions(item)
        )
      );

      md.addNewline();
    });

    // 操作按钮放入 bar
    md.addNewline();

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '',
        content: md,
        nav: {
          current: result.data.page,
          total: Math.ceil(result.data.total / result.data.pageSize),
          command: `/储物袋 材料 ${subcategoryName} {page}`
        },
        footer: inventoryPageActions(result.data.capabilities, '材料', subcategoryName)
      })
    );
  } catch (error) {
    logger.error('材料分类处理失败:', error);
    const md = Format.createMarkdown();

    md.addText('查询材料失败，请稍后重试');
    appendMiddlewareAdvice(md, storageBagRecoveryTips('storage.materials', '查询失败'));

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
  }
});

export default response;
