import { parseBackendEncyclopedia, parseBackendEncyclopediaDetail } from './queries';

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

const COMMAND_PREFIX = /^(!|！|\/|#|＃)?图鉴详情\s*/;

export interface ParsedDetailCommand {
  category: string | null;
  targetId: number | null;
}

export function parseDetailCommand(messageText: string): ParsedDetailCommand {
  const raw = (messageText ?? '').trim().replace(COMMAND_PREFIX, '').trim();
  const m = raw.match(/^(道具|材料|装备|天工|功法|本命|本命物)\s+(\d+)$/);

  if (!m) {
    return { category: null, targetId: null };
  }

  return { category: m[1], targetId: Number(m[2]) };
}

export function parseRobotEncyclopediaBrowse(value: any, category: string) {
  if (value?.mode === 'main') {
    return { mode: 'main' as const, toolNames: [] as string[], result: null };
  }
  if (value?.mode === 'subs' && Array.isArray(value.toolNames) && value.toolNames.every((name: unknown) => typeof name === 'string')) {
    return { mode: 'subs' as const, toolNames: value.toolNames as string[], result: null };
  }
  if (value?.mode !== 'list') {
    throw new Error('图鉴目录响应不完整');
  }

  return { mode: 'list' as const, toolNames: [] as string[], result: parseBackendEncyclopedia(value.result, category) };
}
export function parseRobotEncyclopediaDetail(value: unknown, category: string, targetId: number) {
  return { code: 'OK' as const, data: parseBackendEncyclopediaDetail(value, category, targetId) };
}
