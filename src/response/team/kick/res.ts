import { useMessage } from '@src/utils/useMessage';
/**
 * 踢出队员
 * 指令：队伍踢出 [玩家UID/@目标]
 */

import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseTeamTargetMutation } from '@src/api/bot/team-actions';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { resolveRobotTarget } from '@src/utils/targetUid';
import { Format, onResponse, useMention, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const [mention] = useMention();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const regex = /^(!|！|\/|#|＃)?队伍踢出\s+(.+)$/;
  const messageText = e.MessageText || '';
  const match = messageText.match(regex);

  if (!match) {
    return;
  }
  const targetUid = await resolveRobotTarget(messageText, mention);

  let data;

  try {
    const result = await runRobotBusiness(e, 'teams.kick', targetUid ? { target: targetUid } : {}, value => parseTeamTargetMutation(value, false), next);

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
  if (data.outcome === 'target_missing') {
    await message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '',
        content: Format.createMarkdown().addText('未找到有效的目标队员，请从当前队伍成员中核对UID，或直接 @目标。'),
        footer: [{ label: '核对队伍成员', command: '/我的队伍' }]
      })
    );

    return;
  }

  const md = Format.createMarkdown();

  md.addText('已将该玩家踢出队伍');

  void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
});
