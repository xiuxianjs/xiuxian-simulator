import { parseRobotGuildList } from '../api/bot/guild-directory-robot-query';
import { parseGuildApply, parseGuildApplicationDecision } from '../api/bot/guild-membership-mutations';
import { parseGuildApplications } from '../api/bot/guild-application-queries';
import { parseGuildApplicationCancel } from '../api/bot/guild-application-cancel';
import { parseGuildMembers } from '../api/bot/queries';
import { parseGuildReview } from '../api/bot/guild-review-queries';
import { parseGuildRoleOptions } from '../api/bot/guild-role-options-queries';
import { parseRobotGuildRoleAppoint, parseRobotGuildRoleResign } from '../api/bot/guild-role-action-robot-query';
import { parseRobotGuildKick } from '../api/bot/guild-kick-robot-query';
import { parseGuildLeadershipTransfer, parseGuildMemberMutation } from '../api/bot/guild-member-lifecycle';
import { confirmationReferenceSchema, validateConfirmationReference } from './confirmation';
import { mutation, observation } from './mutation';
import { boolean, fields, integer, list, object, page, text } from './schema';

const id = { type: 'integer' as const, minimum: 1, maximum: Number.MAX_SAFE_INTEGER };
const role = object({ id: integer, name: text });
const roleMember = {
  userId: integer,
  userExists: boolean,
  isDeputy: boolean,
  name: text,
  realmName: text,
  roleName: text
};

