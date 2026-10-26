import { appendMiddlewareAdvice, sendMiddlewareReply } from '@src/response/middlewareReply';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { referralRecoveryTips } from '@src/response/referralRecovery';
import { Format, onResponse, useEvent } from 'alemonjs';
import { referralInviteesArguments, referralInviteesDecoder } from '@src/api/bot/referral-robot-query';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { displayCurrencyText } from '@src/constants/currency';
import { selects } from '@src/response/config';
import { useMessage } from '@src/utils/useMessage';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { getCommandErrorMessage } from '@src/utils/commandError';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e.UserId;
  const isPrivate = e.isPrivate ?? false;
  const md = Format.createMarkdown();
  const args = referralInviteesArguments(e.MessageText ?? '');
  const page = args.page ?? 1;
  const [, next] = useEvent();
  const footer: { label: string; command: string }[] = [];

  try {
    const loaded = await runRobotBusiness(
      e,
      'referral.invitees',
      args,
      referralInviteesDecoder(args.page),
      next,
      adviceRenderer(reply => sendMiddlewareReply(e, { ...reply, title: '我的邀请' }))
    );

    if (loaded.handled) {
      return;
    }
    const data = loaded.data;
    const pages = Math.max(1, Math.ceil(data.total / data.pageSize));

    md.addText(`我邀请的道友：${data.total} 人 · 第 ${page}/${pages} 页`);
    md.addNewline();
    if (!data.items.length) {
      md.addText(data.total === 0 ? '还没有道友绑定你的邀请码，分享给新来的道友吧。' : '这一页没有道友，请返回上一页。');
      appendMiddlewareAdvice(md, referralRecoveryTips('referral.invitees', '本页暂无记录'));
    }
    for (const item of data.items) {
      const lines = [
        `${item.name} · UID ${item.userId}`,
        `当前境界：${item.realmName}`,
        `成长奖励：待领取 ${item.pendingRewards} 条 · 已领取 ${item.claimedRewards} 条`
      ];

      if (item.nextRealmReward) {
        lines.push(`下一境界目标：${item.nextRealmReward.goal}`, `达成奖励：${item.nextRealmReward.rewards.map(displayCurrencyText).join('、')}`);
      }
      if (item.nextVipReward) {
        lines.push(`下一 VIP 目标：${item.nextVipReward.goal}`, `达成奖励：${item.nextVipReward.rewards.map(displayCurrencyText).join('、')}`);
      }
      if (!item.nextRealmReward && !item.nextVipReward) {
        lines.push('暂无后续成长奖励档位');
      }
      md.addBlockquote(
        createQuoteMarkdown(lines, [
          { label: '查看信息', command: `/查看信息 ${item.userId}` },
          { label: '邀请入队', command: `/邀请入队 ${item.userId}` }
        ])
      );
    }
    if (data.items.some(item => item.pendingRewards > 0)) {
      footer.push({ label: '领取奖励', command: '/领取邀请奖励' });
    }
    if (page > 1) {
      footer.push({ label: '上一页', command: `/我的邀请 ${page - 1}` });
    }
    if (page < pages) {
      footer.push({ label: '下一页', command: `/我的邀请 ${page + 1}` });
    }
  } catch (error) {
    md.addText(getCommandErrorMessage(error));
    appendMiddlewareAdvice(md, referralRecoveryTips('referral.invitees', '查询失败'));
  }
  void message.send(FormatGui({ isPrivate, bid, title: '我的邀请', header: [{ label: '返回', command: '/邀请码' }], content: md, footer }));
});
