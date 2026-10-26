import { appendMiddlewareAdvice, appendMiddlewareBlocks } from '@src/response/middlewareReply';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { equipmentRecoveryTips } from '@src/response/equipmentRecovery';
import { useMessage } from '@src/utils/useMessage';
import { parseEquipCommand, parseRobotEquipmentEquip } from '@src/api/bot/equipment-equip';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';

/**
 * 装备{装备名}或装备{储物装备的id}指令
 * 进行装备操作
 */
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const [, next] = useEvent();
  const isPrivate = e.isPrivate ?? false;

  const identifier = parseEquipCommand(e.MessageText);

  try {
    const result = await runRobotBusiness(
      e,
      'equipment.equip',
      { identifier },
      parseRobotEquipmentEquip,
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
    const md = Format.createMarkdown();

    md.addText(`✅ ${result.data.message}`);
    md.addNewline();

    if (result.data.equipment) {
      const eq = result.data.equipment;

      const card = Format.createMarkdown()
        .addText(`装备名称：${eq.equipment.name}`)
        .addNewline()
        .addText(`品级：${eq.equipment.grade?.name ?? '未知'}`)
        .addNewline()
        .addText(`类型：${eq.equipment.equipmentType?.name ?? '未知'}`);

      if (eq.physicalAttack && eq.physicalAttack > 0) {
        card.addNewline().addText(`物理攻击：${eq.physicalAttack}`);
      }
      if (eq.physicalAttackPercent && eq.physicalAttackPercent > 0) {
        card.addNewline().addText(`物理攻击加成：${+Number(eq.physicalAttackPercent).toFixed(2)}%`);
      }
      if (eq.magicAttack && eq.magicAttack > 0) {
        card.addNewline().addText(`法术攻击：${eq.magicAttack}`);
      }
      if (eq.magicAttackPercent && eq.magicAttackPercent > 0) {
        card.addNewline().addText(`法术攻击加成：${+Number(eq.magicAttackPercent).toFixed(2)}%`);
      }
      if (eq.physicalDefense && eq.physicalDefense > 0) {
        card.addNewline().addText(`物理防御：${eq.physicalDefense}`);
      }
      if (eq.physicalDefensePercent && eq.physicalDefensePercent > 0) {
        card.addNewline().addText(`物理防御加成：${+Number(eq.physicalDefensePercent).toFixed(2)}%`);
      }
      if (eq.magicDefense && eq.magicDefense > 0) {
        card.addNewline().addText(`法术防御：${eq.magicDefense}`);
      }
      if (eq.magicDefensePercent && eq.magicDefensePercent > 0) {
        card.addNewline().addText(`法术防御加成：${+Number(eq.magicDefensePercent).toFixed(2)}%`);
      }
      if (eq.hp && eq.hp > 0) {
        card.addNewline().addText(`生命：${eq.hp}`);
      }
      if (eq.hpPercent && eq.hpPercent > 0) {
        card.addNewline().addText(`生命加成：${+Number(eq.hpPercent).toFixed(2)}%`);
      }
      if (eq.speed && eq.speed > 0) {
        card.addNewline().addText(`速度：${eq.speed}`);
      }
      if (eq.critRate && eq.critRate > 0) {
        card.addNewline().addText(`暴击率：${+Number(eq.critRate).toFixed(2)}%`);
      }
      if (eq.critDamage && eq.critDamage > 0) {
        card.addNewline().addText(`暴击伤害：${+Number(eq.critDamage).toFixed(2)}%`);
      }
      md.addBlockquote(card);
      md.addNewline();
    }

    md.addNewline();

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md, footer: [{ label: '我的装备', command: '/我的装备' }] }));
  } catch (error) {
    logger.error('装备操作失败:', error);
    const md = Format.createMarkdown();

    md.addText('装备操作失败，请稍后重试');
    appendMiddlewareAdvice(md, equipmentRecoveryTips('equipment.equip', '装备操作失败，请稍后重试'));

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
  }
});
