import { useMessage } from '@src/utils/useMessage';
/**
 * 加入队伍
 * 指令：加入队伍 [队伍ID]
 */

import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseTeamApplicationStatus } from '@src/api/bot/team-actions';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const regex = /^(!|！|\/|#|＃)?加入队伍(?:\s+([\s\S]*))?$/;
  const messageText = (e.MessageText || '').trim();
  const match = messageText.match(regex);

  if (!match) {
    return;
  }
  const input = String(match[2] ?? '').trim();
  // Preserve the original numeric conversion; validation belongs to the backend.
  const teamId = /^\d+$/.test(input) ? Number(input).toString() : input;
  let data;

  try {
    const result = await runRobotBusiness(e, 'teams.apply', { teamId }, parseTeamApplicationStatus, next);

    if (result.handled) {
      return;
    }
    data = result.data;
  } catch (error) {
    const md = Format.createMarkdown();

    md.addText(error instanceof Error ? error.message : '操作失败');
    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

    return;
  }

  const md = Format.createMarkdown();

  if (data.autoApproved) {
    md.addText('队长已开启好友自动审批，你已成功加入队伍');
  } else {
    md.addText('入队申请已发送，请等待队长审核');
  }

  void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
});
