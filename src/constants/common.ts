/**
 * 通用常量定义
 */

// ==================== 字符串常量 ====================
export const EMPTY_STRING = '';
export const SPACE = ' ';

// ==================== 数组索引常量 ====================
export const FIRST_ARG_INDEX = 0;
export const SECOND_ARG_INDEX = 1;
export const THIRD_ARG_INDEX = 2;

// ==================== 数值常量 ====================
export const ZERO_VALUE = 0;
export const ONE_VALUE = 1;
export const MIN_INDEX = 1;
export const MIN_QUANTITY = 0;
export const DEFAULT_VALUE = 0;

// ==================== 分页常量 ====================
export const DEFAULT_PAGE = 1;
export const MIN_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 5;
export const PAGE_SIZE = 5;

// ==================== 锁定状态常量 ====================
export const LOCKED_STATUS = 1;
export const UNLOCKED_STATUS = 0;

// ==================== 装备状态常量 ====================
export const EQUIPMENT_STATUS_UNEQUIPPED = 0;
export const EQUIPMENT_STATUS_EQUIPPED = 1;

// 装备状态映射
export const EQUIPMENT_STATUS_MAP = {
  [EQUIPMENT_STATUS_UNEQUIPPED]: '未装备',
  [EQUIPMENT_STATUS_EQUIPPED]: '已装备'
} as const;

// ==================== 装备分类常量 ====================
export const EQUIPMENT_CATEGORY_COMBAT = 'combat';
export const EQUIPMENT_CATEGORY_LIFE = 'life';

// ==================== 装备类型名称常量 ====================
export const FLAME_EQUIPMENT_TYPE_NAME = '火焰';
export const FURNACE_EQUIPMENT_TYPE_NAME = '丹炉';

// ==================== 命令前缀正则 ====================
export const COMMAND_PREFIX_PATTERN = /^(!|！|\/|#|＃)?/;
