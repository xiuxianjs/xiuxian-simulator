import { parseBackendRobbery } from '../api/bot/robbery';
import { parseBackendCounterAttack } from '../api/bot/counter-attack';
import { parsePKReceipt } from '../api/bot/pk-receipt';
import { mutation } from './mutation';
import { boolean, fields, integer, list, number, object, text } from './schema';

const id = { type: 'integer' as const, minimum: 1, maximum: Number.MAX_SAFE_INTEGER };
const pk = object({ ...fields(integer, 'pkRulesVersion pkEventId'), ...fields(text, 'actorSide pkState pkDeliveryState counterDeadline'), won: boolean });
const unit = object({ name: text, hp: integer, maxHp: integer, isDead: boolean });
const drop = object({ ...fields(text, 'name category'), quantity: integer });
const battle = object({ totalRounds: integer, finalState: object({ sideA: list(unit), sideB: list(unit) }) });

function decodeRobbery(value: unknown) {
  const row = parseBackendRobbery(value) as Record<string, unknown>;
  const receipt = parsePKReceipt(row);
  const battleView = row.battleView as Record<string, unknown> | null;
  const finalState = battleView?.finalState as Record<string, unknown> | null;

  if (
    !receipt ||
    !Number.isSafeInteger(row.logId) ||
    Number(row.logId) < 1 ||
    typeof row.targetName !== 'string' ||
    typeof row.battleLogId !== 'string' ||
    typeof row.bonusText !== 'string' ||
    typeof row.losingStreakText !== 'string' ||
    !['stoneReward', 'crystalReward', 'shaQiChange', 'currentShaQi', 'experience'].every(key => Number.isSafeInteger(row[key])) ||
    !battleView ||
    !Number.isSafeInteger(battleView.totalRounds) ||
    !finalState ||
    !Array.isArray(finalState.sideA) ||
    !Array.isArray(finalState.sideB)
  ) {
    throw new Error('争夺结算回执不完整');
  }
  for (const member of [...finalState.sideA, ...finalState.sideB]) {
    if (
      !member ||
      typeof member.name !== 'string' ||
      !Number.isSafeInteger(member.hp) ||
      !Number.isSafeInteger(member.maxHp) ||
      typeof member.isDead !== 'boolean'
    ) {
      throw new Error('争夺战斗单位不完整');
    }
  }
  if (row.droppedItem !== undefined && row.droppedItem !== null) {
    const item = row.droppedItem as Record<string, unknown>;

    if (typeof item.name !== 'string' || typeof item.category !== 'string' || !Number.isSafeInteger(item.quantity) || Number(item.quantity) <= 0) {
      throw new Error('争夺物品回执不完整');
    }
  }

  return { ...row, pk: receipt };
}
export const pkBattleActions = {
  rob_player: mutation<{ targetUid: number }>(
    '对指定玩家发起争夺；服务端校验资格、保护期和次数。掉落物可能暂存，必须按 pkDeliveryState 判断归属，不能当作已到账。',
    'pvp.robbery',
    object({ targetUid: id }),
    object(
      {
        pk,
        ...fields(integer, 'logId qiCost remaining dailyMax stoneReward crystalReward shaQiChange currentShaQi experience pairOrdinal rewardPercent'),
        ...fields(text, 'targetName battleLogId bonusText losingStreakText'),
        droppedItem: drop,
        battleView: battle
      },
      ['droppedItem', 'pairOrdinal', 'rewardPercent']
    ),
    input => `/打劫 ${input.targetUid}`,
    decodeRobbery,
    input => ({ target: { uid: input.targetUid } })
  ),
  counter_pk_attack: mutation<{ reportId: number }>(
    '针对本人原争夺战报发起免费反击；服务端校验记录归属、窗口及机会，结果中的 pkDeliveryState 才表示物品是否归还或交付。',
    'pvp.counter-attack',
    object({ reportId: id }),
    object(
      {
        pk,
        ...fields(text, 'targetName logId bonusText'),
        isWin: boolean,
        ...fields(integer, 'totalRounds counterHpCost stoneReward crystalReward expReward'),
        shaQiBonus: number,
        sideA: list(unit),
        sideB: list(unit),
        droppedItem: drop
      },
      ['droppedItem']
    ),
    input => `/回击 ${input.reportId}`,
    data => {
      const result = parseBackendCounterAttack(data);

      if (!result.pk) {
        throw new Error('争夺反击回执不完整');
      }

      return result;
    },
    input => ({ logId: String(input.reportId) })
  )
};
