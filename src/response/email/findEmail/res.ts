import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { sendMiddlewareReply } from '@src/response/middlewareReply';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { emailRecoveryTips } from '@src/response/emailRecovery';
import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { emailDetailArguments, emailDetailDecoder } from '@src/api/bot/email-robot-query';
import type { EmailDisplayGood } from './view';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

/**
 * 附件类型标签映射
 */
const CATEGORY_LABELS: Record<string, string> = {
  money: '货币',
  currency: '货币',
  lootbox: '礼盒',
  equipment: '装备',
  skill_book: '功法',
  skill: '功法',
  soul_artifact: '本命物',
  item: '道具',
  prop: '道具',
  material: '材料',
  recipe: '丹方',
  title: '称号'
};

/**
 * 格式化附件列表展示文本
 */
function formatGoodsText(goodsList: EmailDisplayGood[]): string {
  if (!Array.isArray(goodsList) || goodsList.length === 0) {
    return '无';
  }

  return goodsList
    .map(item => {
      const name = item.name ?? '神秘物品';
      const num = item.quantity ?? 1;
      const label = CATEGORY_LABELS[item.category ?? ''] ?? '物品';

      return `【${label}】${name} ×${num}`;
    })
    .join('、');
}

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;

  const [, next] = useEvent();
  const sendFailure = adviceRenderer(reply => sendMiddlewareReply(e, { ...reply, title: '查看邮件' }));
  const args = emailDetailArguments(e.MessageText);
  const loaded = await runRobotBusiness(e, 'emails.detail', args, emailDetailDecoder(Number(args.idValue)), next, sendFailure).catch(async () => {
    await sendMiddlewareReply(e, {
      title: '查看邮件',
      heading: '',
      text: '邮件详情查询失败，请稍后再试',
      buttons: [],
      advice: emailRecoveryTips('emails.detail', '详情查询失败')
    });

    return { handled: true as const };
  });

  if (loaded.handled) {
    return;
  }
  const result = loaded.data;

  const map = {
    1: '未读',
    2: '已读',
    3: '已领取',
    4: '已删除'
  };

  const statusText = map[result.state] ?? '未知状态';
  const goodsText = formatGoodsText(result.goodsList);

  const md = Format.createMarkdown();

  md.addText(`状态：${statusText}`);
  md.addNewline();
  md.addText(`邮件ID：${result.emailId}`);
  md.addNewline();
  md.addText(`主标题：${result.name}`);
  md.addNewline();
  md.addText(`副标题：${result.subtitle || '无'}`);
  md.addNewline();
  md.addText(`内容：${result.data || '无'}`);
  md.addNewline();
  md.addText(`附件：${goodsText}`);
  md.addNewline();
  md.addNewline();

  if (result.canClaim) {
    md.addText(' ');
    md.addButton(markdownButtonLabel('领取'), { data: `/领取邮件 ${result.emailId}` });
  }

  if (result.canDelete) {
    md.addText(' ');
    md.addButton(markdownButtonLabel('删除'), { data: `/删除邮件 ${result.emailId}` });
  }

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '查看邮件',
      header: [{ label: '返回', command: '/我的邮件' }],
      content: md
    })
  );
});
