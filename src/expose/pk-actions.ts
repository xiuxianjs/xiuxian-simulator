import { ExposeError } from 'alemonjs';
import { parsePKTargets, parsePKHiding, parsePKHide, pkAssetLabels, type PKAssetKind } from '../api/bot/pk-management';
import { parsePKHistory, parsePKReport, parsePKReplay, pkHistoryScopes, type PKHistoryScope } from '../api/bot/pk-history';
import type { GameEvent } from '../types/event';
import { mutation, observation } from './mutation';
import { boolean, fields, integer, list, number, object, text } from './schema';

const id = { type: 'integer' as const, minimum: 1, maximum: Number.MAX_SAFE_INTEGER };
const cursor = { type: 'integer' as const, minimum: 0, maximum: 2147483647 };
const assetKind = { type: 'string' as const, enum: ['item', 'equipment', 'skillBook', 'soulArtifact'] };
const view = object({ capacity: integer, used: integer });
const entry = object(
  {
    ...fields(integer, 'reportId opponentUid'),
    ...fields(text, 'viewerRole opponentName createdAt resultText moneyText originalAssetText counterStatusText counterDeadline'),
    canCounterAttack: boolean
  },
  ['counterDeadline']
);

function privateEvent(event: GameEvent) {
  if (event.name !== 'private.message.create' || event.isPrivate === false) {
    throw new ExposeError('FORBIDDEN', '隐藏物品管理仅限私聊');
  }

  return true;
}

export const pkActions = {
  get_pk_targets: observation<{ cursor?: number }>(
    '查询争夺目标、资格和服务端给出的次数与概率；目标列表可能因状态变化而失效。',
    'pvp.pk-targets',
    object({ cursor }, ['cursor']),
    object(
      {
        ...fields(integer, 'qiCost dailyRemaining dailyLimit nextCursor'),
        canAttack: boolean,
        reason: text,
        items: list(
          object({ ...fields(integer, 'uid sameTargetRemaining pairOrdinal rewardPercent'), ...fields(text, 'name realmName'), itemChancePercent: number })
        )
      },
      ['nextCursor']
    ),
    input => `/可打劫道友 ${input.cursor ?? 0}`,
    parsePKTargets,
    input => ({ cursor: input.cursor ?? 0 })
  ),
  get_pk_hiding: observation<{ assetKind: PKAssetKind; cursor?: number }>(
    '私聊中查询本人可隐藏资产、已占用容量和实际可隐藏数量。',
    'pvp.pk-hiding',
    object({ assetKind, cursor }, ['cursor']),
    object(
      {
        assetKind: text,
        view,
        nextCursor: integer,
        items: list(
          object({ ...fields(text, 'assetKind name protectionText'), ...fields(integer, 'assetId quantity hiddenQuantity heldQuantity maxHiddenQuantity') })
        )
      },
      ['nextCursor']
    ),
    input => `/隐藏物品 ${pkAssetLabels[input.assetKind]} ${input.cursor ?? 0}`,
    (data, input, uid) => {
      const result = parsePKHiding(data, uid);

      if (result.assetKind !== input.assetKind) {
        throw new Error('隐藏物品类别不匹配');
      }

      return result;
    },
    (input, event) => ({ private: privateEvent(event), assetKind: input.assetKind, cursor: input.cursor ?? 0 })
  ),
  set_pk_hidden_quantity: mutation<{ assetKind: PKAssetKind; assetId: number; quantity: number }>(
    '私聊中设置本人资产的绝对隐藏数量，0 表示取消隐藏；服务端校验归属、可用数量、保护规则和容量。',
    'pvp.pk-hide',
    object({ assetKind, assetId: id, quantity: cursor }),
    object({ assetKind: text, assetId: integer, quantity: integer, view }),
    input => `/设置隐藏 ${pkAssetLabels[input.assetKind]} ${input.assetId} ${input.quantity}`,
    (data, input, uid) => {
      const result = parsePKHide(data, uid);

      if (result.assetKind !== input.assetKind || result.assetId !== input.assetId || result.quantity !== input.quantity) {
        throw new Error('隐藏设置回执不匹配');
      }

      return result;
    },
    (input, event) => ({ private: privateEvent(event), ...input })
  ),
  get_pk_history: observation<{ scope?: PKHistoryScope; cursor?: number }>(
    '查询本人争夺历史或未决记录，包含对手、归属和当前反击资格。',
    'pvp.pk-history',
    object({ scope: { type: 'string', enum: ['all', 'attacks', 'defenses', 'pending'] }, cursor }, ['scope', 'cursor']),
    object({ items: list(entry), nextCursor: integer }, ['nextCursor']),
    input => `/争夺历史 ${pkHistoryScopes[input.scope ?? 'all']} ${input.cursor ?? 0}`,
    parsePKHistory,
    input => ({ scope: input.scope ?? 'all', cursor: input.cursor ?? 0 })
  ),
  get_pk_report: observation<{ reportId: number }>(
    '查询本人参与的争夺战报及原战、反击回放可用状态；服务端校验参与者。',
    'pvp.pk-report',
    object({ reportId: id }),
    object({ summary: entry, hasOrdinaryReplay: boolean, hasCounterReplay: boolean }),
    input => `/争夺战报 ${input.reportId}`,
    (data, input) => {
      const result = parsePKReport(data);

      if (result.summary.reportId !== input.reportId) {
        throw new Error('争夺战报编号不匹配');
      }

      return result;
    }
  ),
  get_pk_replay: observation<{ reportId: number; phase: 'ordinary' | 'counter'; page?: number }>(
    '分页读取原普通战报或反击的持久回放，不重新计算战斗或消耗反击机会。',
    'pvp.pk-replay',
    object({ reportId: id, phase: { type: 'string', enum: ['ordinary', 'counter'] }, page: { type: 'integer', minimum: 1, maximum: 2147483647 } }, ['page']),
    object({ summary: entry, phase: text, ...fields(integer, 'page totalPages totalActions'), text }),
    input => `/争夺回放 ${input.reportId} ${input.phase === 'ordinary' ? '原战' : '反击'} ${input.page ?? 1}`,
    (data, input) => {
      const result = parsePKReplay(data);

      if (result.summary.reportId !== input.reportId || result.phase !== input.phase || result.page !== (input.page ?? 1)) {
        throw new Error('争夺回放回执不匹配');
      }

      return result;
    },
    input => ({ reportId: input.reportId, phase: input.phase, page: input.page ?? 1 })
  )
};
