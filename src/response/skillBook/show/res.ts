import { withBusinessRecovery } from '@src/response/businessRecovery';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { sendMiddlewareReply } from '@src/response/middlewareReply';
import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseRobotSkillVisibility } from '@src/api/bot/skill-visibility';
import { EMPTY_STRING, FIRST_ARG_INDEX } from '@src/constants';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';

const response = onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? e.name.startsWith('private.');
  const [, next] = useEvent();

  const messageText = (e.MessageText || EMPTY_STRING).replace(/^(!|！|\/|#|＃)?显示功法\s*/, EMPTY_STRING).trim();
  const args = messageText ? messageText.split(/\s+/) : [];
  const failure = adviceRenderer(reply => sendMiddlewareReply(e, withBusinessRecovery('skill-books.show', reply), 'footer'));

  if (args.length > 1 || (args[0] !== undefined && (!/^\d+$/.test(args[0]) || !Number.isSafeInteger(Number(args[0])) || Number(args[0]) < 1))) {
    await failure({ title: '', heading: '', text: '参数错误：请使用本人已学功法的完整正整数实例编号，不附多余参数。', buttons: [], advice: [] });

    return;
  }
  const skillBookId = Number(args[FIRST_ARG_INDEX] ?? EMPTY_STRING);
  const md = Format.createMarkdown();

  try {
    const result = await runRobotBusiness(
      e,
      'skill-books.show',
      { bookId: args[FIRST_ARG_INDEX] ?? EMPTY_STRING },
      data => parseRobotSkillVisibility(data, skillBookId, false),
      next,
      failure
    );

    if (result.handled) {
      return;
    }
    md.addText(`✅ ${result.data.message}`);
  } catch (error) {
    logger.error('显示功法失败:', error);
    await failure({ title: '', heading: '', text: '功法显示结果未获完整确认，请先核对已学和隐藏列表。', buttons: [], advice: [] });

    return;
  }

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '',
      content: md,
      footer: [
        { label: '我的隐藏功法', command: '/我的隐藏功法' },
        { label: '我的功法', command: '/我的功法' }
      ]
    })
  );
});

export default response;
