import { useMessage } from '@src/utils/useMessage';
/**
 * 我的队伍
 * 指令：我的队伍
 */

import { sendSecondLayerLockedPage } from '@src/response/access/secondLayer';
import type { MyTeamResult } from '@src/response-apps/team/myTeam/app';
import { parseBackendTeamInfo } from '@src/api/bot/team-info-queries';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { addOptions, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent, logger } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const regex = /^(!|！|\/|#|＃)?(我的队伍|查看队伍)$/;
  const messageText = e.MessageText || '';

  if (!regex.test(messageText)) {
    return;
  }

  let result: MyTeamResult;

  try {
    const loaded = await runRobotBusiness(
      e,
      'teams.overview',
      {},
      (value): MyTeamResult => {
        const data = parseBackendTeamInfo(value);

        if (!data.access.ok) {
          return { code: 'LOCKED', data: { realmName: data.access.realmName } };
        }
        if (!data.team) {
          return { code: 'NO_TEAM' };
        }

        return { code: 'OK', data: { ...data.team, isLeader: data.team.ownMembershipLeader } };
      },
      next
    );

    if (loaded.handled) {
      return;
    }
    result = loaded.data;
  } catch (error) {
    logger.error('查询我的队伍失败:', error);
    result = { code: 'LOAD_FAILED', data: { message: error instanceof Error ? error.message : '查询失败' } };
  }

  if (result.code === 'LOCKED') {
    sendSecondLayerLockedPage({ bid, isPrivate, message, title: '我的队伍', realmName: result.data.realmName });

    return;
  }

  if (result.code === 'NO_TEAM') {
    const md = Format.createMarkdown();

    md.addText('你还没有加入任何队伍');

    md.addNewline();

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '我的队伍',
        content: md,
        footer: [
          { label: '创建队伍', command: '/创建队伍' },
          { label: '队伍列表', command: '/队伍列表' },
          { label: '我的申请', command: '/我的队伍申请' },
          { label: '我的邀请', command: '/我的队伍邀请' },
          { label: '道友往来', command: '/更多 社交' }
        ]
      })
    );

    return;
  }

  if (result.code !== 'OK') {
    const md = Format.createMarkdown();

    md.addText(result.data.message);

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

    return;
  }

  const teamInfo = result.data;
  const md = Format.createMarkdown();

  md.addText(`类型：${teamInfo.targetInfo?.teamType === 'matching_team' ? '匹配队伍' : '普通队伍'}`);
  md.addNewline();
  if (teamInfo.targetInfo?.targetName) {
    md.addText(`目标：${teamInfo.targetInfo.targetName}`);
    md.addNewline();
  }

  for (const member of teamInfo.members) {
    const role = member.isLeader ? '队长' : '队员';
    const memberInfo = `【${role}】【位置${member.position}】${member.userName}（${member.userId}）`;

    md.addNewline();
    md.addText(memberInfo);

    if (teamInfo.actions.canManageMembers) {
      const mtBtns: { label: string; command: string }[] = [];

      if (!member.isLeader) {
        mtBtns.push({ label: '转让', command: `/转让队长 ${member.uid}` });
        mtBtns.push({ label: '踢出', command: `/队伍踢出 ${member.uid}` });
      }

      mtBtns.push({ label: '移动', command: `/队伍位置设置 ${member.uid} ` });

      addOptions(md, mtBtns);
    }
  }

  md.addNewline();

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: `【${teamInfo.leaderName}】的队伍`,
      content: md,
      footer: [
        ...(teamInfo.actions.canInvite ? [{ label: '邀请', command: '/邀请入队 ' }] : []),
        ...(teamInfo.actions.canUseTeamMail ? [{ label: '飞信', command: '/飞信 队伍' }] : []),
        ...(teamInfo.actions.canReviewApplications ? [{ label: '入队申请', command: '/我的队伍申请' }] : []),
        ...(teamInfo.actions.canViewDungeon ? [{ label: '秘境', command: '/查看秘境' }] : []),
        ...(teamInfo.actions.canDisband ? [{ label: '解散', command: '/解散队伍' }] : []),
        ...(teamInfo.actions.canLeave ? [{ label: '离开', command: '/离开队伍' }] : []),
        { label: '道友往来', command: '/更多 社交' }
      ]
    })
  );
});
