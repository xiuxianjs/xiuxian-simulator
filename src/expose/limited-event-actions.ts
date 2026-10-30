import { parseBackendEventOverview } from '../api/bot/event-overview-queries';
import { parseBackendEventTasks } from '../api/bot/event-tasks-queries';
import { parseBackendEventTokens } from '../api/bot/event-tokens-queries';
import { parseBackendLimitedEventTask } from '../api/bot/limited-event-actions';
import { intentIdSchema, mutation, observation, taskInputSchema, validateIntentId } from './mutation';
import { boolean, fields, integer, list, number, object, text } from './schema';

const empty = object({});
const rewardFields = object(
  {
    ...fields(
      integer,
      'rewardSpiritStone rewardSpiritCrystal rewardSpiritMilk rewardCheckInCoin rewardTowerScore rewardReputation rewardTongxin rewardPaidToken rewardFreeToken'
    ),
    ...fields(text, 'rewardItemsJson rewardEquipmentsJson rewardSkillsJson rewardRecipesJson rewardSoulArtifactsJson rewardTitlesJson')
  },
  ['rewardItemsJson', 'rewardEquipmentsJson', 'rewardSkillsJson', 'rewardRecipesJson', 'rewardSoulArtifactsJson', 'rewardTitlesJson']
);

export const limitedEventActions = {
  get_limited_events: observation(
    '查询当前限时活动、时间、子活动状态和本人活动代币；活动实际开放由服务端决定。',
    'limited-event.overview',
    empty,
    object({
      events: list(
        object({
          ...fields(number, 'eventId paidToken freeToken'),
          ...fields(text, 'eventTitle description startTime endTime paidTokenName freeTokenName'),
          subActivities: list(object({ ...fields(text, 'subTitle startTime endTime'), isActive: boolean }))
        })
      )
    }),
    () => '/限时活动',
    data => ({ events: parseBackendEventOverview(data) })
  ),
  execute_task_limited_events: mutation<{ taskInput: string; intentId?: string }>(
    '查询当前限时活动、时间、子活动状态和本人活动代币；活动实际开放由服务端决定。',
    'limited-event.overview',
    object({ taskInput: taskInputSchema, intentId: intentIdSchema }, ['intentId']),
    object({
      events: list(
        object({
          ...fields(number, 'eventId paidToken freeToken'),
          ...fields(text, 'eventTitle description startTime endTime paidTokenName freeTokenName'),
          subActivities: list(object({ ...fields(text, 'subTitle startTime endTime'), isActive: boolean }))
        })
      )
    }),
    () => '/限时活动',
    data => ({ events: parseBackendEventOverview(data) }),
    () => ({}),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  get_limited_event_tasks: observation(
    '查询限时活动任务进度、可领取状态和奖励字段；完成不等于已经领取。',
    'limited-event.tasks',
    empty,
    object({
      groups: list(
        object({
          ...fields(text, 'eventTitle subTitle paidTokenName freeTokenName'),
          tasks: list(
            object({
              ...fields(number, 'taskId targetValue currentValue'),
              ...fields(text, 'taskName taskDescription'),
              ...fields(boolean, 'completed claimed canClaim'),
              rewardTextParts: list(text),
              rewardFields
            })
          )
        })
      )
    }),
    () => '/活动任务',
    data => ({ groups: parseBackendEventTasks(data) })
  ),
  execute_task_limited_event_tasks: mutation<{ taskInput: string; intentId?: string }>(
    '查询限时活动任务进度、可领取状态和奖励字段；完成不等于已经领取。',
    'limited-event.tasks',
    object({ taskInput: taskInputSchema, intentId: intentIdSchema }, ['intentId']),
    object({
      groups: list(
        object({
          ...fields(text, 'eventTitle subTitle paidTokenName freeTokenName'),
          tasks: list(
            object({
              ...fields(number, 'taskId targetValue currentValue'),
              ...fields(text, 'taskName taskDescription'),
              ...fields(boolean, 'completed claimed canClaim'),
              rewardTextParts: list(text),
              rewardFields
            })
          )
        })
      )
    }),
    () => '/活动任务',
    data => ({ groups: parseBackendEventTasks(data) }),
    () => ({}),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  get_limited_event_tokens: observation(
    '查询本人当前各限时活动的免费和付费代币余额。',
    'limited-event.tokens',
    empty,
    object({ events: list(object({ ...fields(number, 'eventId paidToken freeToken'), ...fields(text, 'eventTitle paidTokenName freeTokenName') })) }),
    () => '/活动道具',
    data => ({ events: parseBackendEventTokens(data) })
  ),
  claim_limited_event_task: mutation<{ taskId: number; intentId?: string; taskInput?: string }>(
    '领取指定活动任务奖励；服务端校验活动周期和任务进度，返回实际发放明细。',
    'limited-event.task-claim',
    object({ taskId: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER }, intentId: intentIdSchema, taskInput: taskInputSchema }, [
      'intentId',
      'taskInput'
    ]),
    object({ taskId: integer, eventTitle: text, taskName: text, issued: list(object({ type: text, name: text, amount: integer })) }),
    input => `/活动任务领取 ${input.taskId}`,
    (data, input) => {
      const result = parseBackendLimitedEventTask(data);

      if (result.taskId !== input.taskId) {
        throw new Error('活动任务领取回执不匹配');
      }

      return result;
    },
    input => ({ input: `/活动任务领取 ${input.taskId}` }),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  )
};
