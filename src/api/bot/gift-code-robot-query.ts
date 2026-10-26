import { extractCode } from '@src/response/redeemCode/claim/command';
import { parseGiftCodeRedeemResult } from './gift-code-redeem';

export function giftCodeArguments(text: string) {
  return { code: extractCode(text).replace(/\s+/g, '').trim().toUpperCase() };
}
export function parseRobotGiftCode(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('礼包码响应不完整');
  }
  const row = value as Record<string, unknown>;

  if (row.outcome === 'usage') {
    return { code: 'NO_CODE' as const };
  }
  if (row.outcome !== 'result' || row.kind !== 'custom') {
    throw new Error('礼包码响应不完整');
  }
  const data = parseGiftCodeRedeemResult(row.data, '礼包码兑换');

  return { code: 'CUSTOM_SUCCESS' as const, displayMsg: data.message, rewardSummary: data.rewardSummary };
}
export function parseRobotGiftHub(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || (value as Record<string, unknown>).outcome !== 'menu') {
    throw new Error('兑换码入口响应不完整');
  }

  return { outcome: 'menu' as const };
}
