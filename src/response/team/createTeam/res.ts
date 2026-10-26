import { useMessage } from '@src/utils/useMessage';
/**
 * 创建队伍
 * 指令：创建队伍
 */

import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseTeamCreated } from '@src/api/bot/team-actions';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const regex = /^(!|！|\/|#|＃)?创建队伍$/;
  const messageText = e.MessageText || '';

  if (!regex.test(messageText)) {
    return;
  }
  let data;

  try {
    const result = await runRobotBusiness(e, 'teams.create', {}, parseTeamCreated, next);

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

  md.addText(`队伍ID：${data.teamId}`);
  md.addNewline();

  md.addNewline();
  md.addNewline();

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '队伍创建成功',
      content: md,
      footer: [
        { label: '我的队伍', command: '/我的队伍' },
        { label: '申请列表', command: '/队伍申请' }
      ]
    })
  );
});
