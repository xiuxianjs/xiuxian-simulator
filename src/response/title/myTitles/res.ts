import { formatGameDate } from '@src/utils/gameTime';
import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { titleRecoveryTips } from '@src/response/titleRecovery';
import { useMessage } from '@src/utils/useMessage';
/**
 * 我的称号指令处理器
 * 指令格式: /我的称号
 * 展示玩家拥有的所有称号，通过蓝色按钮佩戴/卸下
 */
import { validateBackendTitleOverview, type BackendTitleOverview } from '@src/api/bot/title-overview-query';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';

const response = onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();

  const md = Format.createMarkdown();
  let data: BackendTitleOverview;

  try {
    const result = await runRobotBusiness(e, 'titles.overview', {}, validateBackendTitleOverview, next);

    if (result.handled) {
      return;
    }
    data = result.data;
  } catch (error) {
    logger.error('查询我的称号失败:', error);
    md.addText('查询称号失败，请稍后重试');
    appendMiddlewareAdvice(md, titleRecoveryTips('titles.overview', '查询称号失败，请稍后重试'));
    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

    return;
  }
  const { titles, moodText } = data;

  if (titles.length === 0) {
    md.addBlockquote(Format.createMarkdown().addText(moodText));
    md.addText('当前没有可用的有效称号');
    appendMiddlewareAdvice(md, titleRecoveryTips('titles.overview', '当前没有可用的有效称号'));

    void message.send(FormatGui({ isPrivate, bid, title: '我的称号', content: md }));

    return;
  }

  md.addBlockquote(Format.createMarkdown().addText(moodText));

  titles.forEach((row, index) => {
    const num = index + 1;

    md.addBlockquote(
      createQuoteMarkdown(
        [
          `【${num}】${row.title}${row.isActive ? ' [佩戴中]' : ''}`,
          ...(row.description ? [row.description] : []),
          ...(row.bonusSummary ? [row.bonusSummary] : []),
          ...(row.expireDate ? [`到期：${formatGameDate(row.expireDate)}`] : [])
        ],
        [{ label: row.actionLabel, command: row.actionCommand }]
      )
    );
    md.addNewline();
  });

  void message.send(FormatGui({ isPrivate, bid, title: '我的称号', content: md }));
});

export default response;
