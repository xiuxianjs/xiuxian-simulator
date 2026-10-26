import { appendMiddlewareAdvice, appendMiddlewareBlocks } from '@src/response/middlewareReply';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { equipmentRecoveryTips } from '@src/response/equipmentRecovery';
import { useMessage } from '@src/utils/useMessage';
import { recoveryEffectsMarkdown } from '@src/utils/resourceRecoveryDisplay';
import { parseRobotEquipmentDetail } from '@src/api/bot/equipment-detail-queries';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { formatStatParts } from '@src/response/equipment/setEffectFormat';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';

/**
 * 我的{装备类型}指令
 * 显示特定部位装备的详细信息
 */
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const [, next] = useEvent();
  const isPrivate = e.isPrivate ?? false;

  // 从消息中提取装备类型
  const messageText = e.MessageText.trim();
  const match = messageText.match(/^(!|！|\/|#|＃)?我的(武器|饰品|法袍|衣服|鞋子?|头饰|羽翼)$/);

  const equipmentTypeName = match?.[2]?.trim() ?? null;

  try {
    const result = await runRobotBusiness(
      e,
      'equipment.detail',
      { typeName: equipmentTypeName },
      parseRobotEquipmentDetail,
      next,
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

    if (result.handled) {
      return;
    }
    const { item: equippedItem, playerName } = result.data;

    const md = Format.createMarkdown();

    md.addText(`装备名称：${equippedItem.equipment.name}`);
    md.addNewline();
    md.addText(`品级：${equippedItem.equipment.grade?.name ?? '未知'}`);
    md.addNewline();
    md.addText(`装备ID：${equippedItem.id}`);
    md.addNewline();

    if (equippedItem.crafterName) {
      md.addText(`打造者：${equippedItem.crafterName}`);
      md.addNewline();
    }

    // 构建属性列表，只显示大于0的属性值
    const attrs = formatStatParts(equippedItem, 'full', '：').map(s => `   ${s}`);

    if (attrs.length > 0) {
      md.addNewline();
      md.addText('【属性信息】');
      md.addNewline();
      attrs.forEach(attr => {
        md.addText(attr);
        md.addNewline();
      });
    } else {
      md.addNewline();
      md.addText('【属性信息】');
      md.addNewline();
      md.addText('暂无属性加成');
      md.addNewline();
    }

    md.addNewline();
    md.addText(`状态：${equippedItem.isLocked ? '已锁定' : '未锁定'}`);
    md.addNewline();

    md.addNewline();

    if (equippedItem.recoveryEffects?.length) {
      md.addBlockquote(recoveryEffectsMarkdown(equippedItem.recoveryEffects));
    }
    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: `${playerName}的${equipmentTypeName}详情`,
        content: md,
        footer: [{ label: `卸下 ${equipmentTypeName}`, command: `/卸下 ${equipmentTypeName}` }]
      })
    );
  } catch (error) {
    logger.error('获取装备详情失败:', error);
    const md = Format.createMarkdown();

    md.addText('获取装备详情失败，请稍后重试');
    appendMiddlewareAdvice(md, equipmentRecoveryTips('equipment.detail', '查询失败'));

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
  }
});
