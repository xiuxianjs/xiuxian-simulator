import { parseTeamRealmUpdate } from '../api/bot/team-realm-update';
import { parseBackendTeamWorkflow } from '../api/bot/social-workflows';
import { parseBackendTeamInvitationInbox } from '../api/bot/team-invitation-inbox';
import { parseTeamAcknowledgement, parseTeamCreated, parseTeamTargetMutation, requireTeamObject } from '../api/bot/team-actions';
import { parseBackendTeamInfo } from '../api/bot/team-info-queries';
import { parseBackendTeams, parseBackendTeamPendingApplications } from '../api/bot/queries';
import { parseBackendTeamBattleRecords, parseBackendTeamBattleDetail } from '../api/bot/queries';
import { parseBackendTeamMatchSnapshot } from '../api/bot/team-match-queries';
import { parseBackendTeamMatchStart } from '../api/bot/team-match-start';
import { parseBackendTeamMatchCancel } from '../api/bot/team-match-cancel';
import { mutation, observation } from './mutation';
import { boolean, fields, integer, list, object, page, text } from './schema';

const positive = { type: 'integer' as const, minimum: 1, maximum: Number.MAX_SAFE_INTEGER };
const battleRecord = object(
  { ...fields(integer, 'id teamId leaderUserId participantCount'), ...fields(text, 'battleMode targetLabel battleResult settledAt battleLogId') },
  ['battleLogId']
);
const battleDetail = object(
  {
    ...fields(integer, 'id teamId leaderUserId participantCount'),
    ...fields(text, 'battleMode targetLabel battleResult settledAt battleLogId'),
    members: list(object({ ...fields(integer, 'userId position'), userName: text, isLeader: boolean, rewardSnapshotJson: text }, ['rewardSnapshotJson']))
  },
  ['battleLogId']
);
const teamSchema = object(
  {
    ...fields(integer, 'teamId memberCount maxMembers'),
    ...fields(text, 'leaderName minRealmName'),
    ...fields(boolean, 'exists isMember isLeader ownMembershipLeader'),
    target: object(
      {
        mode: { type: 'string', enum: ['mainline', 'dungeon'] },
        targetId: integer,
        teamType: { type: 'string', enum: ['matching_team', 'free_team'] },
        name: text
      },
      ['name']
    ),
    members: list(object({ ...fields(integer, 'userId position'), name: text, isLeader: boolean }, ['name'])),
    actions: object(
      fields(boolean, 'canApply canInvite canManageMembers canReviewApplications canUseTeamMail canViewDungeon canLeave canDisband canViewInvitations')
    )
  },
  ['leaderName', 'minRealmName', 'target']
);
const infoSchema = object({ access: object({ ok: boolean, realmName: text }, ['realmName']), hasTeam: boolean, team: teamSchema }, ['team']);
const targetInfoSchema = object({ hasTeam: boolean, team: teamSchema }, ['team']);
const matchSnapshot = object({
  targetLabel: text,
  ...fields(integer, 'waitedSeconds timeoutSeconds'),
  phase: { type: 'string', enum: ['WAITING', 'SAME_REALM', 'ADJACENT_REALM', 'NEAREST_REALM'] }
});

function info(data: unknown, teamId?: number) {
  parseBackendTeamInfo(data);
  const row = data as { access: unknown; team: { teamId: number; exists: boolean } | null };

  if (teamId !== undefined && row.team?.exists && row.team.teamId !== teamId) {
    throw new Error('队伍信息与请求不匹配');
  }

  return { ...row, hasTeam: row.team?.exists ?? false };
}

function started(data: unknown) {
  const result = parseBackendTeamMatchStart(data);

  if (!result.targetLabel.trim()) {
    throw new Error('匹配目标回执不完整');
  }

  return result;
}

