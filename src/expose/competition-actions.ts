import { parseCompetitionHome, parseCompetitionPromotionTeams, parseCompetitionBattleDetail } from '../api/bot/competition-read-projections';
import { parseBackendGuildCompetitionKnockoutCandidates } from '../api/bot/competition-knockout-candidates-query';
import { parseCompetitionBattles } from '../api/bot/competition-battle-queries';
import { parseCompetitionBets } from '../api/bot/competition-bets-query';
import { parseRobotCompetitionTeamAction } from '../api/bot/competition-team-robot-query';
import { parseRobotCompetitionMemberAdd } from '../api/bot/competition-member-add-robot-query';
import { parseRobotCompetitionChallenge } from '../api/bot/competition-challenge-robot-query';
import { parseRobotCompetitionReward } from '../api/bot/competition-reward-robot-query';
import { parseRobotCompetitionBet } from '../api/bot/competition-bets-robot-query';
import { intentIdSchema, mutation, observation, taskInputSchema, validateIntentId } from './mutation';
import { boolean, fields, integer, list, number, object, page, text } from './schema';

const empty = object({});
const id = { type: 'integer' as const, minimum: 1, maximum: Number.MAX_SAFE_INTEGER };
const position = { type: 'integer' as const, minimum: 1, maximum: 6 };
const slot = object({ ...fields(integer, 'position userId'), name: text });
const team = object({ ...fields(integer, 'id guildId rank status wins'), guildName: text });
const receipt = object({ outcome: text, message: text, receipt: object({ message: text }) });
const home = object(
  {
    hasGuild: boolean,
    ...fields(integer, 'signupGuildCount guildId guildLevel'),
    ...fields(text, 'guildName teamStatusName'),
    config: object(
      fields(text, 'registrationStartTime registrationEndTime knockoutStartTime knockoutEndTime promotionStartTime bettingEndTime settlementTime')
    ),
    view: object({
      phaseName: text,
      ...fields(boolean, 'showSignupCount canApply showRoster showResults showKnockout canChallenge showOdds showPromotionTeams')
    }),
    team: object({ id: integer }),
    roster: object({
      canAdd: boolean,
      canClear: boolean,
      slots: list(object({ ...fields(integer, 'position userId'), ...fields(text, 'name optionName'), ...fields(boolean, 'canMoveUp canMoveDown canRemove') }))
    }),
    knockoutInfo: object({ ...fields(integer, 'score remain rank'), diffToPrevText: text }),
    oddsInfo: object({ items: list(object({ guildId: integer, guildName: text, odds: number, action: text })) }),
    topTeams: list(team),
    previousSeason: object({ ...fields(text, 'competitionId message teamStatusName'), score: integer, slots: list(slot) })
  },
  ['team', 'roster', 'knockoutInfo', 'oddsInfo', 'previousSeason']
);
const battle = object(
  { ...fields(integer, 'id attackerTeamId defenderTeamId winnerTeamId opponentTeamId stage'), ...fields(text, 'battleTime opponentName'), isWin: boolean },
  ['opponentName']
);
const betReceipt = object({
  outcome: text,
  message: text,
  receipt: object({
    message: text,
    competitionId: text,
    guildId: integer,
    betAmount: integer,
    odds: number,
    currency: object({ code: text, ...fields(integer, 'beforeAmount changeAmount afterAmount'), detail: text })
  })
});

function decodeBet(data: unknown, input: { amount: number; guildId?: number }) {
  const parsed = parseRobotCompetitionBet(data);

  if (parsed.outcome !== 'result') {
    throw new Error('宗门大比押注回执不完整');
  }
  const row = data as { receipt: Record<string, unknown> };
  const receipt = row.receipt;
  const currency = receipt.currency as Record<string, unknown> | undefined;

  if (
    typeof receipt.competitionId !== 'string' ||
    !Number.isSafeInteger(receipt.guildId) ||
    !Number.isSafeInteger(receipt.betAmount) ||
    typeof receipt.odds !== 'number' ||
    !Number.isFinite(receipt.odds) ||
    !currency ||
    typeof currency.code !== 'string' ||
    !Number.isSafeInteger(currency.beforeAmount) ||
    !Number.isSafeInteger(currency.changeAmount) ||
    !Number.isSafeInteger(currency.afterAmount) ||
    typeof currency.detail !== 'string'
  ) {
    throw new Error('宗门大比押注结算回执不完整');
  }

  if (receipt.betAmount !== input.amount || (input.guildId !== undefined && receipt.guildId !== input.guildId)) {
    throw new Error('宗门大比押注回执与请求不匹配');
  }

  return { ...parsed, receipt: { ...receipt, message: parsed.receipt.message } };
}
const cleanHome = (data: unknown) => {
  const value = parseCompetitionHome(data);

  return { ...value, roster: value.roster ? { ...value.roster, slots: value.roster.slots.filter(item => item !== null) } : null };
};

