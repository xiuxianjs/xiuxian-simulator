import { parseGuildCreate } from '../api/bot/guild-membership-mutations';
import { parseRobotGuildContent } from '../api/bot/guild-content-robot-query';
import { parseGuildLogs } from '../api/bot/queries';
import { parseRobotGuildSetting } from '../api/bot/guild-settings-robot-query';
import { parseGuildRename } from '../api/bot/guild-rename';
import { parseGuildWorkflow } from '../api/bot/guild-workflow';
import { parseGuildHome } from '../api/bot/guild-home-query';
import { parseFeatureAccess } from '../api/bot/tianshu-content';
import { ExposeError } from 'alemonjs';
import { intentIdSchema, mutation, observation, taskInputSchema, validateIntentId } from './mutation';
import { boolean, fields, integer, list, number, object, page, text } from './schema';

const empty = object({});
const content = object({ guildName: text, notice: text, intro: text }, ['notice', 'intro']);
const guildHome = object(
  {
    hasGuild: boolean,
    access: object(
      {
        canCreateOrApplyGuild: boolean,
        canCreateGuild: boolean,
        features: list(object({ key: text, realmReached: boolean, requiredRealm: text, lockedReason: text }))
      },
      ['canCreateGuild', 'features']
    ),
    membership: object({ guildId: integer, guildName: text, roleName: text, ...fields(boolean, 'isDeputy canUpgrade isLeader') }, ['guildName', 'roleName']),
    guild: object(
      {
        ...fields(
          integer,
          'level spiritStone spiritStoneCap prestige prestigeCap veinLevel shopLevel viceLeaderCount viceLeaderLimit elderCount elderLimit memberCount memberCapacity'
        ),
        leader: object({ userId: integer, name: text }, ['name']),
        ...fields(text, 'minRealmName notice'),
        titles: list(text),
        shopAutoRefresh: object({ enabled: boolean, hours: list(number) })
      },
      ['veinLevel', 'shopLevel', 'minRealmName', 'notice']
    ),
    unlockLevels: object(fields(integer, 'shop viceLeader elder'), ['shop', 'viceLeader', 'elder']),
    pendingApplications: integer,
    storyline: object({ ...fields(boolean, 'initialized allCleared'), stageIndex: integer }, ['stageIndex'])
  },
  ['membership', 'guild']
);

function parseGuildHomeExpose(data: unknown) {
  const result = parseGuildHome(data);
  const access = (data as { access: { canCreateGuild?: unknown; features?: unknown } }).access;
  const features = access.features === undefined ? undefined : Object.entries(parseFeatureAccess(access.features)).map(([key, value]) => ({ key, ...value }));

  return { ...result, access: { ...result.access, canCreateGuild: access.canCreateGuild === undefined ? undefined : result.access.canCreateGuild, features } };
}

export const guildInformationActions = {
  get_my_guild: observation(
    '查询本人宗门主页：是否入宗、职位、宗门资源、成员容量、待处理申请、宗门主线进度及服务端提供的境界开放条件；未入宗时返回申请和创建资格。',
    'guild.home',
    empty,
    guildHome,
    () => '/我的宗门',
    parseGuildHomeExpose
  ),
  execute_task_guild_home: mutation<{ taskInput: string; intentId?: string }>(
    '执行连锁任务中的我的宗门或查看势力步骤；先推进任务再查询宗门主页，分别检查任务和业务回执。同消息新操作使用新 intentId，同次重试沿用原编号。',
    'guild.home',
    object({ taskInput: taskInputSchema, intentId: intentIdSchema }, ['intentId']),
    guildHome,
    input => `/${input.taskInput.trim().replace(/^[!！/#＃]\s*/, '')}`,
    parseGuildHomeExpose,
    () => ({}),
    input => {
      validateIntentId(input.intentId);
      if (!/^(?:我的宗门|查看势力)(?:\s+(?:活动|资料|管理))?$/u.test(input.taskInput.trim().replace(/^[!！/#＃]\s*/, ''))) {
        throw new ExposeError('INVALID_INPUT', '任务步骤不是宗门主页指令');
      }
    },
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  rename_guild: mutation<{ name: string }>(
    '修改当前宗门名称，会消耗更名卡；服务端校验宗主权限、名称和库存，返回实际名称。',
    'guild.rename',
    object({ name: { type: 'string', minLength: 1, maxLength: 100 } }),
    object({ outcome: text, guildName: text, message: text }, ['guildName']),
    input => `/宗门改名 ${input.name}`,
    data => {
      const parsed = parseRobotGuildSetting(data, 'rename');

      if (parsed.outcome !== 'result') {
        throw new Error('宗门改名回执不完整');
      }
      const receipt = parseGuildRename((data as { receipt: unknown }).receipt);

      return { ...receipt, message: parsed.message };
    }
  ),
  set_guild_min_realm: mutation<{ searchTerm: string }>(
    '设置入宗最低境界；传境界名称或“无”取消。服务端按名称匹配，实际结果和匹配境界以回执为准。',
    'guild.min-realm',
    object({ searchTerm: { type: 'string', minLength: 1, maxLength: 100 } }),
    object({ outcome: text, cleared: boolean, minRealmId: integer, realmName: text, matchedRealmName: text, message: text }, [
      'minRealmId',
      'realmName',
      'matchedRealmName'
    ]),
    input => `/设置申请宗门最低境界 ${input.searchTerm}`,
    data => {
      const parsed = parseRobotGuildSetting(data, 'min-realm');

      if (parsed.outcome !== 'result') {
        throw new Error('宗门境界设置回执不完整');
      }
      const receipt = parseGuildWorkflow({ action: 'min_realm', searchTerm: '' }, 0, (data as { receipt: unknown }).receipt);

      if (receipt.outcome !== 'updated') {
        throw new Error('宗门境界设置回执不完整');
      }

      return { ...receipt, cleared: receipt.minRealmId === null, message: parsed.message };
    }
  ),
  create_guild: mutation<{ name: string }>(
    '创建指定名称的宗门，消耗由服务端规定的资源；服务端校验名称、境界、余额和当前宗门状态。',
    'guild.create',
    object({ name: { type: 'string', minLength: 1, maxLength: 100 } }),
    object({ guildId: integer, name: text }),
    input => `/创建宗门 ${input.name}`,
    (data, input) => {
      if (!data || typeof data !== 'object' || (data as { outcome?: unknown }).outcome !== 'result') {
        throw new Error('创建宗门回执不完整');
      }
      const result = parseGuildCreate((data as { receipt: unknown }).receipt);

      if (result.name !== input.name.trim()) {
        throw new Error('创建宗门名称不匹配');
      }

      return result;
    }
  ),
  get_guild_notice: observation('查询当前宗门公告。', 'guild.notice', empty, content, () => '/宗门公告', parseRobotGuildContent),
  get_guild_intro: observation('查询当前宗门简介。', 'guild.intro', empty, content, () => '/宗门简介', parseRobotGuildContent),
  get_guild_logs: observation<{ page?: number }>(
    '分页查询本人所属宗门日志，服务端校验成员身份。',
    'guild.logs',
    object({ page }, ['page']),
    object({
      hasGuild: boolean,
      guildName: text,
      ...fields(integer, 'total page totalPages'),
      logs: list(object({ id: integer, content: text, formattedTime: text }))
    }),
    input => `/宗门日志 ${input.page ?? 1}`,
    parseGuildLogs,
    input => ({ page: input.page ?? 1 })
  )
};
