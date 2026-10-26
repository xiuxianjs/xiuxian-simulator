/**
 * 新储物袋系统常量定义（基于统一物品架构）
 */

import { PAGE_SIZE as DEFAULT_PAGE_SIZE } from '@src/constants';
import type { StorageCategory, StorageSubcategory } from '@src/types/storage';

// 每页大小
export const PAGE_SIZE = DEFAULT_PAGE_SIZE;

// 缓存过期时间（毫秒）
export const CACHE_TTL = 5 * 60 * 1000; // 5分钟

// Redis key 前缀
export const REDIS_KEYS = {
  EQUIPMENT_TYPES: 'storage:equipment:types',
  SKILL_TYPES: 'storage:skill:types'
} as const;

// 道具二级分类列表
export const PROP_SUBCATEGORIES: StorageSubcategory[] = ['pill', 'danfang', 'gift', 'other'];

// 材料二级分类列表
export const MATERIAL_SUBCATEGORIES: StorageSubcategory[] = ['herb', 'exp', 'other'];

// 一级分类名称映射
export const CATEGORY_NAMES: Record<StorageCategory, string> = {
  prop: '道具',
  material: '材料',
  equipments: '装备',
  professionTools: '天工',
  skillBooks: '功法',
  soulArtifacts: '本命',
  lootboxes: '礼盒'
};

// 二级分类名称映射（英文→中文）
export const SUBCATEGORY_NAMES: Record<string, string> = {
  pill: '丹药',
  danfang: '丹方',
  gift: '礼物',
  lootbox: '礼盒',
  other: '其它',
  herb: '草药',
  exp: '经验材料',
  'other-mat': '其它'
};

// 二级分类名称反向映射（中文→英文）
export const SUBCATEGORY_CODE_MAP: Record<string, string> = {
  丹药: 'pill',
  丹方: 'danfang',
  礼物: 'gift',
  礼盒: 'lootbox',
  其它: 'other',
  草药: 'herb',
  经验材料: 'exp'
};
