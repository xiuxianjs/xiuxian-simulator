import type { ItemDetailQueryData } from '../schemas/item-detail-query';
import { requestBackend } from './client';

const object = (value: unknown): Record<string, any> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('物品详情接口数据不完整');
  }

  return value as Record<string, any>;
};
const nullableText = (value: unknown) => value === null || typeof value === 'string';

export async function getBackendItemDetail(
  bid: string | undefined,
  uid: number,
  query: { category?: ItemDetailQueryData['entries'][number]['category']; entryId?: number; name?: string }
): Promise<ItemDetailQueryData> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }
  const data = object(await requestBackend(bid, 'get_players_id_catalog_item_detail', { path: { id: uid }, query }));

  return parseItemDetail(data, query);
}

export function parseItemDetail(
  data: any,
  query: { category?: ItemDetailQueryData['entries'][number]['category']; entryId?: number; name?: string } = {}
): ItemDetailQueryData {
  if (!Array.isArray(data.entries) || !Object.hasOwn(data, 'memorial')) {
    throw new Error('物品详情接口数据不完整');
  }
  if (data.memorial !== null) {
    const memorial = object(data.memorial);

    if (!['userName', 'partnerName', 'companionSince'].every(key => nullableText(memorial[key]))) {
      throw new Error('物品详情纪念品数据不完整');
    }
  }
  const seen = new Set<string>();

  for (const raw of data.entries) {
    const entry = object(raw);
    const value = object(entry.record);
    const sources = object(entry.sources);

    if (
      !Array.isArray(entry.view) ||
      entry.view.some((block: unknown) => {
        if (!block || typeof block !== 'object' || Array.isArray(block)) {
          return true;
        }
        const row = block as Record<string, unknown>;

        return (
          typeof row.kind !== 'string' ||
          !['text', 'newline', 'quote', 'source'].includes(row.kind) ||
          (row.kind !== 'newline' && typeof row.text !== 'string') ||
          (row.text !== undefined && typeof row.text !== 'string') ||
          (row.command !== undefined && typeof row.command !== 'string')
        );
      })
    ) {
      throw new Error('物品详情展示投影无效');
    }

    if (
      !['item', 'equipment', 'profession_tool', 'skill_book'].includes(entry.category) ||
      seen.has(entry.category) ||
      !Number.isSafeInteger(value.id) ||
      value.id < 1 ||
      typeof value.name !== 'string' ||
      (query.category && (entry.category !== query.category || value.id !== query.entryId))
    ) {
      throw new Error('物品详情返回对象不一致');
    }
    seen.add(entry.category);
    if (!['stages', 'dungeons', 'recipes', 'shops', 'guildShop', 'materials'].every(key => Array.isArray(sources[key])) || !Array.isArray(entry.setEffects)) {
      throw new Error('物品详情来源数据不完整');
    }
    for (const key of ['grade', 'lore', 'equipmentSet']) {
      if (entry[key] !== null) {
        object(entry[key]);
      }
    }
    if (entry.category === 'equipment' && !Object.hasOwn(value, 'equipmentType')) {
      throw new Error('物品详情缺少装备类型');
    }
    if (entry.category === 'skill_book') {
      if (!Object.hasOwn(value, 'skill')) {
        throw new Error('物品详情缺少技能');
      }
    }
  }

  return data;
}
