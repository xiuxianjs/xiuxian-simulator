import { displayCurrencyText } from '@src/constants/currency';
import { formatNumber } from '@src/utils/formatHelper';
import { KV_SEPARATOR, PROGRESS_CELLS, QUANTITY_MARK, REWARD_PREFIX, STATUS_SYMBOL, VALUE_SEPARATOR, type BubbleStatus } from './tokens';

/** 键值行：`标签：值`。 */
export const kvLine = (label: string, value: string | number): string => `${label}${KV_SEPARATOR}${value}`;

/** 同类多值合并：`值 · 值 · 值`，空值不占位。 */
export const joinValues = (...values: Array<string | number | undefined | null>): string => values.filter(value => value !== undefined && value !== null && value !== '').join(VALUE_SEPARATOR);

/** 数量：`名称 ×N`。 */
export const quantityText = (name: string, count: number): string => `${name} ${QUANTITY_MARK}${count}`;

/** 奖励行：`🎁 获得：名称 ×1、名称 ×2`。 */
export const rewardLine = (rewards: string[]): string => `${REWARD_PREFIX}${rewards.join('、')}`;

/** 状态行：符号固定在行首；none 时保持原文本。 */
export const statusLine = (status: BubbleStatus, text: string): string => (status === 'none' ? text : `${STATUS_SYMBOL[status]}${text ? ` ${text}` : ''}`);

/**
 * 进度条：统一 10 格 `▓▓▓░░░░░░ 42%`。
 * 上限为 0 或非正数时按 0% 处理，超过上限按 100% 显示。
 */
export const progressBar = (current: number, max: number): string => {
  const ratio = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  const filled = Math.floor(ratio * PROGRESS_CELLS);
  const percent = Math.floor(ratio * 100);

  return `${'▓'.repeat(filled)}${'░'.repeat(PROGRESS_CELLS - filled)} ${percent}%`;
};

/** 大数字统一万/亿显示。 */
export const bigNumber = (value: number): string => formatNumber(value);

/** 货币文案统一走既有映射。 */
export const currencyText = (value: string): string => displayCurrencyText(value);

/** 标题追加状态徽章；无标题或无状态时保持原样。 */
export const titleWithStatus = (title: string, status: BubbleStatus = 'none'): string => status === 'none' || !title ? title : `${title} ${STATUS_SYMBOL[status]}`;

/** 主动通知标题：统一追加 ` · 通知`，已包含时不重复。 */
export const noticeTitle = (title: string): string => (title.includes('通知') ? title : `${title} · 通知`);
