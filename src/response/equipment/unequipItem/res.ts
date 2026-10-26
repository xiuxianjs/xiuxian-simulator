import { appendMiddlewareAdvice, appendMiddlewareBlocks } from '@src/response/middlewareReply';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { equipmentRecoveryTips } from '@src/response/equipmentRecovery';
import { useMessage } from '@src/utils/useMessage';
import { parseRobotEquipmentUnequipOne } from '@src/api/bot/equipment-unequip-one';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';

/**
 * 卸下{装备类型}指令
 * 进行卸下装备操作
 */
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const [, next] = useEvent();
  const isPrivate = e.isPrivate ?? false;

  const messageText = e.MessageText.trim();
  const match = messageText.match(/^(!|！|\/|#|＃)?卸下\s+(.+)$/);

  const equipmentTypeName = match?.[2]?.trim() ?? null;

  try {
    const result = await runRobotBusiness(
      e,
      'equipment.unequip-one',
      { equipmentTypeName },
      parseRobotEquipmentUnequipOne,
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
        if (reply.buttons.length) {
          md.addNewline();
        }
        await message.send(
          FormatGui({
            isPrivate,
            bid,
            title: '',
            content: md,
            footer: reply.buttons.length ? reply.buttons.map(button => ({ label: button.label, command: button.command })) : undefined
          })
        );
      })
    );

    if (result.handled) {
      return;
    }
    const md = Format.createMarkdown();

    md.addText(`成功卸下${equipmentTypeName}`);
    md.addNewline();

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md, footer: [{ label: '我的装备', command: '/我的装备' }] }));
  } catch (error) {
    logger.error('卸下装备操作失败:', error);
    const md = Format.createMarkdown();

    md.addText('卸下装备操作失败，请稍后重试');
    appendMiddlewareAdvice(md, equipmentRecoveryTips('equipment.unequip-one', '卸下装备操作失败，请稍后重试'));
    md.addNewline();

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md, footer: [{ label: '我的装备', command: '/我的装备' }] }));
  }
});
