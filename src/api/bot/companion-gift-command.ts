import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend } from './client';
import type { BackendRequestContext } from './context';
import type { CompanionGiftCommandData, CompanionGiftCommandInput } from '../schemas/companion-gift-command';
import { parseCompanionGiftOptions, parseCompanionGiftTargets } from './companion-gift-preparation-queries';
import { parseCompanionGiftSettlement } from './companion-gift';

export async function commandBackendCompanionGift(
  bid: string | undefined,
  uid: number,
  input: CompanionGiftCommandInput,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<CompanionGiftCommandData> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }
  const data = await requestBackend(bid, 'post_players_id_companion_gifts_command', {
    headers: repeatPresentationHeaders(request?.idempotencyKey ? repeatCommand : undefined),
    path: { id: uid },
    body: input,
    requestId: request?.requestId,
    idempotencyKey: request?.idempotencyKey
  });

  return parseCompanionGiftCommand(data);
}

export function parseCompanionGiftCommand(data: unknown): CompanionGiftCommandData {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('赠礼指令响应不完整');
  }
  const row = data as Record<string, unknown>;

  if (
    typeof row.mode !== 'string' ||
    !['TYPES', 'INVALID', 'OPTIONS', 'TARGETS', 'GIFT'].includes(row.mode) ||
    !Number.isSafeInteger(row.targetId) ||
    Number(row.targetId) < 0 ||
    typeof row.giftName !== 'string' ||
    [row.queryError, row.mutationError].some(v => v !== undefined && typeof v !== 'string')
  ) {
    throw new Error('赠礼指令响应不完整');
  }
  const options = row.options === null ? null : parseCompanionGiftOptions(row.options);
  const targets = row.targets === null ? null : parseCompanionGiftTargets(row.targets, row.giftName || undefined);
  const mutation = row.mutation === null ? null : parseCompanionGiftSettlement(row.mutation);

  if (
    (row.mode === 'OPTIONS' && !options && !row.queryError) ||
    (row.mode === 'TARGETS' && !targets && !row.queryError) ||
    (row.mode === 'GIFT' && !mutation && !row.mutationError)
  ) {
    throw new Error('赠礼指令响应不完整');
  }

  return {
    mode: row.mode as CompanionGiftCommandData['mode'],
    targetId: Number(row.targetId),
    giftName: row.giftName,
    options,
    targets,
    mutation,
    queryError: row.queryError as string | undefined,
    mutationError: row.mutationError as string | undefined
  };
}