export const competitionActions = {
  get_guild_competition: observation(
    '查询宗门大比赛程、队伍、可操作状态、排名与赔率；资格以服务端当前状态为准。',
    'competition.home',
    empty,
    home,
    () => '/宗门大比',
    cleanHome
  ),
  execute_task_guild_competition: mutation<{ taskInput: string; intentId?: string }>(
    '查询宗门大比赛程、队伍、可操作状态、排名与赔率；资格以服务端当前状态为准。',
    'competition.home',
    object({ taskInput: taskInputSchema, intentId: intentIdSchema }, ['intentId']),
    home,
    () => '/宗门大比',
    cleanHome,
    () => ({}),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  get_guild_competition_candidates: observation(
    '查询淘汰赛可挑战宗门及其站位、剩余次数；不会发起挑战。',
    'competition.candidates',
    empty,
    object({
      competitionId: text,
      score: integer,
      remaining: integer,
      candidates: list(object({ ...fields(integer, 'teamId guildId score'), guildName: text, slots: list(slot) }))
    }),
    () => '/可挑战宗门列表',
    data => {
      const result = parseBackendGuildCompetitionKnockoutCandidates(data);

      return { ...result, candidates: result.candidates.map(item => ({ ...item, slots: item.slots.filter(slot => slot !== null) })) };
    }
  ),
  get_guild_competition_promotion_teams: observation(
    '查询宗门大比晋级赛队伍及排名。',
    'competition.promotion-teams',
    empty,
    object({ teams: list(team) }),
    () => '/查看晋级赛队伍',
    parseCompetitionPromotionTeams
  ),
  get_guild_competition_bets: observation(
    '查询本人当期宗门大比押注与结算记录；readReady 为 false 时不表示没有历史下注。',
    'competition.bets',
    empty,
    object({
      anchorCompetitionId: text,
      materialized: boolean,
      readReady: boolean,
      total: integer,
      bets: list(object({ ...fields(integer, 'id guildId betAmount winAmount status'), odds: number, createdAt: text }))
    }),
    () => '/查看押注记录',
    parseCompetitionBets
  ),
  get_guild_competition_battles: observation<{ page?: number }>(
    '分页查询本人宗门大比战斗记录。',
    'competition.battles',
    object({ page }, ['page']),
    object({ ...fields(boolean, 'hasGuild hasTeams'), ...fields(integer, 'page totalPages count'), records: list(battle) }),
    input => `/宗门大比战斗记录 ${input.page ?? 1}`,
    parseCompetitionBattles,
    input => ({ pageText: String(input.page ?? 1) })
  ),
  get_guild_competition_battle: observation<{ battleId: number }>(
    '查询本人可访问的宗门大比战斗详情。',
    'competition.battle-detail',
    object({ battleId: id }),
    object({ battleId: integer, ...fields(text, 'stageName battleTime attackerName defenderName winnerName battleLogId'), isWin: boolean }, ['battleLogId']),
    input => `/宗门大比战斗详情 ${input.battleId}`,
    (data, input) => {
      const result = parseCompetitionBattleDetail(data);

      if (result.battleId !== input.battleId) {
        throw new Error('宗门大比战斗编号不匹配');
      }

      return result;
    },
    input => ({ battleIdText: String(input.battleId) })
  ),
  apply_guild_competition: mutation(
    '为当前宗门报名大比，具体资格与阶段由服务端检查。',
    'competition.apply',
    empty,
    receipt,
    () => '/宗门大比报名',
    parseRobotCompetitionTeamAction
  ),
  clear_guild_competition_team: mutation(
    '清空本宗门参赛队伍，权限和阶段由服务端校验。',
    'competition.team-clear',
    empty,
    receipt,
    () => '/清空宗门大比队伍',
    parseRobotCompetitionTeamAction
  ),
  remove_guild_competition_member: mutation<{ position: number }>(
    '移除指定站位成员；权限和阶段由服务端校验。',
    'competition.member-remove',
    object({ position }),
    receipt,
    input => `/移除宗门大比成员 ${input.position}`,
    parseRobotCompetitionTeamAction,
    input => ({ positionText: String(input.position) })
  ),
  move_guild_competition_member: mutation<{ fromPosition: number; toPosition: number }>(
    '调整宗门大比队伍站位，服务端校验权限、站位与阶段。',
    'competition.position-adjust',
    object({ fromPosition: position, toPosition: position }),
    receipt,
    input => `/调整宗门大比位置 ${input.fromPosition} ${input.toPosition}`,
    parseRobotCompetitionTeamAction,
    input => ({ positions: input })
  ),
  get_guild_competition_members: observation<{ page?: number }>(
    '查询可加入大比队伍的宗门成员及空位，服务端校验管理权限。',
    'competition.member-add',
    object({ page }, ['page']),
    object({
      outcome: text,
      data: object({
        ...fields(boolean, 'hasGuild hasTeam canManage'),
        ...fields(integer, 'guildId page totalPages count'),
        competitionId: text,
        teamMemberIds: list(integer),
        availablePositions: list(integer),
        members: list(object({ userId: integer, name: text, power: integer }))
      })
    }),
    input => `/添加宗门大比成员 p${input.page ?? 1}`,
    parseRobotCompetitionMemberAdd,
    input => ({ mode: 'list', pageText: String(input.page ?? 1) })
  ),
  add_guild_competition_member: mutation<{ userId: number; position: number }>(
    '把指定宗门成员加入参赛站位；服务端检查成员归属、管理权限和阶段。',
    'competition.member-add',
    object({ userId: id, position }),
    object({ outcome: text, receipt: object({ message: text }) }),
    input => `/添加宗门大比成员 ${input.userId} ${input.position}`,
    parseRobotCompetitionMemberAdd,
    input => ({ mode: 'direct', target: { uid: input.userId }, position: input.position })
  ),
  challenge_guild_competition: mutation<{ guildId: number; intentId?: string; taskInput?: string }>(
    '挑战指定候选宗门并消耗服务端规定的挑战次数；重复同一原消息使用幂等键。',
    'competition.challenge',
    object({ guildId: id, intentId: intentIdSchema, taskInput: taskInputSchema }, ['intentId', 'taskInput']),
    object({ outcome: text, message: text, battleLogId: text, won: boolean, remaining: integer }, ['battleLogId']),
    input => `/挑战宗门 ${input.guildId}`,
    data => {
      const result = parseRobotCompetitionChallenge(data);

      if (result.outcome !== 'result') {
        throw new Error('宗门大比挑战回执不完整');
      }
      const raw = data as { receipt: { won: boolean; remaining: number } };

      return { ...result, won: raw.receipt.won, remaining: raw.receipt.remaining };
    },
    input => ({ target: { defenderGuildId: input.guildId } }),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  claim_guild_competition_rewards: mutation<{ intentId?: string; taskInput?: string }>(
    '领取本人可领取的宗门大比奖励，结果与灵晶变动以服务端回执为准。',
    'competition.reward-claim',
    object({ intentId: intentIdSchema, taskInput: taskInputSchema }, ['intentId', 'taskInput']),
    object({ message: text, receipt: object({ code: text, ...fields(integer, 'changeAmount beforeAmount afterAmount'), detail: text }) }),
    () => '/领取宗门大比奖励',
    parseRobotCompetitionReward,
    () => ({}),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  place_guild_competition_bet: mutation<{ guildId: number; amount: number }>(
    '押注指定晋级宗门；实际赔率、阶段、余额和资格由服务端校验，直接扣除下注金额。',
    'competition.bet',
    object({ guildId: id, amount: id }),
    betReceipt,
    input => `/押注宗门大比 ${input.guildId} ${input.amount}`,
    decodeBet,
    input => ({ mode: 'bet', guildId: input.guildId, amount: input.amount })
  ),
  follow_guild_competition_bet: mutation<{ amount: number }>(
    '按服务端已有押注目标追投；实际赔率、阶段和余额由服务端校验，直接扣除下注金额。',
    'competition.follow-bet',
    object({ amount: id }),
    betReceipt,
    input => `/追投宗门大比 ${input.amount}`,
    decodeBet,
    input => ({ mode: 'bet', guildId: null, amount: input.amount })
  )
};
