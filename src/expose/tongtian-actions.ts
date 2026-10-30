import { parseRobotTowerOverview } from '../api/bot/ranking-robot-query';
import { parseTongtianBatch, parseTongtianChallenge, parseTongtianSweep } from '../api/bot/tongtian-tower';
import { parseTowerFirstRewards, parseTowerMonthlyRewards } from '../api/bot/tower-rewards-queries';
import { parseTowerRewardClaim } from '../api/bot/tower-reward-claims';
import { intentIdSchema, mutation, observation, taskInputSchema, validateIntentId } from './mutation';
import { boolean, fields, integer, list, object, text } from './schema';

const rank = { type: 'integer' as const, minimum: 1, maximum: 1999 };
const entry = object({ ...fields(integer, 'rank power'), ...fields(text, 'id name'), ...fields(boolean, 'isFake isMe') });
const view = object(
  {
    isOpen: boolean,
    message: text,
    ...fields(integer, 'myRank challengeCost'),
    ...fields(text, 'challengeTip rewardTip'),
    top3: list(entry),
    nearby: list(entry),
    sweepTargets: list(entry)
  },
  ['message']
);
const unit = object({ name: text, ...fields(integer, 'hp maxHp'), isDead: boolean });
const challenge = object(
  {
    logId: text,
    ...fields(boolean, 'success rankImproved'),
    ...fields(text, 'message experienceBonusText'),
    ...fields(integer, 'oldRank newRank experienceGained baseExperience reputationGained'),
    battle: object({ winner: { type: 'string', enum: ['A', 'B', 'draw'] }, rounds: integer, sideA: list(unit), sideB: list(unit) })
  },
  ['logId']
);
const rewardAccess = {
  ...fields(boolean, 'canUseFifthLayerFeature isOpen hasClaimableReward'),
  realmName: text,
  ...fields(integer, 'openStartDay openEndDay maxRank')
};
const claim = object({ outcome: { type: 'string', enum: ['single', 'batch'] }, ...fields(integer, 'ranking claimedCount'), rewardTexts: list(text) }, [
  'ranking',
  'claimedCount'
]);

