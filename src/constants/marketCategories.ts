/**
 * 交易所分类常量定义
 * - 定义交易所的分类结构、映射关系和工具函数
 * - 使用 type + subtype 组合来唯一标识分类
 */

import type { ItemSubtype, ItemType } from './itemTypes';

/**
 * 交易所物品类型（扩展ItemType，包含装备和功法）
 */
export type MarketItemType = ItemType | 'equipment' | 'profession_tool' | 'skill_book' | 'soul_artifact';

/**
 * 交易所分类键
 */
export type MarketCategoryKey = {
  type: MarketItemType;
  subtype?: ItemSubtype | string;
};

/**
 * 完整分类定义
 */
export type MarketCategory = {
  key: MarketCategoryKey;
  displayName: string;
  description: string;
};

/**
 * 交易所分类定义
 * - key: { type, subtype } 用于数据库查询
 * - displayName: 中文显示名，用于UI展示
 */
export const MARKET_CATEGORIES: MarketCategory[] = [
  // ===== 道具分类 =====
  {
    key: { type: 'prop', subtype: 'pill' },
    displayName: '丹药',
    description: '可服用的丹药'
  },
  {
    key: { type: 'prop', subtype: 'gift' },
    displayName: '礼物',
    description: '道侣礼物'
  },
  {
    key: { type: 'soul_artifact' },
    displayName: '本命',
    description: '本命（独立存储）'
  },
  {
    key: { type: 'prop', subtype: 'other' },
    displayName: '其它',
    description: '其它道具'
  },

  // ===== 材料分类 =====
  {
    key: { type: 'material', subtype: 'herb' },
    displayName: '草药',
    description: '草药材料'
  },
  {
    key: { type: 'material', subtype: 'exp' },
    displayName: '经验材料',
    description: '提供经验值的材料'
  },
  {
    key: { type: 'material', subtype: 'other' },
    displayName: '其它',
    description: '其它材料'
  },

  // ===== 装备/功法（独立表，保持不变）=====
  {
    key: { type: 'equipment' },
    displayName: '装备',
    description: '装备'
  },
  {
    key: { type: 'profession_tool' },
    displayName: '天工',
    description: '天工工具'
  },
  {
    key: { type: 'skill_book' },
    displayName: '功法',
    description: '功法书籍'
  }
];

/**
 * 中文名称到分类键的映射
 * 用于解析用户指令
 */
export const CHINESE_TO_CATEGORY_KEY: Record<string, MarketCategoryKey> = {
  丹药: { type: 'prop', subtype: 'pill' },
  礼物: { type: 'prop', subtype: 'gift' },
  本命: { type: 'soul_artifact' },
  其它: { type: 'prop', subtype: 'other' },
  草药: { type: 'material', subtype: 'herb' },
  经验材料: { type: 'material', subtype: 'exp' },
  装备: { type: 'equipment' },
  天工: { type: 'profession_tool' },
  功法: { type: 'skill_book' }
};

/**
 * 分类键到中文名称的映射
 * 用于UI展示
 */
export const CATEGORY_KEY_TO_CHINESE: Record<string, string> = {
  'prop:pill': '丹药',
  'prop:gift': '礼物',
  soul_artifact: '本命',
  'prop:other': '其它',
  'material:herb': '草药',
  'material:exp': '经验材料',
  'material:other': '其它',
  equipment: '装备',
  profession_tool: '天工',
  skill_book: '功法'
};

/**
 * 生成分类键的唯一字符串表示
 */
export function getCategoryKeyString(key: MarketCategoryKey): string {
  if (key.subtype) {
    return `${key.type}:${key.subtype}`;
  }

  return key.type;
}

/**
 * 从字符串解析分类键
 */
export function parseCategoryKeyString(str: string): MarketCategoryKey | null {
  if (str === 'equipment' || str === 'profession_tool' || str === 'skill_book' || str === 'soul_artifact') {
    return { type: str };
  }
  const parts = str.split(':');

  if (parts.length === 2) {
    return { type: parts[0] as 'prop' | 'material', subtype: parts[1] };
  }
  if (parts.length === 1 && (parts[0] === 'prop' || parts[0] === 'material')) {
    return { type: parts[0] };
  }

  return null;
}

/**
 * 根据中文名称获取分类键
 */
export function getCategoryKeyByChinese(cnName: string): MarketCategoryKey | undefined {
  return CHINESE_TO_CATEGORY_KEY[cnName];
}

/**
 * 根据分类键获取中文名称
 */
export function getChineseByCategoryKey(key: MarketCategoryKey): string {
  const keyStr = getCategoryKeyString(key);

  return CATEGORY_KEY_TO_CHINESE[keyStr] ?? '未知分类';
}

/**
 * 检查分类键是否为统一物品类型（prop/material）
 */
export function isUnifiedItemCategory(key: MarketCategoryKey): boolean {
  return key.type === 'prop' || key.type === 'material';
}

/**
 * 检查分类键是否为装备类型
 */
export function isEquipmentCategory(key: MarketCategoryKey): boolean {
  return key.type === 'equipment';
}

/**
 * 检查分类键是否为天工类型
 */
export function isProfessionToolCategory(key: MarketCategoryKey): boolean {
  return key.type === 'profession_tool';
}

/**
 * 检查分类键是否为功法类型
 */
export function isSkillBookCategory(key: MarketCategoryKey): boolean {
  return key.type === 'skill_book';
}

/**
 * 获取所有分类的中文名称列表（用于UI展示）
 */
export function getAllCategoryChineseNames(): string[] {
  return Object.keys(CHINESE_TO_CATEGORY_KEY);
}

/**
 * 交易所分类中文名称列表（按顺序展示）
 */
export const MARKET_CATEGORY_NAMES_SORTED = ['丹药', '礼物', '其它', '草药', '经验材料', '装备', '天工', '功法', '本命'];

/**
 * 根据 itemCategory + itemType + itemSubtype 获取物品类型中文标签
 * 用于在列表展示时区分物品类型
 */
export function getItemCategoryLabel(itemCategory: string, itemType?: string | null, itemSubtype?: string | null): string {
  if (itemCategory === 'equipment') {
    return '装备';
  }
  if (itemCategory === 'profession_tool') {
    return '天工';
  }
  if (itemCategory === 'skill_book') {
    return '功法';
  }
  if (itemCategory === 'soul_artifact') {
    return '本命';
  }
  // 统一物品类（item），根据 type + subtype 细分
  if (itemType && itemSubtype) {
    const keyStr = `${itemType}:${itemSubtype}`;

    return CATEGORY_KEY_TO_CHINESE[keyStr] ?? '物品';
  }

  return '物品';
}
