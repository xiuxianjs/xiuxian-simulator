import { ExposeError } from 'alemonjs';
import { parseRobotGuildEssences } from '../api/bot/guild-content-robot-query';
import { parseRobotGuildContentAction, type GuildContentAction } from '../api/bot/guild-content-action-robot-query';
import { intentIdSchema, mutation, observation, validateIntentId } from './mutation';
import { boolean, fields, integer, list, object, page, text } from './schema';

const result = object({ outcome: text, message: text, essenceId: integer }, ['essenceId']);

function textAction(action: 'intro-set' | 'notice-set' | 'essence-add', command: string, limit: number, description: string) {
  return mutation<{ content: string; intentId?: string }>(
    `${description} 同消息新操作使用新 intentId，同次重试沿用原编号。`,
    `guild.${action}`,
    object({ content: { type: 'string', minLength: 1, maxLength: limit }, intentId: intentIdSchema }, ['intentId']),
    result,
    input => `/${command} ${input.content}`,
    data => {
      const parsed = parseRobotGuildContentAction(data, action);

      if (parsed.outcome !== 'result') {
        throw new Error('宗门内容操作回执不完整');
      }
      if (action !== 'essence-add') {
        return parsed;
      }
      const row = (data as { receipt: { id: number } }).receipt;

      if (!Number.isSafeInteger(row.id) || row.id <= 0) {
        throw new Error('宗门精华编号无效');
      }

      return { ...parsed, essenceId: row.id };
    },
    input => ({ content: input.content }),
    input => {
      validateIntentId(input.intentId);
      if (input.content !== input.content.trim() || !input.content || input.content.length > limit || /[\r\n]/.test(input.content)) {
        throw new ExposeError('INVALID_INPUT', `内容须为单行、去除首尾空格且不超过${limit}个 UTF-16 代码单元`);
      }
    },
    { intentId: input => input.intentId }
  );
}
export const guildContentActions = {
  get_guild_essences: observation<{ page?: number }>(
    '分页查询本宗门精华内容及编号，服务端校验成员身份。',
    'guild.essences',
    object({ page }, ['page']),
    object(
      {
        success: boolean,
        guildName: text,
        ...fields(integer, 'total currentPage totalPages'),
        essences: list(object({ id: integer, content: text, creatorName: text, createdAt: text }, ['createdAt']))
      },
      ['guildName']
    ),
    input => `/宗门精华 ${input.page ?? 1}`,
    parseRobotGuildEssences,
    input => ({ page: input.page ?? 1 })
  ),
  set_guild_intro: textAction('intro-set', '设置宗门简介', 30, '设置宗门简介，服务端检查宗门职位及内容。'),
  set_guild_notice: textAction('notice-set', '设置宗门公告', 50, '设置宗门公告，服务端检查宗门职位及内容。'),
  add_guild_essence: textAction('essence-add', '添加精华', 50, '添加宗门精华，服务端检查权限和数量上限，返回新精华编号。'),
  remove_guild_essence: mutation<{ essenceId: number; intentId?: string }>(
    '删除指定宗门精华，服务端检查宗门归属和管理权限；同消息新操作使用新 intentId，同次重试沿用原编号。',
    'guild.essence-remove',
    object({ essenceId: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER }, intentId: intentIdSchema }, ['intentId']),
    result,
    input => `/移除精华 ${input.essenceId}`,
    data => {
      const parsed = parseRobotGuildContentAction(data, 'essence-remove' satisfies GuildContentAction);

      if (parsed.outcome !== 'result') {
        throw new Error('宗门精华删除回执不完整');
      }

      return parsed;
    },
    input => ({ essenceId: input.essenceId }),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId }
  )
};
