/**
 * 气泡样式统一词表。
 *
 * 状态符号、分隔符、数量格式与按钮预算集中在此，避免各页面各写一套。
 * 业务事实仍以服务端为准，这里只负责展示形态。
 */

/** 四态：成功 / 失败 / 跳过 / 警告；none 表示无状态。 */
export type BubbleStatus = 'done' | 'fail' | 'skip' | 'warn' | 'none';

export const STATUS_SYMBOL: Record<Exclude<BubbleStatus, 'none'>, string> = {
  done: '✅',
  fail: '❌',
  skip: '·',
  warn: '⚠️'
};

/** 同类多值之间的分隔符，前后各一个空格。 */
export const VALUE_SEPARATOR = ' · ';

/** 键值分隔符：统一全角冒号。 */
export const KV_SEPARATOR = '：';

/** 数量标记：统一乘号，禁止 x / *。 */
export const QUANTITY_MARK = '×';

/** 奖励行前缀。 */
export const REWARD_PREFIX = '🎁 获得：';

/** 锁定/未解锁入口前缀。 */
export const LOCK_MARK = '🔒';

/** 主页通知入口图标（沿用既有语义）。 */
export const NOTICE_ICON = {
  mail: '📬',
  friend: '🤝',
  team: '⚔️',
  guild: '🏯',
  companion: '💕',
  cave: '🌿',
  killGod: '☠️',
  flyMail: '✉️',
  notice: '🔔'
} as const;

/** 进度条格数。 */
export const PROGRESS_CELLS = 10;

/** 按钮与文案预算。 */
export const BUBBLE_LIMITS = {
  headerButtons: 3,
  sectionButtons: 3,
  footerButtonsPerRow: 4,
  footerRows: 2,
  totalButtons: 10,
  homeTotalButtons: 18,
  commandCharacters: 80
} as const;
