import { withBusinessRecovery } from '@src/response/businessRecovery';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { sendMiddlewareReply } from '@src/response/middlewareReply';
import { useMessage } from '@src/utils/useMessage';
import { parseSoulSupplyDirection } from '@src/api/bot/soul-path';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { getCommandArgument, sendSoulGui } from '@src/response/soulPath/shared';
import { Format, onResponse, useEvent, logger } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, parentNext] = useEvent();
  const sendResult = async (text: string) => {
    const md = Format.createMarkdown().addText(text);

    await message.send(sendSoulGui(e, '神魂补给', md, [{ label: '神魂面板', command: '/元婴神魂' }]));
  };

  if (/^[!！/#＃]?神魂补给$/.test((e.MessageText ?? '').trim())) {
    await message.send(
      sendSoulGui(e, '神魂补给', Format.createMarkdown().addText('选择后续补给方向'), [
        ...['自动', '定魂', '养魄', '悟道', '出窍'].map(label => ({ label, command: `/神魂补给 ${label}` })),
        { label: '神魂面板', command: '/元婴神魂' }
      ])
    );

    return;
  }
  const sendFailure = adviceRenderer(reply => sendMiddlewareReply(e, withBusinessRecovery('soul-path.supply', { ...reply, title: reply.title || '神魂补给' }), 'footer')
  );
  const result = await runRobotBusiness(
    e,
    'soul-path.supply',
    { input: getCommandArgument(e.MessageText, '神魂补给') },
    value => {
      const data = parseSoulSupplyDirection(value);

      if (!data.message.trim()) {
        throw new Error('神魂补给结果不完整');
      }

      return data;
    },
    parentNext,
    sendFailure
  ).catch(async error => {
    logger.error('[神魂补给] 设置失败:', error);
    await sendFailure({ title: '', heading: '', text: '神魂补给设置结果未获完整确认，请先核对面板与原回执。', buttons: [], advice: [] });

    return { handled: true as const };
  });

  if (result.handled) {
    return;
  }
  await sendResult(result.data.message);
});
