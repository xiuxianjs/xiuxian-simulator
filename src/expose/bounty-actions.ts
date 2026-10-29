import { parseBackendBountyAccept, parseRobotBountyChallenge, parseRobotBountyClaim, parseRobotBountyPublish } from '../api/bot/bounty-actions';
import { parseRobotBountyList } from '../api/bot/bounty-queries';
import { mutation, observation } from './mutation';
import { boolean, fields, integer, list, number, object, page, text } from './schema';

const id = { type: 'integer' as const, minimum: 1, maximum: Number.MAX_SAFE_INTEGER };
const unit = object({ name: text, hp: integer, maxHp: integer, isDead: boolean });
const battleState = object({ sideA: list(unit), sideB: list(unit) });
const policy = object(fields(integer, 'maxAmount minPerPerson minCompletions maxCompletions defaultCompletions feePercent validHours'));

export const bountyActions = {
  get_bounties: observation<{ page?: number }>(
    '分页查询悬赏榜目标、赏金、名额和截止时间；名额和资格可能随时变化。',
    'bounty.list',
    object({ page }, ['page']),
    object({
      ...fields(integer, 'total page totalPages'),
      list: list(
        object({
          ...fields(integer, 'id targetUid rewardPerCompletion maxCompletions completedCount remainingSlots hoursLeft'),
          ...fields(text, 'publisherName targetName expiresAt')
        })
      )
    }),
    input => `/悬赏榜 ${input.page ?? 1}`,
    data => {
      const result = parseRobotBountyList(data);

      return { ...result, list: result.list.map(row => ({ ...row, expiresAt: row.expiresAt.toISOString() })) };
    },
    input => ({ page: String(input.page ?? 1) })
  ),
  get_bounty_publish_policy: observation(
    '查询服务端悬赏金额、人数、手续费和有效期规则，不发布悬赏。',
    'bounty.publish',
    object({}),
    object({ policy }),
    () => '/悬赏',
    data => {
      const result = parseRobotBountyPublish(data);

      if (result.outcome !== 'policy') {
        throw new Error('悬赏规则回执不匹配');
      }

      return { policy: result.policy };
    },
    () => ({ mode: 'usage' })
  ),
  publish_bounty: mutation<{ targetUid: number; amount: number; maxCompletions?: number }>(
    '发布针对指定玩家的悬赏，服务端校验金额与人数并扣款；须先核对发布规则，回执包含费用和奖励池。',
    'bounty.publish',
    object({ targetUid: id, amount: id, maxCompletions: id }, ['maxCompletions']),
    object({ ...fields(integer, 'bountyId totalCost fee rewardPool rewardPerPerson maxCompletions validHours'), targetName: text }),
    input => `/悬赏 ${input.targetUid} ${input.amount}${input.maxCompletions === undefined ? '' : ` ${input.maxCompletions}`}`,
    data => {
      const result = parseRobotBountyPublish(data);

      if (result.outcome !== 'published') {
        throw new Error('悬赏发布回执不匹配');
      }

      return result.data;
    },
    input => ({
      mode: 'publish',
      target: { uid: input.targetUid },
      amount: String(input.amount),
      ...(input.maxCompletions === undefined ? {} : { maxCompletions: String(input.maxCompletions) })
    })
  ),
  accept_bounty: mutation<{ bountyId: number }>(
    '接赏并执行服务端战斗；战斗胜利但没有 completionId 时可能名额已满，不代表有待领赏金。结果不自动领取赏金。',
    'bounty.accept',
    object({ bountyId: id }),
    object(
      {
        battleWon: boolean,
        ...fields(integer, 'completionId bountyReward stoneReward crystalReward expReward streak qiCost remainingCount dailyAcceptLimit'),
        ...fields(number, 'streakBonus shaQiBonus'),
        ...fields(text, 'logId bonusText losingStreakText targetName'),
        droppedItem: object({ ...fields(text, 'category name'), quantity: integer }),
        battleResult: object({ totalRounds: integer, finalState: battleState })
      },
      ['completionId', 'bountyReward', 'stoneReward', 'crystalReward', 'logId', 'droppedItem']
    ),
    input => `/接赏 ${input.bountyId}`,
    parseBackendBountyAccept,
    input => ({ bountyId: String(input.bountyId) })
  ),
  continue_bounty_battle: mutation<{ bountyId: number }>(
    '对已有接赏记录继续发起一次新战斗；服务端校验记录和次数，不会自动替用户新接悬赏。',
    'bounty.accept',
    object({ bountyId: id }),
    object(
      {
        won: boolean,
        ...fields(integer, 'experienceGained rewardAmount qiCost remainingCount dailyAcceptLimit'),
        logId: text,
        battle: object({ rounds: integer, sideA: list(unit), sideB: list(unit) })
      },
      ['logId']
    ),
    input => `/继续接赏 ${input.bountyId}`,
    parseRobotBountyChallenge,
    input => ({ bountyId: String(input.bountyId), continueBattle: true })
  ),
  get_pending_bounty_rewards: observation(
    '查询本人已完成但尚未领取的赏金。',
    'bounty.claim',
    object({}),
    object({ pending: list(object({ bountyId: integer, targetName: text, rewardAmount: integer })) }),
    () => '/领赏',
    data => {
      const result = parseRobotBountyClaim(data);

      if (result.outcome !== 'list') {
        throw new Error('待领赏金回执不匹配');
      }

      return { pending: result.pending };
    },
    () => ({ mode: 'list', bountyId: null })
  ),
  claim_bounty_reward: mutation<{ bountyId: number }>(
    '领取本人指定悬赏的待领赏金，服务端校验记录归属与领取状态；重复请求不能重复发奖。',
    'bounty.claim',
    object({ bountyId: id }),
    object({ rewardAmount: integer }),
    input => `/领赏 ${input.bountyId}`,
    data => {
      const result = parseRobotBountyClaim(data);

      if (result.outcome !== 'claimed') {
        throw new Error('领赏回执不匹配');
      }

      return { rewardAmount: result.rewardAmount };
    },
    input => ({ mode: 'claim', bountyId: String(input.bountyId) })
  )
};
