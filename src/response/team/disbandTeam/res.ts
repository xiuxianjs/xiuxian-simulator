import { useMessage } from '@src/utils/useMessage';
/**
 * 解散队伍
 * 指令：解散队伍
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
  const regex = /^(!|！|\/|#|＃)?解散队伍$/;
  const messageText = e.MessageText || '';

  if (!regex.test(messageText)) {
    return;
  }
  try {
    const result = await runRobotBusiness(e, 'teams.disband', {}, value => parseTeamAcknowledgement(value, 'disbanded'), next);

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

  md.addText('队伍已解散');

  void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
});
