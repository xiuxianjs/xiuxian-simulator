import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { titleRecoveryTips } from '@src/response/titleRecovery';
import { useMessage } from '@src/utils/useMessage';
/**
 * 卸下称号指令处理器
 * 指令格式: /卸下称号
 */
import { validateBackendDeactivatedTitle } from '@src/api/bot/title-actions';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';

const response = onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();

  const md = Format.createMarkdown();

  try {
    const result = await runRobotBusiness(e, 'titles.deactivate', {}, validateBackendDeactivatedTitle, next);

    if (result.handled) {
      return;
    }
    md.addText(result.data.removed ? '已卸下称号' : '当前没有佩戴称号');
    if (!result.data.removed) {
      appendMiddlewareAdvice(md, titleRecoveryTips('titles.deactivate', '当前没有佩戴称号'));
    }
  } catch (error) {
    logger.error('卸下称号失败:', error);
    md.addText('卸下称号失败，请稍后重试');
    appendMiddlewareAdvice(md, titleRecoveryTips('titles.deactivate', '卸下称号失败'));
    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

    return;
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
