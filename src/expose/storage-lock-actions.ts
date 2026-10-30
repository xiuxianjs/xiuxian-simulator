import { ExposeError } from 'alemonjs';
import { parseStorageLockResult } from '../api/bot/storage-lock';
import { intentIdSchema, mutation, validateIntentId } from './mutation';
import { boolean, integer, object, text } from './schema';

const categories = ['材料', '道具', '装备', '天工', '功法', '本命'] as const;

type Category = (typeof categories)[number];
const assets = { 材料: 'item', 道具: 'item', 装备: 'equipment', 天工: 'professionTool', 功法: 'skillBook', 本命: 'soulArtifact' } as const;

type Input = { category: Category; instanceId: number; intentId?: string };
function lock(locked: boolean) {
  const word = locked ? '锁定' : '解锁';

  return mutation<Input>(
    `${word}本人指定背包实例；道具或材料的 instanceId 使用 get_inventory 的 userItemId。功法可能影响多个实例，锁定不保证阻止使用。同消息新操作使用新 intentId，同次重试沿用原编号。`,
    locked ? 'storage.lock' : 'storage.unlock',
    object(
      {
        category: { type: 'string', enum: [...categories] },
        instanceId: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
        intentId: intentIdSchema
      },
      ['intentId']
    ),
    object({ category: text, instanceId: integer, outcome: text, count: integer, name: text, group: boolean, message: text }, ['name']),
    input => `/${word} ${input.category} ${input.instanceId}`,
    (data, input) => {
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('背包锁定回执不完整');
      }
      const row = data as Record<string, unknown>;

      if (row.mode !== 'id' || row.category !== input.category || row.itemId !== input.instanceId) {
        throw new Error('背包锁定回执目标不匹配');
      }
      const parsed = parseStorageLockResult(row.result, 'instance', assets[input.category]);

      if (parsed.kind !== 'instance') {
        throw new Error('背包锁定回执选择方式不匹配');
      }

      return { category: input.category, instanceId: input.instanceId, ...parsed.instance, message: parsed.view.message };
    },
    input => ({ args: [input.category, String(input.instanceId)] }),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId }
  );
}
const bulkCategories = ['材料', '道具', '装备', '天工', '功法', '材料-草药', '材料-经验材料', '材料-经验', '材料-其它', '道具-丹药', '道具-其它'] as const;

type BulkInput = { category: (typeof bulkCategories)[number]; intentId?: string };

function lockCategory(locked: boolean) {
  const word = locked ? '锁定' : '解锁';

  return mutation<BulkInput>(
    `批量${word}本人背包指定分类当前符合条件的物品；实际范围以回执为准。同消息新操作使用新 intentId，同次重试沿用原编号。`,
    locked ? 'storage.lock' : 'storage.unlock',
    object({ category: { type: 'string', enum: [...bulkCategories] }, intentId: intentIdSchema }, ['intentId']),
    object({ category: text, outcome: text, count: integer, message: text }),
    input => `/${word} ${input.category}`,
    (data, input) => {
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('背包锁定回执不完整');
      }
      const row = data as Record<string, unknown>;

      if (row.mode !== 'category' || row.category !== input.category) {
        throw new Error('背包锁定回执目标不匹配');
      }
      const parsed = parseStorageLockResult(row.result, 'category');

      if (parsed.kind !== 'category') {
        throw new Error('背包锁定回执选择方式不匹配');
      }

      return { category: input.category, ...parsed.category, message: parsed.view.message };
    },
    input => ({ args: [input.category] }),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId }
  );
}

type TypeInput = { category: '装备' | '天工' | '功法'; typeName: string; intentId?: string };

function lockType(locked: boolean) {
  const word = locked ? '锁定' : '解锁';
  const token = (input: TypeInput) => `${input.category}-${input.typeName}`;

  return mutation<TypeInput>(
    `按服务端类型名称批量${word}本人装备、天工或功法；实际数量以回执为准。同消息新操作使用新 intentId，同次重试沿用原编号。`,
    locked ? 'storage.lock' : 'storage.unlock',
    object({ category: { type: 'string', enum: ['装备', '天工', '功法'] }, typeName: { type: 'string', minLength: 1 }, intentId: intentIdSchema }, [
      'intentId'
    ]),
    object({ category: text, typeName: text, outcome: text, count: integer, message: text }),
    input => `/${word} ${token(input)}`,
    (data, input) => {
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('背包锁定回执不完整');
      }
      const row = data as Record<string, unknown>;

      if (row.mode !== 'category' || row.category !== token(input)) {
        throw new Error('背包锁定回执目标不匹配');
      }
      const parsed = parseStorageLockResult(row.result, 'category');

      if (parsed.kind !== 'category') {
        throw new Error('背包锁定回执选择方式不匹配');
      }

      return { category: input.category, typeName: input.typeName, ...parsed.category, message: parsed.view.message };
    },
    input => ({ args: [token(input)] }),
    input => {
      if (!/^\S+$/.test(input.typeName)) {
        throw new ExposeError('INVALID_INPUT', '类型名称必须是单个非空名称');
      }
      validateIntentId(input.intentId);
    },
    { intentId: input => input.intentId }
  );
}

export const storageLockActions = {
  lock_storage_instance: lock(true),
  unlock_storage_instance: lock(false),
  lock_storage_category: lockCategory(true),
  unlock_storage_category: lockCategory(false),
  lock_storage_type: lockType(true),
  unlock_storage_type: lockType(false)
};
