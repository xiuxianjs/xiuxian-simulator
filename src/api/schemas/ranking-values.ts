export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('查询接口返回格式不完整');
  }

  return value as Record<string, unknown>;
}
export function number(value: unknown, message = '查询接口缺少数值字段'): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new Error(message);
  }

  return value;
}
export function text(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('查询接口缺少文本字段');
  }

  return value;
}
