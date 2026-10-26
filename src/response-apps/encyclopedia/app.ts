import { getBackendEncyclopedia, getBackendToolCategories } from '@src/api';

/** 道具子分类（中文 → subtype） */
const ITEM_PROP_SUBS: Record<string, string> = {
  丹药: 'pill',
  丹方: 'danfang',
  其它: 'other'
};

/** 材料子分类（中文 → subtype） */
const ITEM_MAT_SUBS: Record<string, string> = {
  草药: 'herb',
  其它: 'other'
};

/** 装备类型（中文 → type_id） */
const EQUIP_TYPE_MAP: Record<string, number> = {
  武器: 1,
  衣服: 2,
  鞋: 3,
  头饰: 4,
  羽翼: 5
};

/** 功法类型（中文 → skill_type_id） */
const SKILL_TYPE_MAP: Record<string, number> = {
  战技: 2,
  被动技: 3,
  神通: 4
};

export { EQUIP_TYPE_MAP, ITEM_MAT_SUBS, ITEM_PROP_SUBS, SKILL_TYPE_MAP };

export interface ParsedCommand {
  category: string | null;
  subCategory: string | null;
  page: number;
}

export function parseEncyclopediaCommand(messageText: string): ParsedCommand {
  const raw = (messageText ?? '').trim();
  const m = raw.match(/^(!|！|\/|#|＃)?图鉴(?:\s+(\S+))?(?:\s+(\S+))?(?:\s*p(\d+))?$/);
  const rawSubCategory = m?.[3] ?? null;
  const pageFromSubCategory = rawSubCategory?.match(/^p(\d+)$/);

  return {
    category: m?.[2] ?? null,
    subCategory: pageFromSubCategory ? null : rawSubCategory,
    page: m?.[4] ? Number(m[4]) : pageFromSubCategory ? Number(pageFromSubCategory[1]) : 1
  };
}

export interface ListItem {
  id: number;
  name: string;
  gradeName: string;
}

type ListResult =
  | { code: 'OK'; data: { items: ListItem[]; totalCount: number; totalPages: number; page: number; detailPrefix: string } }
  | { code: 'INVALID_SUB'; data: { message: string } };

// eslint-disable-next-line require-await
export async function getItemList(category: string, subCategory: string | null, page: number, bid?: string): Promise<ListResult> {
  if (category === '本命' || category === '本命物') {
    return getBackendEncyclopedia(bid, category, subCategory, page);
  }

  if (category === '天工') {
    if (!subCategory) {
      return { code: 'INVALID_SUB', data: { message: '请选择天工子分类' } };
    }

    return getBackendEncyclopedia(bid, category, subCategory, page);
  }

  if (category === '道具') {
    if (!subCategory) {
      return { code: 'INVALID_SUB', data: { message: '请选择道具子分类' } };
    }

    const subtype = ITEM_PROP_SUBS[subCategory];

    if (!subtype) {
      return { code: 'INVALID_SUB', data: { message: `未知道具子分类「${subCategory}」` } };
    }

    return getBackendEncyclopedia(bid, category, subCategory, page);
  }

  if (category === '材料') {
    if (!subCategory) {
      return { code: 'INVALID_SUB', data: { message: '请选择材料子分类' } };
    }

    const subtype = ITEM_MAT_SUBS[subCategory];

    if (!subtype) {
      return { code: 'INVALID_SUB', data: { message: `未知材料子分类「${subCategory}」` } };
    }

    return getBackendEncyclopedia(bid, category, subCategory, page);
  }

  if (category === '装备') {
    if (!subCategory) {
      return { code: 'INVALID_SUB', data: { message: '请选择装备子分类' } };
    }

    const typeId = EQUIP_TYPE_MAP[subCategory];

    if (!typeId) {
      return { code: 'INVALID_SUB', data: { message: `未知装备子分类「${subCategory}」` } };
    }

    return getBackendEncyclopedia(bid, category, subCategory, page);
  }

  if (category === '功法') {
    if (!subCategory) {
      return { code: 'INVALID_SUB', data: { message: '请选择功法子分类' } };
    }

    const skillTypeId = SKILL_TYPE_MAP[subCategory];

    if (!skillTypeId) {
      return { code: 'INVALID_SUB', data: { message: `未知功法子分类「${subCategory}」` } };
    }

    return getBackendEncyclopedia(bid, category, subCategory, page);
  }

  return { code: 'INVALID_SUB', data: { message: `未知分类「${category}」` } };
}

export function getLifeEquipmentTypeNamesForEncyclopedia(bid?: string): Promise<string[]> {
  return getBackendToolCategories(bid);
}
