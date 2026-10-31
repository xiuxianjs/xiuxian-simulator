/**
 * 通用格式化工具
 */

/** 格式化大数字为中文可读形式（万 / 亿） */
export function formatNumber(n: number | bigint): string {
  if (typeof n === 'number' && !Number.isInteger(n)) {
    if (!Number.isFinite(n) || Math.abs(n) > Number.MAX_SAFE_INTEGER) {
      throw new Error('无法格式化非精确数值');
    }
    if (Math.abs(n) < 10000) {
      return String(n);
    }
    // Fractional quantities are display values, not integer currencies.
    const units = ['', '万', '亿', '万亿', '亿亿'];
    let index = Math.min(4, Math.floor(Math.log10(Math.abs(n)) / 4));

    if (Number((Math.abs(n) / 10000 ** index).toFixed(2)) >= 10000 && index < 4) {
      index++;
    }

    return `${(n / 10000 ** index).toFixed(2).replace(/\.?0+$/, '')}${units[index]}`;
  }

  return formatDamage(n);
}

/** Format exact integer damage without converting bigint to a lossy number. */
export function formatDamage(value: number | bigint): string {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) {
    throw new Error('无法格式化已丢失精度的整数');
  }
  if (value < 0) {
    return `-${formatDamage(-value)}`;
  }
  const amount = BigInt(value);
  const units = ['', '万', '亿', '万亿', '亿亿'];
  let index = 0;
  let divisor = 1n;

  while (index < units.length - 1 && amount >= divisor * 10000n) {
    divisor *= 10000n;
    index++;
  }
  if (index === 0) {
    return amount.toString();
  }
  let hundredths = (amount * 100n + divisor / 2n) / divisor;

  if (hundredths >= 1000000n && index < units.length - 1) {
    divisor *= 10000n;
    index++;
    hundredths = (amount * 100n + divisor / 2n) / divisor;
  }
  const fraction = (hundredths % 100n).toString().padStart(2, '0').replace(/0+$/, '');

  return `${hundredths / 100n}${fraction ? `.${fraction}` : ''}${units[index]}`;
}
