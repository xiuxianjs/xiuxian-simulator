import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { appendTreasureEffects } from '@src/response/treasureEffects';
import { loadFinalBusiness } from '@src/response/finalBusiness';
import { useEvent } from 'alemonjs';
import { parseMeditationEnd } from '@src/api/bot/meditation';
import { useMessage } from '@src/utils/useMessage';
/**
 * 闭关结束指令处理器
 * 指令：/出关
 *
 * 结束闭关，按已闭关时间结算真气与修为
 */

import App from '@src/response-apps/meditation/end/app';
import { createBackendRequestContext } from '@src/api';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse } from 'alemonjs';
import { sendOnboardingFollowup } from '@src/response/onboarding/followup';

export default onResponse(selects, async e => {
  const [, next] = useEvent();
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;

  const sendText = async (text: string) => {
    const md = Format.createMarkdown();

    md.addText(text);

    await message.send(FormatGui({ isPrivate, bid, title: '闭关', content: md }));
  };

  const business = await loadFinalBusiness(e, next, 'meditation.end', {}, parseMeditationEnd);

  if (business.handled) {
    return;
  }
  const uid = e.uid as number;
  const result = await App({ load: business.load, uid, bid, messageText: e.MessageText, request: createBackendRequestContext(e) });

  if (result.code === 'LOAD_FAILED') {
    await sendText(result.data.message);

    return;
  }

  const { data } = result;

  if (!data.success) {
    const repeatMsg = data.message;

    await sendText(`❌ ${repeatMsg}`);

    return;
  }

  const quote = Format.createMarkdown();

  quote.addText(`已修炼 ${data.elapsedText}`).addNewline();
  quote.addText(`本次获得修为：${data.normalExperienceGained ?? data.creditedExperience ?? data.expGained ?? 0}`).addNewline();
  quote.addText(`本次获得真气：${data.qiGained ?? 0}`);
  if (data.boost) {
    quote.addNewline().addText(`本次加速费用：${data.boost.consumedStone}灵石`);
    if (data.boost.refundedStone > 0) {
      quote.addNewline().addText(`历史预付退回：${data.boost.refundedStone}灵石`);
    }
  }
  if (data.bonusLines?.length) {
    quote.addNewline().addNewline().addText('本轮加成：');
    for (const line of data.bonusLines) {
      quote.addNewline().addText(`· ${line}`);
    }
  }
  if (data.rewardNotice) {
    quote.addNewline().addText(data.rewardNotice);
  }
  const md = Format.createMarkdown().addBlockquote(quote);

  appendTreasureEffects(md, data.treasureEffects);
  if (await sendOnboardingFollowup(e, business, '闭关结束', md)) {
    return;
  }
  md.addNewline().addButton(markdownButtonLabel('继续闭关'), { data: '/闭关' });

  await message.send(FormatGui({ isPrivate, bid, title: '闭关结束', content: md }));
});
