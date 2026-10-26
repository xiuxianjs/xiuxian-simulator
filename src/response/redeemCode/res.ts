import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { isPrivateEvent } from '@src/utils/privateEvent';
import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { giftCodeRecoveryTips } from '@src/response/giftCodeRecovery';
import { useMessage } from '@src/utils/useMessage';
/**
 * 兑换码入口页面
 * 指令：/兑换码
 * 展示所有兑换码相关指令的快捷入口
 */
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotGiftHub } from '@src/api/bot/gift-code-robot-query';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;

  const [, next] = useEvent();

  try {
    const loaded = await runRobotBusiness(e, 'gift-codes.hub', {}, parseRobotGiftHub, next);

    if (loaded.handled) {
      return;
    }
  } catch {
    const md = Format.createMarkdown().addText('兑换码入口加载失败，请稍后再试');

    appendMiddlewareAdvice(md, giftCodeRecoveryTips('gift-codes.hub', '入口加载失败'));
    await message.send(FormatGui({ isPrivate: isPrivateEvent(e), bid, title: '兑换码', content: md }));

    return;
  }

  const md = Format.createMarkdown();

  md.addButton(markdownButtonLabel('领取邀请奖励'), { data: '/领取邀请奖励' });
  md.addText(' ——— 领取邀请好友累积奖励');
  md.addNewline();
  md.addButton(markdownButtonLabel('领取回归礼包'), { data: '/领取回归礼包' });
  md.addText(' ——— 使用回归兑换码领取奖励');
  md.addNewline();
  md.addButton(markdownButtonLabel('凡人修仙礼包码'), { data: '/凡人修仙礼包码' });
  md.addText(' ——— 老玩家签发回归兑换码');
  md.addNewline();
  md.addButton(markdownButtonLabel('领取测试礼包'), { data: '/领取测试礼包' });
  md.addText(' ——— 使用测试兑换码领取奖励');
  md.addNewline();
  md.addText('公测预约');
  md.addText(' ——— 公测预约登记与查看');

  void message.send(
    FormatGui({
      isPrivate: isPrivateEvent(e),
      bid,
      title: '兑换码',
      header: [{ label: '返回', command: '/我' }],
      content: md
    })
  );
});
