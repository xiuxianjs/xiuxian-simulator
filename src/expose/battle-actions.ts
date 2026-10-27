import { requestBackend } from '../api/bot/client';
import { parseReset, parseRobotDemonTowerBuff, parseSweep } from '../api/bot/demon-tower-actions';
import { parseRobotDemonTowerChallenge } from '../api/bot/demon-tower-challenge-robot-query';
import { parseDemonTowerInfo } from '../api/bot/demon-tower-info-query';
import { parseWorldBossChallenge } from '../api/bot/world-boss-challenge';
import { parseWorldBossClaimAll } from '../api/bot/world-boss-claim';
import { mutation } from './mutation';
import { query } from './query';
import { boolean, fields, integer, list, number, object, text } from './schema';

const empty = object({});
const buff = object(fields(text, 'key label cnKey'));
const starBuff = object({ ...fields(text, 'key label cnKey'), minStars: number });
const buffs = object(fields(number, 'hp atk critDmg'));
const milestone = object(fields(number, 'id stars score'));
const unit = object({ ...fields(text, 'id name'), ...fields(integer, 'hp maxHp position'), isDead: boolean });
const round = object(
  {
    ...fields(integer, 'damageDealt totalPlayerDamage attackCount remainingAttempts rank'),
    ...fields(text, 'logId stageName bossTitle bossName'),
    battle: object({
      winner: { type: 'string', enum: ['A', 'B', 'draw'] },
      totalRounds: integer,
      finalState: object({ sideA: list(unit), sideB: list(unit) })
    }),
    battleSummary: object(fields(integer, 'sideACount sideBCount totalDamageA totalDamageB totalHealsA totalHealsB'))
  },
  ['rank']
);
const batch = object(
  {
    stopReason: text,
    rounds: list(round),
    lastRound: round,
    ...fields(integer, 'attemptsUsed totalDamageDealt remainingAttempts'),
    ...fields(text, 'stageName bossTitle bossName')
  },
  ['stopReason']
);

function bossResult(value: unknown, all: boolean) {
  const row = value as Record<string, unknown>;

  if (row?.outcome !== 'result' || row.mode !== (all ? 'all' : 'single')) {
    throw new Error('凶兽挑战回执模式不匹配');
  }

  return parseWorldBossChallenge(row.data, all);
}
const availability = object({ available: boolean, reason: text });
const towerInfo = object(
  {
    access: object({ ok: boolean, realmName: text }),
    info: object({
      ...fields(boolean, 'hasStarted isFinished showChallengeButtons showSweepButton showResetButton'),
      ...fields(
        number,
        'currentLayer currentStage currentLayerStars cumulativeStars totalScore totalSpiritStone sweepableLayers userPower targetLayer maxRecordedLayer totalBestStars fullStarLayers recordedLayers pendingBuffSelections towerScore'
      ),
      ...fields(text, 'sweepableLayersText buffText conditionLabel'),
      monsterPower: object(fields(number, 'star1 star2 star3')),
      buffs,
      bestStarsByLayer: list(object(fields(number, 'layer stars'))),
      milestones: object({ ...fields(number, 'claimedCount totalCount'), next: object(fields(number, 'stars score')) }, ['next']),
      challenge: availability,
      sweep: availability,
      reset: availability,
      buffSelection: availability,
      availableBuffs: list(starBuff)
    })
  },
  ['info']
);

