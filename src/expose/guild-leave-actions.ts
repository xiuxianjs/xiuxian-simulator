import { parseRobotGuildLeave, parseRobotGuildLeaderLeave } from '../api/bot/guild-leave-robot-query';
import { parseGuildLeaveCancel } from '../api/bot/guild-leave-confirmation-cancel';
import { mutation } from './mutation';
import { boolean, fields, integer, object, text } from './schema';

const empty = object({});
const membership = object(
  { ...fields(text, 'outcome message guildName targetName roleName'), ...fields(integer, 'guildId targetUserId cooldownHours'), confirmationRequired: boolean },
  ['targetUserId', 'targetName', 'roleName', 'cooldownHours']
);

function leave(data: unknown) {
  const result = parseRobotGuildLeave(data);
  const cooldown = (data as Record<string, unknown>).cooldownHours;

  if (cooldown !== undefined && (!Number.isSafeInteger(cooldown) || Number(cooldown) < 0)) {
    throw new Error('退出宗门冷却信息无效');
  }

  return result;
}

export const guildLeaveActions = {
  request_or_confirm_guild_leave: mutation(
    '请求或确认退出宗门：若已有有效待确认请求，本次会直接退出；否则创建 60 秒确认。确认必须来自用户新的明确请求，服务端按当前待确认状态执行。',
    'guild.leave',
    empty,
    membership,
    () => '/退出宗门',
    leave
  ),
  cancel_guild_leave: mutation(
    '取消本人待确认的退出宗门请求；deleted 表示是否实际删除了待确认状态。',
    'guild.leave-cancel',
    empty,
    object({ deleted: boolean }),
    () => '/取消退出宗门',
    parseGuildLeaveCancel
  ),
  take_guild_leader_leave: mutation(
    '宗主申请请假，服务端校验宗主身份与当前请假状态，返回实际结果。',
    'guild.leader-leave',
    empty,
    object({ message: text, receipt: membership }),
    () => '/宗主请假',
    parseRobotGuildLeaderLeave
  )
};
