import { useMessage } from '@src/utils/useMessage';
import { appendTreasureEffects } from '@src/response/treasureEffects';
/**
 * 双修指令
 */
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseBackendCompanionDualCultivation } from '@src/api/bot/companion-relationship-actions';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();
  const response = await runRobotBusiness(e, 'companion.dual-cultivation', {}, parseBackendCompanionDualCultivation, next, async reply => {
    await message.send(
      FormatGui({
        isPrivate,
        bid,
        title: reply.title,
        content: Format.createMarkdown().addText(reply.text),
        footer: reply.buttons.length ? reply.buttons : undefined
      })
    );
  });

  if (response.handled) {
    return;
  }
  const result = response.data;

  const lines = [
    '灵息交融，双修已毕。',
    result.normalExperienceGained !== undefined ? `你的修为 ${result.normalExperienceGained}`
      : result.creditedExperience === undefined ? '你的修为已结算' : `你的修为 ${result.creditedExperience}`,
    result.partnerCreditedExperience === undefined ? '道侣修为已结算' : `道侣修为 ${result.partnerCreditedExperience}`,
    `同心值 +${result.tongxinGained}`
  ];

  const md = Format.createMarkdown();

  md.addText(lines.join('\n'));
  appendTreasureEffects(md, result.treasureEffects);

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '',
      content: md,
      footer: [
        { label: '道侣任务', command: '/道侣任务' },
        { label: '我的道侣', command: '/我的道侣' }
      ]
    })
  );
});
