import { BackendAPIError, requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

export type GiftCodeRedeemResult = { message: string; rewardSummary: string[] };

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label}响应不完整`);
  }

  return value as Record<string, unknown>;
}

export function parseGiftCodeRedeemResult(value: unknown, label: string): GiftCodeRedeemResult {
  const row = record(value, label);

  if (typeof row.message !== 'string') {
    throw new Error(`${label}响应不完整`);
  }
  const rewardSummary = row.rewardSummary;

  if (rewardSummary !== undefined && (!Array.isArray(rewardSummary) || rewardSummary.some(item => typeof item !== 'string'))) {
    throw new Error(`${label}奖励响应不完整`);
  }

  return { message: row.message, rewardSummary: rewardSummary ?? [] };
}

function input(bid: string | undefined, uid: number, code: string): { bid: string; code: string } {
  const platformID = bid?.trim();
  const normalized = code.replace(/\s+/g, '').trim().toUpperCase();

  if (!platformID || !Number.isSafeInteger(uid) || uid <= 0 || !normalized) {
    throw new Error('礼包码参数无效');
  }

  return { bid: platformID, code: normalized };
}

export async function redeemBackendGiftCode(
  bid: string | undefined,
  uid: number,
  rawCode: string,
  request?: BackendRequestContext
): Promise<GiftCodeRedeemResult> {
  const { bid: platformID, code } = input(bid, uid, rawCode);

  const response = await requestBackend(platformID, 'post_players_id_gift_codes_redeem', {
    path: { id: uid },
    body: { code },
    ...writeContext(request)
  });

  const row = record(response, '礼包码兑换');

  // The service's persisted receipt replay omits the original message and summary.
  // Accept only a successful receipt tied to this request and an existing mail ID.
  if (
    row.message === undefined &&
    row.rewardSummary === undefined &&
    row.requestId === request?.requestId &&
    typeof row.requestId === 'string' &&
    row.requestId.length > 0 &&
    row.status === 'SUCCEEDED' &&
    typeof row.emailId === 'number' &&
    Number.isSafeInteger(row.emailId) &&
    row.emailId > 0
  ) {
    return { message: '兑换成功，奖励已发送至邮件', rewardSummary: [] };
  }

  return parseGiftCodeRedeemResult(row, '礼包码兑换');
}

export async function redeemBackendExternalGiftCode(
  bid: string | undefined,
  uid: number,
  rawCode: string,
  giftType: 'comeback' | 'test',
  request?: BackendRequestContext
): Promise<GiftCodeRedeemResult> {
  const { bid: platformID, code } = input(bid, uid, rawCode);

  return parseGiftCodeRedeemResult(
    await requestBackend(platformID, 'post_players_id_external_gift_codes_redeem', {
      path: { id: uid },
      body: { code, giftType, platformUserId: platformID },
      ...writeContext(request)
    }),
    '远端礼包码兑换'
  );
}

export function isBackendNotFound(error: unknown): boolean {
  return error instanceof BackendAPIError && error.status === 404;
}
