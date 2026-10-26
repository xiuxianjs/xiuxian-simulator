import { useMessage } from '@src/utils/useMessage';
/**
 * 设置队伍境界门槛
 * 指令：设置队伍境界门槛 [境界名]
 */

import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { teamRecoveryTips } from '@src/response/teamRecovery';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseTeamRealmUpdate } from '@src/api/bot/team-realm-update';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const regex = /^(!|！|\/|#|＃)?设置队伍境界门槛\s+(.+)$/;
  const messageText = e.MessageText || '';
  const match = messageText.match(regex);

  if (!match) {
    return;
  }
  const realmName = match[2].trim();

  let data;

  try {
    const result = await runRobotBusiness(
      e,
      'teams.realm',
      { realmName: realmName === '无' || realmName === '取消' ? null : realmName },
      parseTeamRealmUpdate,
      next
    );

    if (result.handled) {
      return;
    }
    data = result.data;
  } catch (error) {
    const md = Format.createMarkdown();

    md.addText(error instanceof Error ? error.message : '设置失败');
    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

    return;
  }

  const md = Format.createMarkdown();

  if (data.outcome === 'updated') {
    md.addText(`队伍境界门槛已设置为：${realmName}`);
  } else {
    const reason = {
      cancel_noop: '本次未取消境界门槛，请查询当前队伍要求',
      realm_not_found: '境界不存在',
      not_in_team: '你还未加入队伍',
      not_leader: '你不是队长'
    }[data.outcome];

    md.addText(reason);
    appendMiddlewareAdvice(md, teamRecoveryTips('teams.realm', reason));
  }

  void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
});