export const battleActions = {
  challenge_world_boss: mutation(
    '挑战一次世界凶兽，消耗一次可用挑战次数并结算伤害。返回实际战斗结果、累计伤害、剩余次数和战斗记录编号。',
    'world-boss.challenge',
    empty,
    round,
    () => '/挑战凶兽',
    data => bossResult(data, false),
    () => ({ mode: 'single' })
  ),
  challenge_world_boss_all: mutation(
    '连续使用世界凶兽剩余挑战次数；可能部分完成后停止。检查 rounds、attemptsUsed、remainingAttempts 和 stopReason，不自动重新挑战。',
    'world-boss.challenge',
    empty,
    batch,
    () => '/挑战凶兽 全部',
    data => bossResult(data, true),
    () => ({ mode: 'all' })
  ),
  claim_world_boss_rewards: mutation(
    '领取当前角色所有可领取的世界凶兽奖励，返回实际领取条目及灵石、灵晶合计。',
    'world-boss.reward-claim',
    empty,
    object({
      items: list(object({ ...fields(text, 'bossDate stageName tierName'), ...fields(integer, 'stageLevel spiritStone spiritCrystal playerDamage') })),
      totalStone: integer,
      totalCrystal: integer
    }),
    () => '/领取凶兽奖励',
    parseWorldBossClaimAll
  ),
  get_demon_tower: query(
    '查询镇妖塔当前进度、历史星数、战力、加成及挑战/扫荡/重置资格；服务端可能初始化状态。每次调用重新读取状态。',
    towerInfo,
    async ({ bid, uid, request }) => parseDemonTowerInfo(await requestBackend(bid, 'get_players_id_tower', { path: { id: uid }, ...request }))
  ),
  challenge_demon_tower: mutation<{ stars: number }>(
    '按指定 1..3 星难度挑战当前妖塔层；服务端结算胜负和奖励，检查 result.success、layerCleared、needSelectBuff，返回 logId 时可查战斗回忆。',
    'demon-tower.challenge',
    object({ stars: { type: 'integer', minimum: 1, maximum: 3 } }),
    object(
      {
        logId: text,
        ...fields(boolean, 'success layerCleared allCleared needSelectBuff'),
        ...fields(number, 'starsEarned scoreEarned totalTowerScore spiritStoneEarned nextLayer nextStage cumulativeStars battleRounds'),
        condition: { type: 'string', enum: ['ROUND_LIMIT', 'HP_THRESHOLD', 'NO_SKILLS'] },
        conditionLabel: text,
        battleWinner: { type: 'string', enum: ['A', 'B', 'draw', ''] },
        milestonesTriggered: list(milestone),
        availableBuffs: list(starBuff)
      },
      ['logId']
    ),
    input => `/妖塔挑战 ${input.stars}`,
    data => {
      const result = parseRobotDemonTowerChallenge(data);

      if (result.outcome !== 'result') {
        throw new Error('妖塔挑战未返回结算回执');
      }

      return result.data;
    }
  ),
  select_demon_tower_buff: mutation<{ buffKey: string; count: number }>(
    '使用妖塔可选加成次数，buffKey 使用 hp、atk 或 critDmg，数量由服务端校验。返回实际加成和剩余可选次数。',
    'demon-tower.buff',
    object({ buffKey: { type: 'string', enum: ['hp', 'atk', 'critDmg'] }, count: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER } }),
    object({ count: integer, buffApplied: text, newBuffs: buffs, remainingBuffSelections: integer, buffOptions: list(buff) }),
    input => `/妖塔选buff ${input.buffKey} ${input.count}`,
    data => {
      const result = parseRobotDemonTowerBuff(data);

      if (result.outcome !== 'result') {
        throw new Error('妖塔加成未返回结算回执');
      }

      return result.data;
    },
    input => ({ selection: { buffKey: input.buffKey, count: input.count } })
  ),
  sweep_demon_tower: mutation(
    '扫荡服务端允许的妖塔层数并结算奖励，返回实际层数、积分、灵石和待选择加成。',
    'demon-tower.sweep',
    empty,
    object({
      ...fields(integer, 'layersSwept totalSpiritStone totalScore cumulativeStars nextLayer buffsToSelect'),
      milestonesTriggered: list(milestone),
      availableBuffs: list(buff)
    }),
    () => '/妖塔扫荡',
    parseSweep
  ),
  reset_demon_tower: mutation(
    '重置当前妖塔进度，消耗重列旗及服务端规定的重置次数；操作前查询妖塔状态和资格。',
    'demon-tower.reset',
    empty,
    object({ success: boolean, message: text, resetsUsed: integer, maxResets: integer }),
    () => '/妖塔重置',
    parseReset
  )
};
