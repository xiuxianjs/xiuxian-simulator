/**
 * 物品类型枚举（仅可堆叠物品）
 */
export const ITEM_TYPES = {
  PROP: 'prop',
  MATERIAL: 'material'
} as const;

/**
 * 道具子类型枚举
 */
export const PROP_SUBTYPES = {
  PILL: 'pill',
  DANFANG: 'danfang',
  GIFT: 'gift',
  BENMING: 'benming',
  OTHER: 'other'
} as const;

/**
 * 材料子类型枚举
 */
export const MATERIAL_SUBTYPES = {
  HERB: 'herb',
  EXP: 'exp',
  OTHER: 'other'
} as const;

/**
 * 物品子类型映射
 */
export const ITEM_SUBTYPES = {
  PROP: PROP_SUBTYPES,
  MATERIAL: MATERIAL_SUBTYPES
} as const;

/**
 * 物品类型
 */
export type ItemType = (typeof ITEM_TYPES)[keyof typeof ITEM_TYPES];

/**
 * 道具子类型
 */
export type PropSubtype = (typeof PROP_SUBTYPES)[keyof typeof PROP_SUBTYPES];

/**
 * 材料子类型
 */
export type MaterialSubtype = (typeof MATERIAL_SUBTYPES)[keyof typeof MATERIAL_SUBTYPES];

/**
 * 物品子类型
 */
export type ItemSubtype = PropSubtype | MaterialSubtype;

/**
 * 物品类型值数组
 */
export const ITEM_TYPE_VALUES: readonly ItemType[] = Object.values(ITEM_TYPES);

/**
 * 物品子类型值数组
 */
export const ITEM_SUBTYPE_VALUES: readonly ItemSubtype[] = [...Object.values(PROP_SUBTYPES), ...Object.values(MATERIAL_SUBTYPES)];

/**
 * 判断值是否为物品类型
 * @param value 待判断的值
 * @returns 是否为物品类型
 */
export function isItemType(value: unknown): value is ItemType {
  return typeof value === 'string' && (ITEM_TYPE_VALUES as readonly string[]).includes(value);
}

/**
 * 判断值是否为物品子类型
 * @param value 待判断的值
 * @returns 是否为物品子类型
 */
export function isItemSubtype(value: unknown): value is ItemSubtype {
  return typeof value === 'string' && (ITEM_SUBTYPE_VALUES as readonly string[]).includes(value);
}

/**
 * 判断值是否为道具子类型
 * @param value 待判断的值
 * @returns 是否为道具子类型
 */
export function isPropSubtype(value: unknown): value is PropSubtype {
  return typeof value === 'string' && (Object.values(PROP_SUBTYPES) as readonly string[]).includes(value);
}

/**
 * 判断值是否为材料子类型
 * @param value 待判断的值
 * @returns 是否为材料子类型
 */
export function isMaterialSubtype(value: unknown): value is MaterialSubtype {
  return typeof value === 'string' && (Object.values(MATERIAL_SUBTYPES) as readonly string[]).includes(value);
}

/**
 * 根据物品类型获取对应的子类型列表
 * @param itemType 物品类型
 * @returns 该物品类型对应的子类型数组
 */
export function getSubtypesByType(itemType: ItemType): readonly ItemSubtype[] {
  switch (itemType) {
    case 'prop':
      return Object.values(PROP_SUBTYPES);
    case 'material':
      return Object.values(MATERIAL_SUBTYPES);
    default:
      return [];
  }
}
