import { useMessage } from '@src/utils/useMessage';
/**
 * 邀请入队
 * 指令：邀请入队 [目标玩家UID/@目标]
 */

import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseTeamTargetMutation } from '@src/api/bot/team-actions';
import { selects } from '@src/response/config';
import { MSG_TEAM } from '@src/constants/messages';
import { FormatGui } from '@src/utils/messageHelper';
import { resolveRobotTarget } from '@src/utils/targetUid';
import { Format, onResponse, useMention, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const [mention] = useMention();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const regex = /^(!|！|\/|#|＃)?邀请入队\s+(.+)$/;
  const messageText = e.MessageText || '';
  const match = messageText.match(regex);

  if (!match) {
    return;
  }
  const targetUid = await resolveRobotTarget(messageText, mention);

  let data;

  try {
    const result = await runRobotBusiness(e, 'teams.invite', targetUid ? { target: targetUid } : {}, value => parseTeamTargetMutation(value, true), next);

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
        content: Format.createMarkdown().addText('未找到有效的目标玩家，请核对真实UID，或直接 @已注册道友。'),
        footer: [{ label: '查看好友', command: '/我的好友' }]
      })
    );

    return;
  }

  const md = Format.createMarkdown();
  const successMsg = data.autoAccepted ? MSG_TEAM.INVITE_AUTO_ACCEPTED : MSG_TEAM.INVITE_SENT;

  md.addText(successMsg);
  if (data.invitationId) {
    md.addNewline().addText(`邀请编号：${data.invitationId}`);
  }

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '',
      content: md,
      footer: data.invitationId ? [{ label: '取消本次邀请', command: `/取消队伍邀请 ${data.invitationId}` }] : []
    })
  );
});
