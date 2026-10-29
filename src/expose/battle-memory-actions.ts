import { Expose, ExposeError } from 'alemonjs';
import { requestBackend } from '../api/bot/client';
import { authorizedEvent } from './access';
import { boolean, fields, integer, list, number, object, project, text } from './schema';

const hit = object(
  {
    ...fields(text, 'actorId targetId kind damageType'),
    ...fields(integer, 'damage actualDamage shieldAbsorbed'),
    ...fields(number, 'critProbability dodgeProbability'),
    ...fields(boolean, 'dodged crit killed')
  },
  ['damageType', 'shieldAbsorbed', 'critProbability', 'dodgeProbability']
);
const heal = object({ ...fields(text, 'actorId targetId'), ...fields(integer, 'amount actual overflow') }, ['overflow']);
const effect = object({ ...fields(text, 'buffName kind'), amount: integer });
const applied = object(
  {
    ...fields(text, 'targetId targetName buffName sourceUnitId sourceUnitName sourceSkillType sourceSkillName'),
    ...fields(integer, 'buffType duration applyProbability')
  },
  ['sourceUnitId', 'sourceUnitName', 'sourceSkillType', 'sourceSkillName', 'applyProbability']
);
const removed = object({ ...fields(text, 'targetId targetName buffName reason'), ...fields(integer, 'buffId buffType') });
const active = object({ ...fields(text, 'unitId unitName buffName'), ...fields(integer, 'attributeModule stacks'), effectValue: number });
const action = object(
  {
    ...fields(integer, 'round wave skillId mpCost mpGain mentalCost mentalGain'),
    ...fields(text, 'actor actorName actionType phase skillName'),
    targets: list(text),
    damageResults: list(hit),
    healResults: list(heal),
    tickEffects: list(effect),
    appliedBuffs: list(applied),
    removedBuffs: list(removed),
    activeBuffs: list(active)
  },
  ['skillId', 'targets', 'damageResults', 'healResults', 'tickEffects', 'appliedBuffs', 'removedBuffs', 'activeBuffs']
);
const unit = object(
  {
    ...fields(text, 'id name side'),
    ...fields(integer, 'position hp maxHp mp maxMp mentalPower maxMentalPower'),
    buffs: list(object({ name: text, type: integer }))
  },
  ['buffs']
);
const schema = object(
  {
    logId: text,
    winner: text,
    rounds: integer,
    expiresAt: text,
    lineup: list(unit),
    waves: list(object({ wave: integer, units: list(unit) })),
    actions: list(action),
    offset: integer,
    totalActions: integer,
    hasMore: boolean
  },
  ['waves']
);

export const battleMemoryActions = {
  get_battle_memory: Expose.action<{ logId: string; offset?: number; limit?: number }, unknown>({
    description: '分页读取公开战斗回忆的原始阵容、行动和胜负；记录到期后无法读取，不重新战斗或延长有效期。仅使用玩家提供或战斗回执返回的记录编号。',
    effect: 'read',
    inputSchema: object(
      {
        logId: { type: 'string', minLength: 1, maxLength: 128 },
        offset: { type: 'integer', minimum: 0, maximum: 1000000 },
        limit: { type: 'integer', minimum: 1, maximum: 100 }
      },
      ['offset', 'limit']
    ),
    outputSchema: schema,
    authorize: (_input, context) => {
      authorizedEvent(context);

      return true;
    },
    handler: async (input, context) => {
      const event = authorizedEvent(context);
      const raw = await requestBackend(event.UserId, 'get_battle_memory_by_id', { path: { id: input.logId }, signal: context.signal });

      context.signal.throwIfAborted();
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        throw new ExposeError('INVALID_OUTPUT', '战斗回忆响应不完整');
      }
      const data = raw as Record<string, unknown>;

      if (data.logId !== input.logId || !Array.isArray(data.actions)) {
        throw new ExposeError('INVALID_OUTPUT', '战斗回忆记录不匹配');
      }
      const offset = input.offset ?? 0;
      const limit = input.limit ?? 50;

      return project(schema, {
        ...data,
        actions: data.actions.slice(offset, offset + limit),
        offset,
        totalActions: data.actions.length,
        hasMore: offset + limit < data.actions.length
      });
    }
  })
};
