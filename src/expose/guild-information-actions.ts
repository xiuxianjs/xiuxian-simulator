import { parseGuildCreate } from '../api/bot/guild-membership-mutations';
import { parseRobotGuildContent } from '../api/bot/guild-content-robot-query';
import { parseGuildLogs } from '../api/bot/queries';
import { parseRobotGuildSetting } from '../api/bot/guild-settings-robot-query';
import { parseGuildRename } from '../api/bot/guild-rename';
import { parseGuildWorkflow } from '../api/bot/guild-workflow';
import { mutation, observation } from './mutation';
import { boolean, fields, integer, list, object, page, text } from './schema';

const empty = object({});
const content = object({ guildName: text, notice: text, intro: text }, ['notice', 'intro']);

export const guildInformationActions = {
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
