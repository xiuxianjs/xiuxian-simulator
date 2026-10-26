import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { titleRecoveryTips } from '@src/response/titleRecovery';
import { useMessage } from '@src/utils/useMessage';
/**
 * 佩戴称号指令处理器
 * 指令格式: /佩戴称号 <编号>
 */
import { validateBackendActivatedTitle } from '@src/api/bot/title-actions';
import { BackendAPIError } from '@src/api/bot/client';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';

const response = onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();

  const text = String(e.MessageText ?? '').trim();
  const match = text.match(/^(?:!|！|\/|#|＃)?佩戴称号\s+(\d+)$/);
  const titleId = match ? Number(match[1]) : null;

  const md = Format.createMarkdown();

  if (titleId === null || !Number.isSafeInteger(titleId) || titleId <= 0) {
    md.addText('请指定本人持有称号的记录ID，可从“我的称号”选择佩戴按钮');
    appendMiddlewareAdvice(md, titleRecoveryTips('titles.activate', '请指定称号编号'));
    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

    return;
  }
  try {
    const result = await runRobotBusiness(e, 'titles.activate', { titleId }, data => validateBackendActivatedTitle(data, titleId), next);

    if (result.handled) {
      return;
    }
    md.addText(`已佩戴称号「${result.data.title}」`);
  } catch (error) {
    logger.error('佩戴称号失败:', error);
    md.addText(error instanceof BackendAPIError && error.status === 404 ? '称号不存在或已过期' : '佩戴称号失败，请稍后重试');
    appendMiddlewareAdvice(
      md,
      titleRecoveryTips('titles.activate', error instanceof BackendAPIError && error.status === 404 ? '称号不存在或已过期' : '佩戴称号失败')
    );
  }

  md.addNewline();

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '',
      content: md,
      footer: [{ label: '我的称号', command: '/我的称号' }]
    })
  );
});

export default response;
