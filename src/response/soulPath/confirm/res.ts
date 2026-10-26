import { withBusinessRecovery } from '@src/response/businessRecovery';
import { withoutSoulConfirmationActions } from '@src/response/soulPathRecovery';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { sendMiddlewareReply } from '@src/response/middlewareReply';
import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseSoulConfirm } from '@src/api/bot/soul-confirm-business';
import { selects } from '@src/response/config';
import { addSoulQuote, getCommandArgument, isSoulConfirmationToken, sendSoulGui } from '@src/response/soulPath/shared';
import { Format, onResponse, useEvent, logger } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const md = Format.createMarkdown();
  const token = getCommandArgument(e.MessageText, '确认神魂');

  const [, parentNext] = useEvent();
  const sendFailure = adviceRenderer(reply => sendMiddlewareReply(
      e,
      withBusinessRecovery('soul-path.confirm', withoutSoulConfirmationActions({ ...reply, title: reply.title || '神魂操作结果' })),
      'footer'
    )
  );
  const choose = token.startsWith('choose:');

  if (!isSoulConfirmationToken(choose ? token.slice('choose:'.length) : token)) {
    await sendFailure({ title: '', heading: '', text: '确认凭证格式无效，请返回本人当前面板重新预览，不附其他参数或借用他人凭证。', buttons: [], advice: [] });

    return;
  }
  const response = await runRobotBusiness(
    e,
    'soul-path.confirm',
    { token },
    value => {
      const data = parseSoulConfirm(value);

      const path = data.mode === 'choose' ? data.result : data.result.path;

      if ((data.mode === 'choose') !== choose || (path && (!path.message.trim() || !path.nodeName.trim()))) {
        throw new Error('神魂确认响应不完整');
      }

      return data;
    },
    parentNext,
    sendFailure
  ).catch(async error => {
    logger.error('[神魂确认] 失败:', error);
    await sendFailure({ title: '', heading: '', text: '神魂确认结果未获完整确认，请先核对当前状态与原回执，不重复提交旧凭证。', buttons: [], advice: [] });

    return { handled: true as const };
  });

  if (response.handled) {
    return;
  }
  if (response.data.mode === 'choose') {
    const result = { data: response.data.result };

    const [headline, ...details] = result.data.message.split('。').filter(Boolean);

    md.addBold(headline);
    if (details.length) {
      md.addNewline();
      addSoulQuote(md, details.join('。'));
    }
    md.addNewline();
    addSoulQuote(md, `已领悟【${result.data.nodeName}】。`);
  } else {
    const result = { data: response.data.result };

    if (result.data.path) {
      const [headline, ...details] = result.data.path.message.split('。').filter(Boolean);

      md.addBold(headline);
      if (details.length) {
        md.addNewline();
        addSoulQuote(md, details.join('。'));
      }
      md.addNewline();
      addSoulQuote(md, `已领悟【${result.data.path.nodeName}】。`);
    } else if (result.data.nurture) {
      const data = result.data.nurture;

      md.addBold(`重选 · ${data.directionName} · ${data.tierName}`);
      md.addNewline();
      md.addText(
        `稳定 ${data.stabilityBefore} → ${data.stabilityAfter} · 感悟 ${data.insightGained >= 0 ? '+' : ''}${data.insightGained} · 熟练 ${data.proficiencyGained >= 0 ? '+' : ''}${data.proficiencyGained}`
      );
      md.addNewline();

      md.addText(`新额外材料：${data.extraItems.length ? data.extraItems.map(item => `${item.name}×${item.quantity}`).join('、') : '无'}`);
    }
  }
  md.addNewline();

  await message.send(
    sendSoulGui(e, '神魂操作结果', md, [
      { label: '道途印证', command: '/道途印证' },
      { label: '道途', command: '/元婴道途' },
      { label: '温养', command: '/元婴神魂' }
    ])
  );
});
