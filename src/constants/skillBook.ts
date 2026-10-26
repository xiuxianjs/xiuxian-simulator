/**
 * 功法相关常量定义
 */

// ==================== 功法状态常量 ====================
export const SKILL_BOOK_STATUS_UNIDENTIFIED = 0; // 历史状态，服务端自动初始化后转为可用
export const SKILL_BOOK_STATUS_IDENTIFIED = 1; // 可学习
export const SKILL_BOOK_STATUS_LEARNED = 2; // 已学习
export const SKILL_BOOK_STATUS_IN_USE = 3; // 使用中

// 功法状态映射
export const SKILL_BOOK_STATUS_MAP: Record<number, string> = {
  [SKILL_BOOK_STATUS_UNIDENTIFIED]: '待初始化',
  [SKILL_BOOK_STATUS_IDENTIFIED]: '可学习',
  [SKILL_BOOK_STATUS_LEARNED]: '已学习',
  [SKILL_BOOK_STATUS_IN_USE]: '使用中'
} as const;

// 功法状态Emoji映射
export const SKILL_BOOK_STATUS_EMOJI: Record<number, string> = {
  [SKILL_BOOK_STATUS_UNIDENTIFIED]: '❓',
  [SKILL_BOOK_STATUS_IDENTIFIED]: '📖',
  [SKILL_BOOK_STATUS_LEARNED]: '✅',
  [SKILL_BOOK_STATUS_IN_USE]: '⚡'
} as const;

// ==================== 技能类型常量 ====================
export const SKILL_TYPE_BATTLE = '战技';
export const SKILL_TYPE_PASSIVE = '被动技';
export const SKILL_TYPE_MYSTIC = '神通';

// 技能类型映射（用于命令参数到类型名称的映射）
export const SKILL_TYPE_MAP: Record<string, string> = {
  战技: SKILL_TYPE_BATTLE,
  被动技: SKILL_TYPE_PASSIVE,
  神通: SKILL_TYPE_MYSTIC
} as const;

// ==================== 功法残页返还常量 ====================

// 返还值使用功法经验表示，后续统一折算为功法残页。
export const SKILL_BOOK_DECOMPOSE_BASE_EXP_BY_QUALITY = {
  1: 2000,
  2: 2000,
  3: 6000
};

// ==================== 指令关键字常量 ====================
export const CONFIRM_KEYWORD = '确认';

// ==================== 最小值常量 ====================
export const MIN_SKILL_BOOK_INDEX = 1;
export const MIN_SKILL_BOOK_ID = 1;