function claimData(value: unknown, batch: boolean, monthly: boolean, expectedRanking?: number) {
  const row = value as Record<string, unknown> | null;

  if (row?.outcome !== (batch ? 'batch' : 'single')) {
    throw new Error('通天塔领奖回执类型不匹配');
  }
  const result = parseTowerRewardClaim(value, monthly || batch ? 'claimedCount' : 'ranking');

  if (expectedRanking !== undefined && result.ranking !== expectedRanking) {
    throw new Error('通天塔领奖排名与请求不匹配');
  }

  return { ...result, outcome: row.outcome };
}
export const tongtianActions = {
  get_tongtian_tower: observation(
    '查询通天塔开放状态、本人排名、榜单附近玩家、挑战成本与可扫荡目标；查询可能按服务端规则初始化排名，不挑战、不领取。',
    'ranking.overview',
    object({}),
    object({ view, tianjiaoVisible: boolean }),
    () => '/通天塔',
    data => {
      const result = parseRobotTowerOverview(data);

      return { view: result.data, tianjiaoVisible: result.tianjiaoVisible };
    }
  ),
  execute_task_tongtian_tower: mutation<{ taskInput: string; intentId?: string }>(
    '查询通天塔开放状态、本人排名、榜单附近玩家、挑战成本与可扫荡目标；查询可能按服务端规则初始化排名，不挑战、不领取。',
    'ranking.overview',
    object({ taskInput: taskInputSchema, intentId: intentIdSchema }, ['intentId']),
    object({ view, tianjiaoVisible: boolean }),
    () => '/通天塔',
    data => {
      const result = parseRobotTowerOverview(data);

      return { view: result.data, tianjiaoVisible: result.tianjiaoVisible };
    },
    () => ({}),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  challenge_tongtian_rank: mutation<{ targetRank: number; intentId?: string; taskInput?: string }>(
    '挑战执行时指定通天塔排名；检查战斗胜负和实际排名，排名对应人物可能变化。同消息新挑战使用新 intentId，同次重试沿用原编号。',
    'ranking.challenge',
    object({ targetRank: rank, intentId: intentIdSchema, taskInput: taskInputSchema }, ['intentId', 'taskInput']),
    challenge,
    input => `/挑战排名 ${input.targetRank}`,
    parseTongtianChallenge,
    input => ({ rankArg: String(input.targetRank) }),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  batch_challenge_tongtian: mutation<{ intentId?: string; taskInput?: string }>(
    '按服务端规则连续挑战通天塔并消耗灵气；检查 events、收益和 stopReason，可能提前停止。同消息新批次使用新 intentId，同次重试沿用原编号。',
    'ranking.batch-challenge',
    object({ intentId: intentIdSchema, taskInput: taskInputSchema }, ['intentId', 'taskInput']),
    object(
      {
        ...fields(integer, 'startRank finalRank winCount lossCount experienceGained reputationGained'),
        experienceBonusText: text,
        stopReason: text,
        rounds: list(challenge),
        events: list(
          object({ ...fields(integer, 'index targetRank'), ...fields(text, 'outcome message displayText logId'), needPotion: boolean, challenge }, [
            'targetRank',
            'logId',
            'challenge'
          ])
        )
      },
      ['stopReason']
    ),
    () => '/连续爬塔',
    parseTongtianBatch,
    () => ({}),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  sweep_tongtian_rank: mutation<{ targetRank: number; count: number; intentId?: string; taskInput?: string }>(
    '扫荡低于本人排名的通天塔目标，count 为1..10；按实际次数和消耗结算。同消息新扫荡使用新 intentId，同次重试沿用原编号。',
    'ranking.sweep',
    object(
      {
        targetRank: { type: 'integer', minimum: 1, maximum: 1999 },
        count: { type: 'integer', minimum: 1, maximum: 10 },
        intentId: intentIdSchema,
        taskInput: taskInputSchema
      },
      ['intentId', 'taskInput']
    ),
    object({ ...fields(integer, 'targetRank sweepCount qiSpent experienceGained baseExperience reputationGained'), experienceBonusText: text }),
    input => `/扫荡排名 ${input.targetRank} ${input.count}`,
    (data, input) => {
      const row = data as { outcome?: unknown; data?: unknown } | null;

      if (row?.outcome !== 'sweep') {
        throw new Error('通天塔扫荡未返回结算');
      }
      const result = parseTongtianSweep(row.data);

      if (result.targetRank !== input.targetRank || result.sweepCount > input.count) {
        throw new Error('通天塔扫荡回执与请求不匹配');
      }

      return result;
    },
    input => ({ rankArg: String(input.targetRank), countArg: String(input.count) }),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  get_tongtian_first_rewards: observation(
    '查询通天塔首通档位、已领与可领状态，保留服务端开放条件；查询不领取奖励。',
    'ranking.first-rewards',
    object({}),
    object(
      {
        ...rewardAccess,
        userRank: integer,
        rewards: list(
          object({ ranking: integer, state: { type: 'string', enum: ['CLAIMED', 'CLAIMABLE', 'REACHABLE', 'LOCKED'] }, description: text }, ['description'])
        )
      },
      ['realmName']
    ),
    () => '/首通排名奖励',
    parseTowerFirstRewards
  ),
  get_tongtian_monthly_rewards: observation(
    '查询通天塔月度档位、当前与最佳排名、领取记录及资格；档位配置不代表已经获得奖励。',
    'ranking.monthly-rewards',
    object({}),
    object(
      {
        ...rewardAccess,
        ...fields(integer, 'currentRank bestRank claimCount bestClaimRank'),
        claimStatus: { type: 'string', enum: ['AVAILABLE', 'NOT_RANKED', 'ALL_CLAIMED'] },
        rewards: list(
          object({ ...fields(integer, 'id rankingStart rankingEnd lingJing spiritStone'), state: { type: 'string', enum: ['CLAIMED', 'CLAIMABLE', 'LOCKED'] } })
        )
      },
      ['realmName', 'bestRank', 'bestClaimRank']
    ),
    () => '/月度排名奖励',
    parseTowerMonthlyRewards
  ),
  claim_tongtian_first_reward: mutation<{ ranking: number; intentId?: string; taskInput?: string }>(
    '领取指定通天塔首通排名档位；ranking 来自首通奖励列表，服务端检查资格和重复领取。',
    'ranking.claim-first',
    object({ ranking: { type: 'integer', minimum: 1, maximum: 1999 }, intentId: intentIdSchema, taskInput: taskInputSchema }, ['intentId', 'taskInput']),
    claim,
    input => `/领取首通奖励 ${input.ranking}`,
    (data, input) => claimData(data, false, false, input.ranking),
    input => ({ claimArg: String(input.ranking) }),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  claim_all_tongtian_first_rewards: mutation<{ intentId?: string; taskInput?: string }>(
    '领取服务端判定可领取的全部通天塔首通档位；以 claimedCount 和 rewardTexts 为准，不预估奖励。',
    'ranking.claim-first',
    object({ intentId: intentIdSchema, taskInput: taskInputSchema }, ['intentId', 'taskInput']),
    claim,
    () => '/领取首通奖励 全部',
    data => claimData(data, true, false),
    () => ({ claimArg: '全部' }),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  claim_tongtian_monthly_reward: mutation<{ rewardId: number; intentId?: string; taskInput?: string }>(
    '领取指定通天塔月度档位；rewardId 是月度奖励列表中的档位ID，不能传入排名代替。以回执为准。',
    'ranking.claim-monthly',
    object({ rewardId: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER }, intentId: intentIdSchema, taskInput: taskInputSchema }, [
      'intentId',
      'taskInput'
    ]),
    claim,
    input => `/领取月度奖励 ${input.rewardId}`,
    data => claimData(data, false, true),
    input => ({ claimArg: String(input.rewardId) }),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  claim_all_tongtian_monthly_rewards: mutation<{ intentId?: string; taskInput?: string }>(
    '领取服务端判定可领取的全部通天塔月度档位；保留原资格和幂等结算，以实际领取数和奖励文本为准。',
    'ranking.claim-monthly',
    object({ intentId: intentIdSchema, taskInput: taskInputSchema }, ['intentId', 'taskInput']),
    claim,
    () => '/领取月度奖励 全部',
    data => claimData(data, true, true),
    () => ({ claimArg: '全部' }),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  )
};
