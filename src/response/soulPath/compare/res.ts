import { withBusinessRecovery } from '@src/response/businessRecovery';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { sendMiddlewareReply } from '@src/response/middlewareReply';
import { withoutSoulConfirmationActions } from '@src/response/soulPathRecovery';
import { useMessage } from '@src/utils/useMessage';
import { parseSoulPathComparison } from '@src/api/bot/battle-attributes';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { addSoulEffectChanges, addSoulQuote, sendSoulGui } from '@src/response/soulPath/shared';
import { Format, logger, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const md = Format.createMarkdown();

  const [, parentNext] = useEvent();
  const sendFailure = adviceRenderer(reply => sendMiddlewareReply(e, withBusinessRecovery('soul-path.compare', withoutSoulConfirmationActions({ ...reply, title: reply.title || '道途印证' })), 'footer')
  );

  try {
    const response = await runRobotBusiness(e, 'soul-path.compare', {}, parseSoulPathComparison, parentNext, sendFailure);

    if (response.handled) {
      return;
    }
    const { changes, emptyMessage, quote } = response.data;

    md.addBold('道途加成');
    md.addNewline();
    addSoulEffectChanges(md, changes, emptyMessage);
    addSoulQuote(md, quote);
  } catch (error) {
    logger.error('[道途印证] 属性计算失败', error);
    await sendFailure({ title: '', heading: '', text: '属性暂时无法计算，请稍后重试。', buttons: [], advice: [] });

    return;
  }
  await message.send(
    sendSoulGui(e, '道途印证', md, [
      { label: '返回道途', command: '/元婴道途' },
      { label: '本命物', command: '/我的本命物' }
    ])
  );
});
