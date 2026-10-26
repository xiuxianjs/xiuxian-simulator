import { withBusinessRecovery } from '@src/response/businessRecovery';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { sendMiddlewareReply } from '@src/response/middlewareReply';
import { useMessage } from '@src/utils/useMessage';
import { EMPTY_STRING, FIRST_ARG_INDEX, SECOND_ARG_INDEX } from '@src/constants';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotSkillBookLearn } from '@src/api/bot/skill-book-learn';
import { skillBookLearnConfirmation } from '@src/api/bot/skill-book-learn-presentation';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const bid = e.UserId;
  const isPrivate = e.isPrivate ?? e.name.startsWith('private.');
  const text = (e.MessageText || EMPTY_STRING).replace(/^(!|！|\/|#|＃)?学习功法\s*/, EMPTY_STRING).trim();
  const args = text ? text.split(/\s+/) : [];
  const failure = adviceRenderer(reply => sendMiddlewareReply(e, withBusinessRecovery('skill-books.learn', reply), 'footer'));

  if (
    args.length > 2 ||
    (args[0] !== undefined && (!/^\d+$/.test(args[0]) || !Number.isSafeInteger(Number(args[0])) || Number(args[0]) < 1)) ||
    (args[1] !== undefined && !['确认', '是', 'yes', 'Yes', 'YES'].includes(args[1]))
  ) {
    await failure({ title: '', heading: '', text: '参数错误：请核对功法实例编号及完整参数，不附多余文字。', buttons: [], advice: [] });

    return;
  }
  let learnResult: ReturnType<typeof parseRobotSkillBookLearn>;

  try {
    const result = await runRobotBusiness(
      e,
      'skill-books.learn',
      {
        bookId: args[FIRST_ARG_INDEX] ?? null,
        confirm: args[SECOND_ARG_INDEX] ?? null
      },
      parseRobotSkillBookLearn,
      next,
      failure
    );

    if (result.handled) {
      return;
    }
    learnResult = result.data;
  } catch (error) {
    logger.error('学习功法结果未获完整确认:', error);
    await failure({ title: '', heading: '', text: '功法学习结果未获完整确认，请先核对背包、当前功法与原回执。', buttons: [], advice: [] });

    return;
  }
  if (learnResult.outcome === 'confirmation_required') {
    const content = Format.createMarkdown();

    content.addText(`⚠️ ${skillBookLearnConfirmation(learnResult)}`);
    content.addNewline().addText('尚未替换 · 确认后按下列内容替换与返还');
    content.addNewline();
    await message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '',
        content,
        footer: [
          { label: '确认替换', command: `/学习功法 ${learnResult.skillBook!.id} 确认` },
          { label: '返回我的功法', command: '/我的功法' }
        ]
      })
    );

    return;
  }
  // 构建成功消息
  let successMessage = `✅ 学习成功

【${learnResult.skillBook?.name}】
类型: ${learnResult.skillBook?.skillType}`;

  // 如果是替换，添加替换提示和返还残页信息
  if (learnResult.oldSkillBook && learnResult.refundInfo) {
    successMessage += '\n\n已替换旧功法';

    // 返还详情
    const refundInfo = learnResult.refundInfo;

    successMessage += `\n熟练度继承: ${refundInfo.transferredProficiency}%`;

    successMessage += `\n\n📦 折算经验: ${refundInfo.totalExp}`;
    successMessage += `\n├─ 基础返还: ${refundInfo.baseExp}`;

    if (refundInfo.upgradeCount > 0) {
      successMessage += `\n└─ 升级经验: ${refundInfo.upgradeExp} (${refundInfo.upgradeCount}次升级)`;
    }

    // 返还的功法残页
    if (refundInfo.items && refundInfo.items.length > 0) {
      successMessage += '\n\n获得功法残页:';
      refundInfo.items.forEach((item: any) => {
        successMessage += `\n  • ${item.name} x${item.quantity} (${item.expValue}经验/个)`;
      });
    }
  }

  const md = Format.createMarkdown();

  md.addText(successMessage);

  md.addNewline();

  void message.send(FormatGui({ isPrivate, bid, title: '', content: md, footer: [{ label: '我的功法', command: '/我的功法' }] }));
});
