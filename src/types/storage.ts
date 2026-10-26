/**
 * 储物袋系统类型定义
 */

// 一级分类
export type StorageCategory = 'prop' | 'material' | 'equipments' | 'professionTools' | 'skillBooks' | 'soulArtifacts' | 'lootboxes';

// 二级分类
export type StorageSubcategory =
  | 'pill' // 丹药
  | 'danfang' // 丹方
  | 'gift' // 礼物
  | 'other' // 其它道具
  | 'herb' // 草药
  | 'exp' // 经验材料
  | 'other-mat' // 其它材料
  | string; // 装备/功法动态类型

// 统一物品显示接口
export interface DisplayItem {
  id: number;
  name: string;
  type: StorageCategory;
  subcategory?: StorageSubcategory;
  quantity: number;
  isStackable: boolean;
  gradeName: string;
  realmName: string;
  isLocked: boolean;
  // 类型特定字段
  effect?: string;
  // 装备特定字段
  equipmentType?: string;
  attack?: number;
  defense?: number;
  // 功法特定字段
  skillType?: string;
  skillLevel?: number;
  isIdentified?: boolean;
  // 其他
  description?: string;
}

// 分页结果
export interface PagedResult<T> {
  items: T[];
  total: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// 物品查询参数
export interface ItemQueryParams {
  uid: number;
  category: StorageCategory;
  subcategory?: StorageSubcategory;
  page?: number;
  pageSize?: number;
}

// 可堆叠物品详细信息
export interface StackableItemDetail {
  id: number;
  userItemId: number;
  itemId: number;
  name: string;
  type: string;
  subtype: string;
  quantity: number;
  isStackable: boolean;
  grade?: {
    id: number;
    name: string;
  };
  realm?: {
    id: number;
    name: string;
  };
  effect?: string;
  isLocked: boolean;
  locked_at?: Date | null;
}

// 装备详细信息
export interface EquipmentItemDetail {
  id: number;
  userEquipmentId: number;
  name: string;
  type: string;
  grade?: {
    id: number;
    name: string;
  };
  realm?: {
    id: number;
    name: string;
  };
  attack?: number;
  defense?: number;
  isEquipped: boolean;
  isLocked: boolean;
}

// 功法详细信息
export interface SkillBookItemDetail {
  id: number;
  userSkillBookId: number;
  name?: string;
  type?: string;
  grade?: {
    id: number;
    name: string;
  };
  realm?: {
    id: number;
    name: string;
  };
  level?: number;
  isIdentified: boolean;
  count: number; // 兼容旧数量字段，功法按实例展示
  isLocked: boolean;
}

// 本命物详细信息
export interface SoulArtifactDetail {
  id: number;
  userSoulArtifactId: number;
  artifactId: number;
  name: string;
  gradeName: string;
  gradeId: number;
  level: number;
  washCount: number;
  hasUpgraded: boolean;
  isEquipped: boolean;
  isLocked: number;
  canRefine: boolean;
  canToggleLock: boolean;
  lockAction: 'lock' | 'unlock' | '';
}

// 礼盒详细信息
export interface LootboxDetail {
  id: number;
  lootboxId: number;
  name: string;
  description: string;
  quantity: number;
}
