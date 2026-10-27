import { mutation } from './mutation';
import { query } from './query';
import { boolean, fields, integer, list, object, text } from './schema';
import { requestBackend } from '../api/bot/client';
import { parseStorylineManualBattleState } from '../api/bot/storyline-manual-battle';

const positive = { type: 'integer' as const, minimum: 1, maximum: Number.MAX_SAFE_INTEGER };
const sessionId = { type: 'string' as const, minLength: 1, maxLength: 128 };
const unit = object({
  ...fields(text, 'id name side'),
  ...fields(integer, 'position hp maxHp mp maxMp mentalPower maxMentalPower physicalAttack magicAttack physicalDefense magicDefense speed'),
  dead: boolean
});
const stateSchema = object(
  {
    sessionId,
    revision: positive,
    finished: boolean,
    winner: text,
    logId: text,
    choiceAccepted: boolean,
    choice: object({
      ...fields(text, 'unitId unitName'),
      side: { type: 'string', enum: ['A', 'B'] },
      round: integer,
      availableSkills: list(
        object({ type: { type: 'string', enum: ['normal', 'battle', 'divine'] }, name: text, available: boolean, reason: text }, ['reason'])
      )
    }),
    battle: object({ winner: text, rounds: integer, sideA: list(unit), sideB: list(unit) }),
    events: list(
      object(
        {
          ...fields(integer, 'round wave mpCost mpGain mentalCost mentalGain skillId'),
          ...fields(text, 'actor actorName actionType phase skillName'),
          targets: list(text)
        },
        ['skillId', 'targets']
      )
    ),
    settlement: object(
      {
        won: boolean,
        ...fields(integer, 'stars experienceGained bonusExperienceGained spiritStoneGained spiritCostPaid roundsUsed chapterNumber stageNumber teamId'),
        ...fields(text, 'expBonusText stageLabel monsterName battleLogId'),
        ...fields(boolean, 'showPrevStage showNextStage showNextChapter'),
        drops: list(object({ category: text, amount: integer, name: text, itemId: integer, currencyCode: text }, ['name', 'itemId', 'currencyCode']))
      },
      ['teamId', 'battleLogId']
    )
  },
  ['winner', 'logId', 'choiceAccepted', 'choice', 'settlement']
);

function decode(value: unknown, expectedSession?: string, requireAccepted = false) {
  const parsed = parseStorylineManualBattleState(value);
  const raw = value as Record<string, any>;

  if (!parsed.sessionId || (expectedSession && parsed.sessionId !== expectedSession) || !Number.isSafeInteger(raw.revision) || raw.revision < 1) {
    throw new Error('主线战斗会话或版本响应不完整，请更新服务端');
  }
  if (requireAccepted && typeof raw.choiceAccepted !== 'boolean') {
    throw new Error('主线选技缺少服务端版本校验回执');
  }
  const battle = raw.battle;

  if (!battle || !Array.isArray(battle.SideA) || !Array.isArray(battle.SideB)) {
    throw new Error('主线战场状态不完整');
  }
  const units = (rows: Array<Record<string, unknown>>) => rows.map(row => ({
      id: row.ID,
      name: row.Name,
      side: row.Side,
      position: row.Position,
      hp: row.HP,
      maxHp: row.MaxHP,
      mp: row.MP,
      maxMp: row.MaxMP,
      mentalPower: row.MentalPower,
      maxMentalPower: row.MaxMentalPower,
      physicalAttack: row.PhysicalAttack,
      magicAttack: row.MagicAttack,
      physicalDefense: row.PhysicalDefense,
      magicDefense: row.MagicDefense,
      speed: row.Speed,
      dead: row.Dead
    }));

  return {
    ...parsed,
    revision: raw.revision,
    choiceAccepted: raw.choiceAccepted,
    battle: { winner: battle.Winner, rounds: battle.Rounds, sideA: units(battle.SideA), sideB: units(battle.SideB) }
  };
}
export const storylineActions = {
  challenge_storyline: mutation<{ chapterNumber: number; stageNumber: number }>(
    '挑战指定主线章节关卡；遵循玩家现有自动/手动战斗设置，可能立即结算或返回待选技能。检查 finished、choice 和 settlement；不自动重复挑战。',
    'storyline.challenge',
    object({ chapterNumber: positive, stageNumber: { type: 'integer', minimum: 1, maximum: 4 } }),
    stateSchema,
    input => `/主线挑战 ${input.chapterNumber}-${input.stageNumber}`,
    data => decode(data),
    input => ({ input: `/主线挑战 ${input.chapterNumber}-${input.stageNumber}` })
  ),
  get_storyline_battle: query(
    '重新读取当前玩家主线战斗的阵容、技能选项、revision 和结算；不推进回合。服务端 Worker 可能按原有超时规则自动推进。',
    stateSchema,
    async ({ bid, uid, request }, input) => decode(
        await requestBackend(bid, 'get_players_id_storyline_manual_battles_sessionId', { path: { id: uid, sessionId: input.sessionId! }, ...request }),
        input.sessionId
      ),
    object({ sessionId })
  ),
  choose_storyline_skill: mutation<{ sessionId: string; expectedRevision: number; choice: string }>(
    '按最近读取的 revision 提交当前角色技能；normal=普攻、battle=战技、divine=神通、自动=自动完成。必须检查 choiceAccepted；false 表示未执行本次选择，应读取返回状态重新决策。同参重试返回原回执，下一步使用新的 revision。',
    'storyline.choice',
    object({ sessionId, expectedRevision: positive, choice: { type: 'string', enum: ['normal', 'battle', 'divine', '自动'] } }),
    stateSchema,
    input => `/${input.choice}`,
    (data, input) => decode(data, input.sessionId, true)
  )
};
