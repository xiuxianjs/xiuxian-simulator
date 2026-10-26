export function parseGroupSubscriptionResult(value: unknown, action: 'enable' | 'disable') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(action === 'enable' ? '群订阅开启响应不完整' : '群订阅关闭响应不完整');
  }
  const data = value as Record<string, unknown>;
  const field = action === 'enable' ? 'switched' : 'disabled';

  if (typeof data[field] !== 'boolean') {
    throw new Error(action === 'enable' ? '群订阅开启响应不完整' : '群订阅关闭响应不完整');
  }

  return { switched: action === 'enable' ? data[field] : false, disabled: action === 'disable' ? data[field] : false };
}
