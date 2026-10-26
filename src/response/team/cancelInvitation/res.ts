import { useMessage } from '@src/utils/useMessage';
/**
 * 取消队伍邀请
 * 指令：取消队伍邀请 [邀请ID]
 */

import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent, logger } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const regex = /^(!|！|\/|#|＃)?取消队伍邀请\s+(\d+)$/;
  const messageText = e.MessageText || '';
  const match = messageText.match(regex);

  if (!match) {
    return;
  }
  const invitationId = match[2];

  try {
    const result = await runRobotBusiness(
      e,
      'teams.invitation-cancel',
      { invitationId: parseInt(invitationId, 10).toString() },
      value => {
        if (!value || typeof value !== 'object' || Array.isArray(value) || !('outcome' in value) || value.outcome !== 'cancelled') {
          throw new Error('队伍邀请响应不完整');
        }

        return value;
      },
      next
    );

    if (result.handled) {
      return;
    }
  } catch (error) {
    logger.error(error);
    const md = Format.createMarkdown();

    md.addText(error instanceof Error ? error.message : '操作失败');
    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

    return;
  }

  const md = Format.createMarkdown();

  md.addText('已取消邀请');

  void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
});
