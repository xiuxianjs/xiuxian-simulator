/** Preserve integer tokens before IEEE-754 rounding. IDs still need domain validation. */
export function parseExactJSON(text: string): unknown {
  return JSON.parse(text, (_key: string, value: unknown, context?: { source?: string }) => {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw new Error('响应数值超出支持范围');
    }
    if (typeof value !== 'number' || !Number.isInteger(value) || Number.isSafeInteger(value)) {
      return value;
    }
    if (!context?.source) {
      throw new Error('响应数值超出安全范围，无法精确读取');
    }
    const match = context.source.match(/^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);

    if (!match) {
      throw new Error('响应数值无法精确读取');
    }
    const digits = BigInt(`${match[1]}${match[2]}${match[3] ?? ''}`);
    const scale = Number(match[4] ?? 0) - (match[3]?.length ?? 0);

    if (Math.abs(scale) > 1000) {
      throw new Error('响应数值超出支持范围');
    }
    const divisor = 10n ** BigInt(Math.max(0, -scale));

    if (digits % divisor !== 0n) {
      throw new Error('响应小数超出安全范围');
    }

    return scale >= 0 ? digits * 10n ** BigInt(scale) : digits / divisor;
  });
}

export type ExactInteger = number | bigint;
export function exactInteger(value: unknown): ExactInteger {
  if ((typeof value === 'bigint' || (typeof value === 'number' && Number.isSafeInteger(value))) && value >= 0) {
    return value;
  }
  throw new Error('响应整数无效或已丢失精度');
}
