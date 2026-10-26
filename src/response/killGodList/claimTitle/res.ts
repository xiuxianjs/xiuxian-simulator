import { appendMiddlewareAdvice, sendMiddlewareReply } from '@src/response/middlewareReply';
import { titleRecoveryTips } from '@src/response/titleRecovery';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { useMessage } from '@src/utils/useMessage';
/**
 * 领取杀神称号
 * 指令：/领取杀神称号
 *
 * 条件：杀神榜上榜人数 ≥ 10，且自身是榜一
 */

import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotKillGodTitleClaim } from '@src/api/bot/shaqi-queries';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;

  const [, next] = useEvent();
  const sendFailure = async (text: string) => {
    const md = Format.createMarkdown().addText(text);

    appendMiddlewareAdvice(md, titleRecoveryTips('pvp.kill-god-title-claim', text));
    await message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '领取杀神称号',
        content: md,
        footer: [
          { label: '杀神榜', command: '/杀神榜' },
          { label: '我的称号', command: '/我的称号' }
        ]
      })
    );
  };
  let result;

  try {
    result = await runRobotBusiness(
      e,
      'pvp.kill-god-title-claim',
      {},
      parseRobotKillGodTitleClaim,
      next,
      adviceRenderer(async reply => {
        await sendMiddlewareReply(e, {
          ...reply,
          title: '领取杀神称号',
          buttons: [{ label: '杀神榜', command: '/杀神榜' }, { label: '我的称号', command: '/我的称号' }, ...reply.buttons]
        });
      })
    );
  } catch {
    await sendFailure('领取失败，请稍后再试。');

    return;
  }
  if (result.handled) {
    return;
  }
  const md = Format.createMarkdown();

  md.addText('已获得称号「杀神」');

  const footer = [
    { label: '杀神榜', command: '/杀神榜' },
    { label: '我的称号', command: '/我的称号' }
  ];

  void message.send(FormatGui({ isPrivate, bid, title: '领取杀神称号', content: md, footer }));
});
