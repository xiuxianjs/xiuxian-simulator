import { parseSoulChooseResult } from './soul-path-choose';
import { parseSoulActionResult } from './soul-path-action';

export function parseSoulConfirm(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('神魂确认响应不完整');
  }
  const data = value as Record<string, unknown>;

  if (data.mode === 'choose') {
    return { mode: 'choose' as const, result: parseSoulChooseResult(data.result) };
  }
  if (data.mode === 'action') {
    return { mode: 'action' as const, result: parseSoulActionResult(data.result) };
  }
  throw new Error('神魂确认响应不完整');
}
