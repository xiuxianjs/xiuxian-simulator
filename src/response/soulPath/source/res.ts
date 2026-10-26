import { withBusinessRecovery } from '@src/response/businessRecovery';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { sendMiddlewareReply } from '@src/response/middlewareReply';
import { withoutSoulConfirmationActions } from '@src/response/soulPathRecovery';
import { useMessage } from '@src/utils/useMessage';
import { parseSoulPathState } from '@src/api/bot/soul-path';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { addSoulQuote, sendSoulGui } from '@src/response/soulPath/shared';
import { Format, onResponse, useEvent, logger } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const md = Format.createMarkdown();

  const [, parentNext] = useEvent();
  const sendFailure = adviceRenderer(reply => sendMiddlewareReply(
      e,
      withBusinessRecovery('soul-path.state', withoutSoulConfirmationActions({ ...reply, title: reply.title || '神魂材料来源' })),
      'footer'
    )
  );
  const panel = await runRobotBusiness(e, 'soul-path.state', {}, parseSoulPathState, parentNext, sendFailure).catch(async error => {
    logger.error('[元婴神魂] 面板加载失败:', error);
    await sendFailure({
      title: '',
      heading: '',
      text: '神魂查询结果未获完整确认，请核对当前状态，稍后重新查看；不据此判断道途或材料已消失。',
      buttons: [],
      advice: []
    });

    return { handled: true as const };
  });

  if (panel.handled) {
    return;
  }
  md.addBold('持有材料');
  md.addNewline();
  md.addText(panel.data.panel.materials.map(material => `${material.name}×${material.quantity}`).join(' · '));
  md.addNewline();
  md.addNewline();
  md.addBold('获取途径');
  md.addNewline();
  for (const line of panel.data.panel.materialSourceLines) {
    addSoulQuote(md, line);
  }
  md.addBold('温养规则');
  md.addNewline();
  for (const line of panel.data.panel.nurtureRuleLines.slice(0, -1)) {
    addSoulQuote(md, line);
  }
  md.addNewline();
  addSoulQuote(md, panel.data.panel.nurtureRuleLines.at(-1) ?? '');
  await message.send(
    sendSoulGui(e, '神魂材料来源', md, [
      { label: '元婴神魂', command: '/元婴神魂' },
      { label: '元婴道途', command: '/元婴道途' },
      { label: '万宝楼', command: '/商店 万宝楼' },
      { label: '神奇商店', command: '/商店 神奇' },
      { label: '材料背包', command: '/储物袋 材料 其它' }
    ])
  );
});
