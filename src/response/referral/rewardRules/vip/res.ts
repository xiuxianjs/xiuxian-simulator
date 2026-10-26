import { appendMiddlewareAdvice, sendMiddlewareReply } from '@src/response/middlewareReply';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { referralRecoveryTips } from '@src/response/referralRecovery';
import { useMessage } from '@src/utils/useMessage';
/**
 * VIP等级奖励指令
 */
import { runRobotBusiness } from '@src/response/robotBusiness';
import { referralRuleDecoder } from '@src/api/bot/referral-robot-query';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e.UserId;
  const isPrivate = e.isPrivate ?? false;

  const [, next] = useEvent();
  const renderFailure = async () => {
    const content = Format.createMarkdown();

    content.addText('查询失败，请稍后再试');
    appendMiddlewareAdvice(content, referralRecoveryTips('referral.rules-vip', '查询失败，请稍后再试'));
    await message.send(FormatGui({ isPrivate, bid, title: 'VIP奖励', content }));
  };
  const decode = referralRuleDecoder('vip_level');
  let result: ReturnType<typeof decode>;

  try {
    const loaded = await runRobotBusiness(
      e,
      'referral.rules-vip',
      {},
      decode,
      next,
      adviceRenderer(reply => sendMiddlewareReply(e, { ...reply, title: 'VIP奖励' }))
    );

    if (loaded.handled) {
      return;
    }
    result = loaded.data;
  } catch {
    await renderFailure();

    return;
  }

  const md = Format.createMarkdown();

  md.addText(`已邀请人数：${result.inviteCount}人`);
  md.addNewline();

  if (result.pendingCount > 0) {
    md.addText(`VIP奖励有${result.pendingCount}条待领取`);
    md.addNewline();
  }

  md.addNewline();

  if (result.groups.length === 0) {
    md.addText('暂无VIP等级奖励配置。');
    appendMiddlewareAdvice(md, referralRecoveryTips('referral.rules-vip', '暂无奖励配置'));
    md.addNewline();
  } else {
    for (const group of result.groups) {
      md.addText(`${group.icon}-${group.threshold}-${group.tag}`);
      md.addNewline();

      for (const reward of group.rewards) {
        md.addText(`   ${reward}`);
        md.addNewline();
      }
    }
  }

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: 'VIP奖励',
      header: [{ label: '返回', command: '/邀请码' }],
      content: md,
      footer: result.pendingCount > 0 ? [{ label: '领取奖励', command: '/领取邀请奖励' }] : [{ label: '我的邀请', command: '/我的邀请' }]
    })
  );
});
