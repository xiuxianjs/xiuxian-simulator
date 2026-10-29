import { parseNativeComebackClaim, parseNativeComebackOverview } from '../api/bot/native-comeback';
import { parseBackendWorldMilestoneView } from '../api/bot/world-milestone-queries';
import { parseBackendWorldMilestoneClaim } from '../api/bot/world-milestone-actions';
import { mutation, observation } from './mutation';
import { boolean, fields, integer, list, number, object, text } from './schema';

const empty = object({});

export const returnRewardsActions = {
  get_world_milestones: observation(
    '查询世界里程碑进度、奖励及本人未领取数量；空配置与零奖励不同。',
    'world-milestones.view',
    empty,
    object(
      {
        code: text,
        worldCountText: text,
        nextMilestoneCount: integer,
        nextMilestoneGapText: text,
        unclaimedCount: integer,
        milestones: list(object({ milestoneCount: integer, status: text, rewardText: text }))
      },
      ['worldCountText', 'nextMilestoneCount', 'nextMilestoneGapText', 'unclaimedCount', 'milestones']
    ),
    () => '/里程碑奖励',
    parseBackendWorldMilestoneView
  ),
  claim_world_milestones: mutation(
    '领取本人当前可领取的世界里程碑奖励；返回实际领取数量和发放明细。',
    'world-milestones.claim-all',
    empty,
    object({ count: integer, issued: list(object({ type: text, name: text, amount: integer })) }),
    () => '/里程碑奖励 领取',
    parseBackendWorldMilestoneClaim
  ),
  get_native_comeback: observation(
    '查询本服回归活动资格、期限、签到进度和奖励预览；预览不代表已领取。',
    'native-comeback.overview',
    empty,
    object(
      {
        enabled: boolean,
        rules: object(fields(number, 'smallSilentDays largeSilentDays expireDays')),
        current: object({
          ...fields(text, 'comebackTypeText remainingText'),
          ...fields(number, 'silentDays expBonusPercent'),
          signIn: object({
            currentDayIndex: number,
            canClaimToday: boolean,
            days: list(object({ dayIndex: number, statusText: text, rewardsPreviewText: text }))
          })
        })
      },
      ['current']
    ),
    () => '/回归奖励',
    parseNativeComebackOverview
  ),
  claim_native_comeback: mutation(
    '领取本人当天回归签到奖励；资格及奖励由服务端结算，返回实际提示和奖励摘要。',
    'native-comeback.claim',
    empty,
    object({ message: text, rewardSummary: list(text) }),
    () => '/回归签到',
    parseNativeComebackClaim
  )
};