export const teamActions = {
  set_team_minimum_realm: mutation<{ realmName: string }>(
    '设置本人队伍的最低加入境界；境界名称来自游戏数据，服务端校验境界及队长权限。',
    'teams.realm',
    object({ realmName: { type: 'string', minLength: 1, maxLength: 64 } }),
    object({ outcome: { type: 'string', enum: ['updated'] }, realmId: integer }),
    input => `/设置队伍境界门槛 ${input.realmName}`,
    data => {
      const result = parseTeamRealmUpdate(data);

      if (result.outcome !== 'updated' || result.realmId === null) {
        throw new Error('队伍境界设置未返回成功回执');
      }

      return result;
    },
    input => ({ realmName: input.realmName })
  ),
  cancel_team_invitation: mutation<{ invitationId: number }>(
    '取消本人队伍发出的指定待处理邀请；服务端校验队长权限和邀请状态。',
    'teams.invitation-cancel',
    object({ invitationId: positive }),
    object({ outcome: { type: 'string', enum: ['cancelled'] } }),
    input => `/取消队伍邀请 ${input.invitationId}`,
    data => {
      const result = requireTeamObject(data, '取消队伍邀请');

      if (result.outcome !== 'cancelled') {
        throw new Error('取消队伍邀请未返回成功回执');
      }

      return result;
    },
    input => ({ invitationId: String(input.invitationId) })
  ),
  invite_team_player: mutation<{ targetUid: number }>(
    '邀请指定玩家加入本人队伍；targetUid 为目标玩家编号，服务端校验队长权限和自动接受设置。',
    'teams.invite',
    object({ targetUid: positive }),
    object({ outcome: { type: 'string', enum: ['done', 'target_missing'] }, autoAccepted: boolean, invitationId: integer }, ['autoAccepted', 'invitationId']),
    input => `/邀请入队 ${input.targetUid}`,
    data => parseTeamTargetMutation(data, true),
    input => ({ target: { uid: input.targetUid } })
  ),
  kick_team_member: mutation<{ targetUid: number }>(
    '从本人队伍移除指定成员；服务端校验队长权限和目标成员身份。',
    'teams.kick',
    object({ targetUid: positive }),
    object({ outcome: { type: 'string', enum: ['done', 'target_missing'] }, autoAccepted: boolean }, ['autoAccepted']),
    input => `/队伍踢出 ${input.targetUid}`,
    data => parseTeamTargetMutation(data, false),
    input => ({ target: { uid: input.targetUid } })
  ),
  set_team_position: mutation<{ targetUid: number; position: number }>(
    '调整指定队伍成员阵位，位置为 1 至 6；服务端校验队长权限和目标状态。',
    'teams.position',
    object({ targetUid: positive, position: { type: 'integer', minimum: 1, maximum: 6 } }),
    object({ outcome: { type: 'string', enum: ['updated', 'target_missing'] } }),
    input => `/队伍位置设置 ${input.targetUid} ${input.position}`,
    data => parseBackendTeamWorkflow(data, 'position'),
    input => ({ targetUid: String(input.targetUid), position: String(input.position) })
  ),
  transfer_team_leadership: mutation<{ targetUid: number }>(
    '将队长身份转让给指定队伍成员；服务端校验权限、成员身份和不能转让给自己。',
    'teams.leadership',
    object({ targetUid: positive }),
    object({ outcome: { type: 'string', enum: ['transferred', 'target_missing'] } }),
    input => `/转让队长 ${input.targetUid}`,
    data => parseBackendTeamWorkflow(data, 'leadership'),
    input => ({ targetUid: String(input.targetUid) })
  ),
  get_team_invitations: observation(
    '查询本人队伍邀请及资格；服务端会先将过期邀请标记为失效，邀请编号可用于接受。',
    'teams.invitations',
    object({}),
    object({
      access: object({ ok: boolean, realmName: text }, ['realmName']),
      invitations: list(
        object({ ...fields(integer, 'id teamId'), ...fields(text, 'leaderName inviterName createdAt') }, ['leaderName', 'inviterName', 'createdAt'])
      )
    }),
    () => '/我的队伍邀请',
    parseBackendTeamInvitationInbox
  ),
  get_my_team_applications: observation(
    '查询本人提交的待处理队伍申请；队长同时可查看待审核申请。资格未解锁时以 records.canUseSecondLayerFeature 判断。',
    'teams.my-applications',
    object({}),
    object(
      {
        records: object({
          isLeader: boolean,
          canUseSecondLayerFeature: boolean,
          realmName: text,
          applications: list(object({ id: integer, leaderName: text, createdAt: text }, ['leaderName', 'createdAt']))
        }),
        pending: object({ leaderName: text, applications: list(object({ ...fields(integer, 'id userId'), userName: text }, ['userName'])) }, ['leaderName'])
      },
      ['pending']
    ),
    () => '/我的队伍申请',
    data => parseBackendTeamWorkflow(data, 'applications')
  ),
  cancel_team_application: mutation<{ applicationId: number }>(
    '取消本人指定待处理队伍申请；not_pending 表示申请不存在或已处理，不能报告取消成功。',
    'teams.application-cancel',
    object({ applicationId: positive }),
    object({ outcome: { type: 'string', enum: ['cancelled', 'not_pending'] }, leaderName: text, message: text }, ['leaderName', 'message']),
    input => `/取消队伍申请 ${input.applicationId}`,
    data => {
      const row = requireTeamObject(data, '取消队伍申请');

      if (
        (row.outcome === 'cancelled' && row.leaderName !== null && typeof row.leaderName !== 'string') ||
        (row.outcome === 'not_pending' && typeof row.message !== 'string') ||
        !['cancelled', 'not_pending'].includes(String(row.outcome))
      ) {
        throw new Error('取消队伍申请回执不完整');
      }

      return row;
    },
    input => ({ applicationId: String(input.applicationId) })
  ),
  reject_team_invitation: mutation<{ invitationId: number }>(
    '拒绝本人收到的指定队伍邀请；服务端校验邀请归属和待处理状态。',
    'teams.invitation-reject',
    object({ invitationId: positive }),
    object({ rejected: boolean }),
    input => `/队伍邀请拒绝 ${input.invitationId}`,
    data => parseTeamAcknowledgement(data, 'rejected'),
    input => ({ invitationId: String(input.invitationId) })
  ),
  accept_team_invitation: mutation<{ invitationId: number }>(
    '接受本人收到的指定队伍邀请；服务端校验邀请归属、队伍容量和境界，并返回实际队伍成员。',
    'teams.invitation-accept',
    object({ invitationId: positive }),
    object({ ...fields(integer, 'id leaderId'), members: list(object({ ...fields(integer, 'userId position'), isLeader: boolean })) }),
    input => `/队伍邀请同意 ${input.invitationId}`,
    data => {
      const row = requireTeamObject(data, '接受队伍邀请');

      if (
        !Number.isSafeInteger(row.id) ||
        !Number.isSafeInteger(row.leaderId) ||
        !Array.isArray(row.members) ||
        row.members.some(
          member => !member || !Number.isSafeInteger(member.userId) || !Number.isSafeInteger(member.position) || typeof member.isLeader !== 'boolean'
        )
      ) {
        throw new Error('接受队伍邀请回执不完整');
      }

      return row;
    },
    input => ({ invitationId: String(input.invitationId) })
  ),
  get_team_battle_records: observation<{ page?: number }>(
    '分页查看本人有权查看的队伍战斗记录，记录编号可用于查询详情；战斗日志编号仅作数据，不自动打开或执行链接。',
    'teams.battle-records',
    object({ page }, ['page']),
    object({ currentPage: integer, total: integer, totalPages: integer, records: list(battleRecord) }),
    input => `/队伍战斗记录 ${input.page ?? 1}`,
    data => {
      const result = parseBackendTeamBattleRecords(data);

      return { ...result, records: result.records.map(item => ({ ...item, settledAt: item.settledAt.toISOString() })) };
    },
    input => ({ page: input.page ?? 1, pageSize: 5 })
  ),
  get_team_battle_detail: observation<{ recordId: number }>(
    '查询指定队伍战斗记录及成员奖励快照；found=false 为不存在，error 为服务端权限拒绝，不把它们当作空战报。',
    'teams.battle-detail',
    object({ recordId: positive }),
    object({ found: boolean, error: text, detail: battleDetail }, ['error', 'detail']),
    input => `/队伍战斗详情 ${input.recordId}`,
    (data, input) => {
      const row = data as Record<string, unknown> | null;

      if (row?.found === false) {
        return { found: false };
      }
      if (typeof row?.error === 'string') {
        return { found: false, error: row.error };
      }
      const detail = parseBackendTeamBattleDetail(data, input.recordId);

      return {
        found: true,
        detail: {
          ...detail,
          settledAt: detail.settledAt.toISOString(),
          members: detail.members.map(member => ({
            ...member,
            ...(member.rewardSnapshot === null ? {} : { rewardSnapshotJson: JSON.stringify(member.rewardSnapshot) })
          }))
        }
      };
    },
    input => ({ recordId: String(input.recordId) })
  ),
  get_my_team: observation(
    '查询当前角色队伍、成员、阵位与服务端可用操作；access.ok=false 表示资格未解锁，hasTeam 根据服务端 exists 判定是否存在队伍。不会创建队伍。',
    'teams.overview',
    object({}),
    infoSchema,
    () => '/我的队伍',
    data => info(data)
  ),
  get_team_info: observation<{ teamId: number }>(
    '查询指定队伍的服务端可见资料与本人操作资格；不申请入队，不从成员行推断队长权限。',
    'teams.info',
    object({ teamId: positive }),
    targetInfoSchema,
    input => `/队伍信息 ${input.teamId}`,
    (data, input) => info(data, input.teamId),
    input => ({ teamId: String(input.teamId) })
  ),
  get_team_list: observation<{ page?: number }>(
    '分页查看队伍编号、人数、队长与最低境界；page 默认1，每页5条；不会创建申请。空名称或缺失字段保留服务端事实。',
    'teams.list',
    object({ page }, ['page']),
    object({
      ...fields(integer, 'total page pageSize'),
      items: list(
        object({ ...fields(integer, 'id leaderId maxMembers memberCount minRealmId'), ...fields(text, 'leaderName minRealmName') }, [
          'leaderName',
          'minRealmName',
          'minRealmId'
        ])
      )
    }),
    input => `/队伍列表 ${input.page ?? 1}`,
    data => {
      parseBackendTeams(data);

      return data;
    },
    input => ({ page: input.page ?? 1, pageSize: 5 })
  ),
  create_team: mutation(
    '为当前角色创建队伍，沿用服务端身份、准入和既有队伍状态校验；返回实际队伍编号。',
    'teams.create',
    object({}),
    object({ teamId: positive }),
    () => '/创建队伍',
    parseTeamCreated
  ),
  apply_to_team: mutation<{ teamId: number }>(
    '向指定队伍申请加入，由服务端判断队伍、境界、容量和自动审批设置。autoApproved=false 表示等待审核，不能报告已经入队。',
    'teams.apply',
    object({ teamId: positive }),
    object({ applicationId: positive, teamId: positive, status: { type: 'integer', minimum: 0, maximum: 1 }, autoApproved: boolean }),
    input => `/加入队伍 ${input.teamId}`,
    (data, input) => {
      const row = requireTeamObject(data, '入队申请');

      if (!Number.isSafeInteger(row.id) || Number(row.id) < 1 || row.teamId !== input.teamId || (row.status !== 0 && row.status !== 1)) {
        throw new Error('入队申请回执不完整');
      }

      return { applicationId: row.id, teamId: row.teamId, status: row.status, autoApproved: row.status === 1 };
    },
    input => ({ teamId: String(input.teamId) })
  ),
  leave_team: mutation(
    '让当前角色按服务端原规则离队；队长离队时可能由剩余成员继任，需重新读取状态。不代替解散队伍或回滚战斗。',
    'teams.leave',
    object({}),
    object({ left: boolean }),
    () => '/离开队伍',
    data => parseTeamAcknowledgement(data, 'left')
  ),
  disband_team: mutation(
    '解散当前角色担任队长的队伍，所有成员离队，待处理申请和邀请按服务端原规则收尾；不会回滚已结算的战斗。',
    'teams.disband',
    object({}),
    object({ disbanded: boolean }),
    () => '/解散队伍',
    data => parseTeamAcknowledgement(data, 'disbanded')
  ),
  get_team_applications: observation(
    '查询本人当前队伍的待审核申请；canReview=false 时阅读 error，不代表申请列表为空。申请编号用于队长同意或拒绝操作。',
    'teams.applications',
    object({}),
    object(
      {
        canReview: boolean,
        teamId: positive,
        leaderName: text,
        error: text,
        applications: list(object({ ...fields(integer, 'id userId teamId status'), ...fields(text, 'userName createdAt') }, ['userName']))
      },
      ['teamId', 'leaderName', 'error', 'applications']
    ),
    () => '/队伍申请',
    data => {
      const row = requireTeamObject(data, '队伍申请列表');

      if (typeof row.error === 'string') {
        return { canReview: false, error: row.error };
      }
      parseBackendTeamPendingApplications(data);

      return { ...row, canReview: true };
    }
  ),
  approve_team_application: mutation<{ applicationId: number }>(
    '作为本人当前队伍队长同意指定待审核申请；服务端校验归属、容量和申请人资格，返回实际队伍编号。',
    'teams.application-approve',
    object({ applicationId: positive }),
    object({ teamId: positive }),
    input => `/队伍同意 ${input.applicationId}`,
    parseTeamCreated,
    input => ({ applicationId: String(input.applicationId) })
  ),
  reject_team_application: mutation<{ applicationId: number }>(
    '作为本人当前队伍队长拒绝指定待审核申请；服务端继续校验申请归属和处理状态。',
    'teams.application-reject',
    object({ applicationId: positive }),
    object({ rejected: boolean }),
    input => `/队伍拒绝 ${input.applicationId}`,
    data => parseTeamAcknowledgement(data, 'rejected'),
    input => ({ applicationId: String(input.applicationId) })
  ),
  get_team_match: observation(
    '查询当前角色匹配队列快照；matching=false 表示服务端未返回有效排队记录，不代表已组队或战斗完成。只返回服务端等待时长及阶段。',
    'team-match.snapshot',
    object({}),
    object({ matching: boolean, snapshot: matchSnapshot }, ['snapshot']),
    () => '/匹配状态',
    data => {
      const snapshot = parseBackendTeamMatchSnapshot(data);

      return { matching: snapshot !== null, ...(snapshot ? { snapshot } : {}) };
    }
  ),
  start_mainline_match: mutation<{ chapterNumber: number; stageNumber: number }>(
    '为当前角色发起指定章节关卡的主线匹配；返回目标标签仅表示已入队列，不保证已匹配成功、挑战或结算。',
    'team-match.start-mainline',
    object({ chapterNumber: page, stageNumber: page }),
    object({ targetLabel: text }),
    input => `/匹配主线 ${input.chapterNumber}-${input.stageNumber}`,
    started
  ),
  start_dungeon_match: mutation<{ dungeonId: number }>(
    '为当前角色发起指定秘境编号的组队匹配；服务端拒绝单人秘境及不合资格目标，不代表已发起或完成战斗。',
    'team-match.start-dungeon',
    object({ dungeonId: positive }),
    object({ targetLabel: text }),
    input => `/匹配秘境 ${input.dungeonId}`,
    started
  ),
  cancel_team_match: mutation(
    '取消当前角色匹配；cancelled=false 表示本次未取消有效队列记录，不能把它当成解散队伍或回滚战斗。',
    'team-match.cancel',
    object({}),
    object({ cancelled: boolean, targetLabel: text }, ['targetLabel']),
    () => '/取消匹配',
    parseBackendTeamMatchCancel
  )
};
