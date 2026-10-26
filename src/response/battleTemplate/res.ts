import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { useMessage } from '@src/utils/useMessage';
import { parseBattleTemplateSave } from '@src/api/bot/battle-template-save';
import { parseBattleTemplateApply } from '@src/api/bot/battle-template-apply';
import { parseBattleTemplateDelete } from '@src/api/bot/battle-template-delete';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseBattleTemplates } from '@src/api/bot/battle-templates-query';
import { EMPTY_STRING } from '@src/constants/common';
import type { BattleTemplatesQueryData } from '@src/api/schemas/battle-templates-query';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';

const SLOT_MAX = 5;

const formatSkillSummary = (skillNames: Record<string, string | undefined>) => {
  const parts = ['战技', '被动技', '神通'].map(typeName => `${typeName}:${skillNames[typeName] ?? '空'}`).join('  ');

  return parts;
};

const formatEquipmentSummary = (equipmentNames: string[]) => {
  return equipmentNames.length > 0 ? equipmentNames.join('、') : '未装备';
};

const buildListMarkdown = (data: BattleTemplatesQueryData) => {
  const md = Format.createMarkdown();

  md.addBold('当前配置');
  md.addNewline();
  md.addText(`装备：${formatEquipmentSummary(data.current.equipmentNames)}`);
  md.addNewline();
  md.addText(formatSkillSummary(data.current.skillNames));
  md.addNewline();
  md.addNewline();
  md.addBold('模板槽位');
  md.addNewline();

  for (let slot = 1; slot <= SLOT_MAX; slot += 1) {
    const item = data.templates.find(template => template.slot === slot);

    if (!item) {
      md.addText(`【${slot}】空`);
      md.addButton(markdownButtonLabel('保存'), { data: `/保存战斗模板 ${slot}` });
      md.addNewline();
      continue;
    }

    const lines = [`【${slot}】${item.name || `战斗模板${slot}`}`, `装备：${formatEquipmentSummary(item.equipmentNames)}`, formatSkillSummary(item.skillNames)];

    if (item.missingEquipmentCount > 0 || item.missingSkillCount > 0) {
      lines.push(`模板异常：缺失装备${item.missingEquipmentCount}件，缺失功法${item.missingSkillCount}本，请重新保存`);
    }
    const quoteMd = Format.createMarkdown();

    lines.forEach((line, index) => {
      if (index > 0) {
        quoteMd.addNewline();
      }
      quoteMd.addText(line);
    });
    quoteMd.addText(' ');
    quoteMd.addButton(markdownButtonLabel(`应用${slot}`), { data: `/应用战斗模板 ${slot}` });
    quoteMd.addText(' ');
    quoteMd.addButton(markdownButtonLabel(`覆盖${slot}`), { data: `/保存战斗模板 ${slot}` });
    quoteMd.addText(' ');
    quoteMd.addButton(markdownButtonLabel(`删除${slot}`), { data: `/删除战斗模板 ${slot}` });
    md.addBlockquote(quoteMd);
    md.addNewline();
  }

  return md;
};

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const text = (e.MessageText || EMPTY_STRING).trim();
  const isList = /^(!|！|\/|#|＃)?战斗模板$/.test(text);
  const deleteMatch = text.match(/^(!|！|\/|#|＃)?删除战斗模板\s+(\d+)$/);
  const saveMatch = text.match(/^(!|！|\/|#|＃)?保存战斗模板\s+(\d+)(?:\s+(.+))?$/);
  const applyMatch = text.match(/^(!|！|\/|#|＃)?应用战斗模板\s+(\d+)$/);

  if (!isList && !deleteMatch && !saveMatch && !applyMatch) {
    return;
  }
  const [, parentNext] = useEvent();
  const feedback = async (reply: import('@src/api/bot/middleware-entry').RobotMiddlewareReply) => {
    const md = Format.createMarkdown().addText(reply.text);

    await message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '战斗模板',
        content: md,
        ...(reply.buttons.length ? { footer: reply.buttons.map(button => ({ label: button.label, command: button.command })) } : {})
      })
    );
  };

  try {
    if (isList) {
      const response = await runRobotBusiness(e, 'battle-templates.list', {}, parseBattleTemplates, parentNext, feedback);

      if (response.handled) {
        return;
      }
      const md = buildListMarkdown(response.data);

      void message.send(FormatGui({ isPrivate, bid, title: '战斗模板', content: md }));

      return;
    }

    if (saveMatch) {
      const slot = Number(saveMatch[2]);
      const name = saveMatch[3]?.trim();
      const response = await runRobotBusiness(
        e,
        'battle-templates.save',
        { slotText: saveMatch[2], name: name ?? null },
        data => parseBattleTemplateSave(data, slot),
        parentNext,
        feedback
      );

      if (response.handled) {
        return;
      }
      const result = response.data;
      const md = Format.createMarkdown();

      md.addText(`✅ ${result.created ? '已保存' : '已覆盖'}模板【${result.slot}】${result.name}`);
      md.addNewline();
      md.addText(`装备：${formatEquipmentSummary(result.equipmentNames)}`);
      md.addNewline();
      md.addText(formatSkillSummary(result.skillNames));
      md.addNewline();
      md.addNewline();
      md.addButton(markdownButtonLabel('查看模板'), { data: '/战斗模板' });

      void message.send(FormatGui({ isPrivate, bid, title: '战斗模板', content: md }));

      return;
    }

    if (applyMatch) {
      const slot = Number(applyMatch[2]);
      const response = await runRobotBusiness(
        e,
        'battle-templates.apply',
        { slotText: applyMatch[2], name: null },
        data => parseBattleTemplateApply(data, slot),
        parentNext,
        feedback
      );

      if (response.handled) {
        return;
      }
      const result = response.data;
      const md = Format.createMarkdown();

      md.addText(`✅ 已应用模板【${result.slot}】${result.name}`);
      md.addNewline();
      md.addText(`装备：${formatEquipmentSummary(result.equipmentNames)}`);
      md.addNewline();
      md.addText(formatSkillSummary(result.skillNames));
      md.addNewline();
      md.addNewline();
      md.addButton(markdownButtonLabel('查看模板'), { data: '/战斗模板' });

      void message.send(FormatGui({ isPrivate, bid, title: '战斗模板', content: md }));

      return;
    }

    if (deleteMatch) {
      const slot = Number(deleteMatch[2]);
      const response = await runRobotBusiness(
        e,
        'battle-templates.delete',
        { slotText: deleteMatch[2], name: null },
        parseBattleTemplateDelete,
        parentNext,
        feedback
      );

      if (response.handled) {
        return;
      }
      const { deleted } = response.data;
      const md = Format.createMarkdown();

      md.addText(deleted ? `✅ 已删除模板槽位【${slot}】` : `❌ 模板槽位【${slot}】为空`);
      md.addNewline();
      md.addNewline();
      md.addButton(markdownButtonLabel('查看模板'), { data: '/战斗模板' });

      void message.send(FormatGui({ isPrivate, bid, title: '战斗模板', content: md }));
    }
  } catch (error) {
    logger.error('战斗模板处理失败:', error);
    const md = Format.createMarkdown();

    md.addText(error instanceof Error ? error.message : '战斗模板操作失败，请稍后重试');

    void message.send(FormatGui({ isPrivate, bid, title: '战斗模板', content: md }));
  }
});
