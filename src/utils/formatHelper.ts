/**
 * 通用格式化工具
 */

/** 格式化大数字为中文可读形式（万 / 亿） */
export function formatNumber(n: number): string {
  if (n >= 1e8) {
    return `${(n / 1e8).toFixed(2)}亿`;
  }

  if (n >= 1e4) {
    return `${(n / 1e4).toFixed(1)}万`;
  }

  return String(n);
}
