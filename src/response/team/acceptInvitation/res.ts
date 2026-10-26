import { useMessage } from '@src/utils/useMessage';
/**
 * 接受队伍邀请
 * 指令：队伍邀请同意 [邀请ID]
 */

import { runRobotBusiness } from '@src/response/robotBusiness';
import { requireTeamObject } from '@src/api/bot/team-actions';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const regex = /^(!|！|\/|#|＃)?队伍邀请同意\s+(\d+)$/;
  const messageText = e.MessageText || '';
  const match = messageText.match(regex);

  if (!match) {
    return;
  }
  try {
    const result = await runRobotBusiness(
      e,
      'teams.invitation-accept',
      { invitationId: parseInt(match[2]).toString() },
      value => requireTeamObject(value, '接受队伍邀请'),
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

  md.addText('已接受邀请，加入队伍');

  void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
});
