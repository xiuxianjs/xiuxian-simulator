import { getBackendItemDetail } from '@src/api/bot/item-detail-queries';
import type { ItemDetailFacts, ItemDetailQueryData } from '@src/api/schemas/item-detail-query';
import { logger } from 'alemonjs';

/** 分类参数 → 查询类别 */
const CATEGORY_PARAM_MAP: Record<string, ItemDetailQueryData['entries'][number]['category']> = {
  道具: 'item',
  材料: 'item',
  物品: 'item',
  装备: 'equipment',
  天工: 'profession_tool',
  功法: 'skill_book'
};

type ItemDetailResult =
  | { code: 'NO_INPUT'; data: { message: string } }
  | {
      code: 'OK';
      data: {
        itemRow: any;
        equipRow: any;
        professionToolRow: any;
        sbRow: any;
        name: string;
        matches: { category: ItemDetailQueryData['entries'][number]['category']; id: number; name: string }[];
        facts: Record<string, ItemDetailFacts>;
      };
    }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  load?: (query: Parameters<typeof getBackendItemDetail>[2]) => ReturnType<typeof getBackendItemDetail>;
  bid: string | undefined;
  uid: number;
  rawInput: string;
}): Promise<ItemDetailResult> {
  try {
    const raw = params.rawInput;

    if (!raw) {
      return { code: 'NO_INPUT', data: { message: '请输入物品名称' } };
    }

    const name = raw;
    const categoryIdMatch = raw.match(/^(道具|材料|物品|装备|天工|功法)\s+(\d+)$/);

    const query = categoryIdMatch ? { category: CATEGORY_PARAM_MAP[categoryIdMatch[1]], entryId: Number(categoryIdMatch[2]) } : { name };
    const data = params.load ? await params.load(query) : await getBackendItemDetail(params.bid, params.uid, query);
    const rows: Record<string, any> = {};
    const facts: Record<string, ItemDetailFacts> = {};

    for (const entry of data.entries) {
      rows[entry.category] = { ...entry.record, grade: entry.grade };
      facts[entry.category] = {
        view: entry.view,
        sources: entry.sources,
        lore: entry.lore,
        equipmentSet: entry.equipmentSet,
        setEffects: entry.setEffects,
        memorial: data.memorial
      };
    }

    return {
      code: 'OK',
      data: {
        itemRow: rows.item ?? null,
        equipRow: rows.equipment ?? null,
        professionToolRow: rows.profession_tool ?? null,
        sbRow: rows.skill_book ?? null,
        name,
        matches: data.entries.map(entry => ({ category: entry.category, id: entry.record.id, name: entry.record.name })),
        facts
      }
    };
  } catch (error) {
    logger.error('[物品详情] 错误:', error);

    return { code: 'LOAD_FAILED', data: { message: '查询物品详情失败，请稍后再试' } };
  }
}
