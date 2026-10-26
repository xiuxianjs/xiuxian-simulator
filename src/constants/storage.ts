/**
 * 储物袋相关常量定义
 */
import { invert } from 'lodash-es';

// ==================== 分类类型定义 ====================
export type CategoryType = 'materials' | 'pills' | 'expItems' | 'equipments' | 'skillBooks' | 'props';

// ==================== 分类名称映射 ====================
// 分类类型 -> 中文名称
export const CATEGORY_NAMES: Record<CategoryType, string> = {
  materials: '材料',
  pills: '丹药',
  expItems: '经验道具',
  equipments: '装备',
  skillBooks: '功法',
  props: '道具'
};

// 中文名称 -> 分类类型
export const CATEGORY_MAP: Record<string, CategoryType> = invert(CATEGORY_NAMES) as Record<string, CategoryType>;

// ==================== 物品类型配置 ====================
export interface ItemTypeConfig {
  foreignKey: string; // 外键字段名
  itemName: string; // 物品类型中文名
  quantifier: string; // 量词（个、件、本等）
}

export const ITEM_TYPE_CONFIG: Record<CategoryType, ItemTypeConfig> = {
  materials: {
    foreignKey: 'materialId',
    itemName: '材料',
    quantifier: '个'
  },
  pills: {
    foreignKey: 'pillId',
    itemName: '丹药',
    quantifier: '个'
  },
  expItems: {
    foreignKey: 'expItemId',
    itemName: '经验道具',
    quantifier: '个'
  },
  equipments: {
    foreignKey: 'equipmentId',
    itemName: '装备',
    quantifier: '件'
  },
  skillBooks: {
    foreignKey: 'skillBookId',
    itemName: '功法',
    quantifier: '本'
  },
  props: {
    foreignKey: 'propId',
    itemName: '道具',
    quantifier: '个'
  }
};
