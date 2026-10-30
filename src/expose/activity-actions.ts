import { parseRobotActivityHub } from '../api/bot/activity-hub';
import { ExposeError } from 'alemonjs';
import { intentIdSchema, mutation, observation, taskInputSchema, validateIntentId } from './mutation';
import { boolean, number, object, text } from './schema';

const activityHub = object(
  {
    limitedEvent: object({ activeCount: number }),
    guildCompetition: object({ phase: text }),
    guildSecretRealmWar: object(
      {
        phase: text,
        activeStartAt: text,
        activeEndAt: text,
        maxAttackPerWeek: number,
        remainingAttackCount: number,
        guild: object({ name: text, outputBonusPct: number, occupation: object({ source: text, top: number, high: number, low: number, total: number }) }, [
          'occupation'
        ])
      },
      ['guild']
    ),
    access: object({ hasGuild: boolean, canAccessOverseasIsland: boolean }),
    overseasIsland: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'UNKNOWN'] },
    overseasIslandRequiredRealm: text,
    newcomerVisible: boolean,
    giftCodesVisible: boolean
  },
  ['overseasIsland', 'overseasIslandRequiredRealm']
);

export const activityActions = {
  get_activity_hub: observation(
    '查询活动中心中的限时活动数量、宗门活动阶段、灵脉攻防状态与入口可见性；可见不代表具备参与资格。',
    'activity.hub',
    object({}),
    activityHub,
    () => '/个人活动',
    parseRobotActivityHub
  ),
  execute_task_activity_hub: mutation<{ taskInput: string; intentId?: string }>(
    '执行连锁任务中的活动中心查看步骤；返回活动状态和任务推进回执，入口可见不代表满足参与资格。新操作使用新 intentId，同次重试沿用原编号。',
    'activity.hub',
    object({ taskInput: taskInputSchema, intentId: intentIdSchema }, ['intentId']),
    activityHub,
    input => `/${input.taskInput.trim().replace(/^[!！/#＃]\s*/, '')}`,
    parseRobotActivityHub,
    () => ({}),
    input => {
      validateIntentId(input.intentId);
      if (!/^(?:个人活动|我的活动|活动大厅|宗门活动)$/u.test(input.taskInput.trim().replace(/^[!！/#＃]\s*/, ''))) {
        throw new ExposeError('INVALID_INPUT', '任务步骤不是活动中心指令');
      }
    },
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  )
};
