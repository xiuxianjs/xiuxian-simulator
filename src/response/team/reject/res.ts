import { useMessage } from '@src/utils/useMessage';
/**
 * 拒绝入队申请
 * 指令：队伍拒绝 [申请编号]
 */

import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseTeamAcknowledgement } from '@src/api/bot/team-actions';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const regex = /^(!|！|\/|#|＃)?队伍拒绝\s+(\d+)$/;
  const messageText = e.MessageText || '';
  const match = messageText.match(regex);

  if (!match) {
    return;
  }
  try {
    const result = await runRobotBusiness(
      e,
      'teams.application-reject',
      { applicationId: Number(match[2]).toString() },
      value => parseTeamAcknowledgement(value, 'rejected'),
      next
    );

    if (result.handled) {
      return;
    }
  } catch (error) {
    const md = Format.createMarkdown();

    md.addText(error instanceof Error ? error.message : '操作失败');
    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

    return;
  }

  const md = Format.createMarkdown();

  md.addText('已拒绝该玩家的入队申请');

  void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
});