function envelope(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || (value as Record<string, unknown>).outcome !== 'result') {
    throw new Error('宗门操作未返回结果');
  }

  return value as Record<string, unknown>;
}
function reviewDecision(approve: boolean) {
  return mutation<{ applicantId: number; applicationId: number }>(
    approve
      ? '同意原宗门申请；编号和申请人来自审核列表。服务端锁定当前审核者身份、权限和原申请，撤回重提等状态变化时拒绝，不自动同意最新申请。'
      : '拒绝原宗门申请；编号和申请人来自审核列表。服务端校验当前宗门、权限及原申请，不拒绝同一申请人后来的新申请。',
    approve ? 'guild.application-approve' : 'guild.application-reject',
    object({ applicantId: id, applicationId: id }),
    object({
      ...fields(integer, 'applicationId guildId applicantId'),
      ...fields(text, 'applicantName message'),
      outcome: { type: 'string', enum: [approve ? 'approved' : 'rejected'] }
    }),
    input => `/宗门审核${approve ? '同意' : '拒绝'} ${input.applicantId}`,
    (value, input) => {
      const row = envelope(value);
      const result = parseGuildApplicationDecision(row.receipt);

      if (result.applicationId !== input.applicationId || result.applicantId !== input.applicantId || result.outcome !== (approve ? 'approved' : 'rejected')) {
        throw new Error('宗门审核回执与原申请不匹配');
      }

      return result;
    },
    input => ({ target: { uid: input.applicantId }, expectedApplicationId: input.applicationId })
  );
}
export const guildMembershipActions = {
  get_guild_transfer_targets: observation(
    '查询宗主转让候选的真实成员 UID 和活跃排名；结果是快照，预览时会重新检查资格。',
    'guild.transfer-candidates-reference',
    object({}),
    object({
      guildId: integer,
      guildName: text,
      candidates: list(object({ ...fields(integer, 'userId index weeklyActivity contributionTotal'), ...fields(text, 'name roleName') }))
    }),
    () => '/宗主转让',
    data => {
      const row = data as { guildId?: unknown; guildName?: unknown; candidates?: unknown } | null;

      if (
        !row ||
        !Number.isSafeInteger(row.guildId) ||
        Number(row.guildId) < 1 ||
        typeof row.guildName !== 'string' ||
        !Array.isArray(row.candidates) ||
        row.candidates.some(
          item => !item ||
            !['userId', 'index', 'weeklyActivity', 'contributionTotal'].every(key => Number.isSafeInteger(item[key])) ||
            Number(item.userId) < 1 ||
            typeof item.name !== 'string' ||
            typeof item.roleName !== 'string'
        )
      ) {
        throw new Error('宗主转让候选数据不完整');
      }

      return row;
    }
  ),
  prepare_guild_leadership_transfer: mutation<{ targetUid: number }>(
    '预览转让给指定候选成员，生成绑定原宗门和目标的 60 秒确认引用；不执行转让。',
    'guild.transfer-prepare-reference',
    object({ targetUid: id }),
    object({ guildId: integer, targetId: integer, targetName: text, expiresAt: text, reference: confirmationReferenceSchema }),
    () => '/宗主转让',
    (data, input) => {
      const row = data as { guildId?: number; targetId?: number; targetName?: string; expiresAt?: string; reference?: string } | null;

      if (
        !row ||
        !Number.isSafeInteger(row.guildId) ||
        Number(row.guildId) < 1 ||
        row.targetId !== input.targetUid ||
        typeof row.targetName !== 'string' ||
        typeof row.expiresAt !== 'string' ||
        !Number.isFinite(Date.parse(row.expiresAt)) ||
        typeof row.reference !== 'string'
      ) {
        throw new Error('宗主转让预览不完整');
      }
      validateConfirmationReference(row.reference, 'z');

      return row;
    },
    input => ({ targetId: input.targetUid })
  ),
  confirm_guild_leadership_transfer: mutation<{ reference: string }>(
    '确认原宗主转让预览；会转让职位并使原宗主成为弟子，必须获得玩家明确确认。使用原引用重试，结果以服务端回执为准。',
    'guild.transfer-confirm-reference',
    object({ reference: confirmationReferenceSchema }),
    object({ outcome: text, message: text, guildId: integer, guildName: text, targetUserId: integer, targetName: text, roleName: text }),
    () => '/宗主转让',
    data => {
      const result = parseGuildLeadershipTransfer(data);

      if (
        result.outcome !== 'transferred' ||
        !Number.isSafeInteger(result.targetUserId) ||
        Number(result.targetUserId) < 1 ||
        typeof result.targetName !== 'string' ||
        typeof result.roleName !== 'string'
      ) {
        throw new Error('宗主转让回执不完整');
      }

      return result;
    },
    input => ({ reference: input.reference }),
    input => validateConfirmationReference(input.reference, 'z')
  ),
  get_guild_leadership_candidates: observation(
    '查询当前宗主转让候选和排名，不发起转让；序号会随成员活跃变化，不是固定目标凭据。',
    'guild.leadership-transfer',
    object({}),
    object({
      outcome: text,
      message: text,
      guildId: integer,
      guildName: text,
      candidates: list(object({ ...fields(integer, 'index weeklyActivity contributionTotal'), ...fields(text, 'name roleName') }))
    }),
    () => '/宗主转让',
    data => {
      const result = parseGuildLeadershipTransfer(data);

      if (result.outcome !== 'candidates') {
        throw new Error('宗主转让候选响应不完整');
      }

      return result;
    },
    () => ({ index: 0 })
  ),
  kick_guild_member: mutation<{ targetUid: number }>(
    '立即将指定成员移出当前宗门；需玩家明确要求，服务端校验当前宗门、操作者权限和目标职位。',
    'guild.kick',
    object({ targetUid: id }),
    object({ outcome: text, message: text, guildId: integer, guildName: text, targetUserId: integer, targetName: text }, ['targetName']),
    input => `/踢出成员 ${input.targetUid}`,
    (data, input) => {
      const result = parseRobotGuildKick(data);

      if (result.outcome !== 'result') {
        throw new Error('宗门踢出回执不完整');
      }
      const receipt = parseGuildMemberMutation((data as { receipt: unknown }).receipt);

      if (receipt.targetUserId !== input.targetUid) {
        throw new Error('宗门踢出目标不匹配');
      }

      return { ...receipt, message: result.message };
    },
    input => ({ mode: 'action', target: { uid: input.targetUid } })
  ),
  get_guild_role_options: observation(
    '查询宗门职位、成员可任命职位及可移除成员；操作资格以执行时服务端校验为准。',
    'guild.role-options',
    object({}),
    object({
      membershipStatus: text,
      guildName: text,
      roles: list(role),
      members: list(object({ ...roleMember, appointableRoles: list(role) }, ['name', 'realmName', 'roleName'])),
      kickableMembers: list(object(roleMember, ['name', 'realmName', 'roleName']))
    }),
    () => '/宗门改职',
    parseGuildRoleOptions
  ),
  appoint_guild_member: mutation<{ targetUid: number; roleName: string }>(
    '任命宗门成员职位；服务端核验操作者权限、目标身份、职位和席位限制。',
    'guild.role-appoint',
    object({ targetUid: id, roleName: { type: 'string', minLength: 1, maxLength: 100 } }),
    object({ outcome: text, message: text }),
    input => `/设置身份为 ${input.roleName} ${input.targetUid}`,
    (data, input) => {
      const result = parseRobotGuildRoleAppoint(data);

      if (result.outcome !== 'result') {
        throw new Error('宗门任命回执不完整');
      }
      const receipt = (data as { receipt: { targetUserId?: number; roleName?: string } }).receipt;

      if (receipt.targetUserId !== input.targetUid || receipt.roleName !== input.roleName) {
        throw new Error('宗门任命目标不匹配');
      }

      return result;
    }
  ),
  resign_guild_role: mutation<{ targetUid: number }>(
    '卸任自己或按服务端权限将成员降职；已有有效确认时可能直接卸任，需玩家明确请求。outcome=confirmation 表示尚未卸任。',
    'guild.role-resign',
    object({ targetUid: id }),
    object({ outcome: text, message: text }, ['message']),
    input => `/卸任 ${input.targetUid}`,
    (data, _input, uid) => {
      const result = parseRobotGuildRoleResign(data, uid);

      if (result.outcome === 'options') {
        throw new Error('宗门卸任回执不完整');
      }

      return result;
    },
    input => ({ mode: 'action', targetUid: input.targetUid })
  ),
  get_guild_list: mutation<{ page: number }>(
    '分页查看可申请宗门，每页5项，保留服务端简介、等级和最低境界。redirected=true 表示页码已被服务端纠正；result 缺失表示纠正查询失败，不能当作没有宗门。',
    'guild.list',
    object({ page }),
    object(
      {
        canCreateOrApplyGuild: boolean,
        redirected: boolean,
        result: object({
          ...fields(integer, 'total currentPage totalPages'),
          guilds: list(
            object({ ...fields(integer, 'id memberCount levelId level'), ...fields(text, 'name intro minRealmName'), titles: list(text) }, [
              'level',
              'intro',
              'minRealmName'
            ])
          )
        })
      },
      ['result']
    ),
    input => `/宗门列表 ${input.page}`,
    data => {
      parseRobotGuildList(data);

      return data;
    },
    input => input,
    undefined,
    { freshRead: true }
  ),
  apply_to_guild: mutation<{ guildId: number }>(
    '向指定宗门提交入门申请；服务端校验境界、容量和重复申请。成功只表示申请提交，不能报告已加入宗门。',
    'guild.apply',
    object({ guildId: id }),
    object({ ...fields(integer, 'applicationId guildId memberCount'), ...fields(text, 'guildName levelName') }),
    input => `/加入宗门 ${input.guildId}`,
    (data, input) => {
      const result = parseGuildApply(envelope(data).receipt);

      if (result.guildId !== input.guildId) {
        throw new Error('宗门申请回执与目标不匹配');
      }

      return result;
    }
  ),
  get_guild_applications: mutation(
    '查询本人待处理的宗门申请与可取消状态；hasGuild 独立表示当前是否已入宗，不把待审核申请当作宗门成员身份。',
    'guild.my-applications',
    object({}),
    object(
      {
        hasGuild: boolean,
        ...fields(text, 'guildName guildNameText'),
        applications: list(
          object(
            {
              ...fields(integer, 'id guildId'),
              status: { type: 'integer', minimum: 0, maximum: 0 },
              ...fields(text, 'guildName guildNameText statusText createdAt createdDateText'),
              canCancel: boolean
            },
            ['guildName', 'createdAt']
          )
        )
      },
      ['guildName']
    ),
    () => '/我的申请',
    data => {
      parseGuildApplications(data);

      return data;
    },
    input => input,
    undefined,
    { freshRead: true }
  ),
  cancel_guild_application: mutation<{ applicationId: number }>(
    '按本人原申请编号取消待审核宗门申请；不退出已加入的宗门，不处理其他玩家的申请。编号来自 get_guild_applications。',
    'guild.application-cancel',
    object({ applicationId: id }),
    object({ outcome: { type: 'string', enum: ['cancelled'] }, guildExists: boolean, guildName: text, message: text }, ['guildName']),
    input => `/取消宗门申请 ${input.applicationId}`,
    data => {
      const row = envelope(data);
      const receipt = parseGuildApplicationCancel(row.receipt);

      if (receipt.outcome !== 'cancelled' || typeof row.message !== 'string') {
        throw new Error('宗门申请取消未获确认');
      }

      return { ...receipt, message: row.message };
    }
  ),
  get_guild_members: mutation<{ page: number }>(
    '分页查询本人宗门成员、职位、活跃、贡献和离任状态，每页5项；未入宗或查询失败返回拒绝，不伪造空成员列表。',
    'guild.members',
    object({ page }),
    object({
      membershipStatus: { type: 'string', enum: ['joined'] },
      guildName: text,
      ...fields(integer, 'page pageSize total totalPages'),
      members: list(
        object(
          {
            ...fields(integer, 'userId roleId dailyActivity weeklyActivity contributionTotal'),
            ...fields(text, 'name realmName roleName leaveEndAt'),
            ...fields(boolean, 'isOnLeave isDeputy')
          },
          ['name', 'realmName', 'roleName', 'leaveEndAt']
        )
      )
    }),
    input => `/宗门成员列表 ${input.page}`,
    data => {
      parseGuildMembers(data);

      return data;
    },
    input => input,
    undefined,
    { freshRead: true }
  ),
  get_guild_review_applications: mutation<{ page: number }>(
    '查询本人有权限审核的待处理宗门申请；保留申请编号 id、申请人 userId 和当前权限，不把无权审核当作空列表。',
    'guild.review-applications',
    object({ page }),
    object(
      {
        ...fields(boolean, 'hasGuild canReview isDeputy'),
        ...fields(text, 'guildName roleName nextCursor'),
        ...fields(integer, 'currentPage totalPages total'),
        applications: list(object({ ...fields(integer, 'id userId'), ...fields(text, 'userName realmName createdAt') }, ['userName', 'realmName', 'createdAt']))
      },
      ['guildName', 'roleName', 'nextCursor']
    ),
    input => `/宗门审核 ${input.page}`,
    data => {
      parseGuildReview(data);

      return data;
    },
    input => input,
    undefined,
    { freshRead: true }
  ),
  approve_guild_application: reviewDecision(true),
  reject_guild_application: reviewDecision(false)
};
