import { applyBackendGlossaryEdit } from '@src/api/bot/glossary-apply';
import type { BackendRequestContext } from '@src/api/bot/context';

export const GLOSSARY_APPLY_REASON_MAX_LENGTH = 100;

export function parseApplyParams(messageText: string) {
  const raw = (messageText ?? '').trim();
  const reason = raw.replace(/^(!|！|\/|#|＃)?申请词典编辑权限\s*/, '').trim();

  return {
    reason: reason || ''
  };
}

export async function applyGlossaryEditPermission(bid: string | undefined, reason: string, request?: BackendRequestContext) {
  const result = await applyBackendGlossaryEdit(bid, reason, request);

  if (result.outcome === 'submitted') {
    return { success: true };
  }
  const reasons = {
    reason_too_long: `申请理由不能超过${GLOSSARY_APPLY_REASON_MAX_LENGTH}字`,
    already_allowed: '你已拥有词典编辑权限，无需重复申请',
    pending: '你已有待审核的词典编辑申请，请耐心等待',
    player_missing: '玩家数据异常，请稍后再试',
    realm_missing: '境界信息不存在，请稍后再试',
    realm_locked: '需达到金丹初期后才可申请词典编辑权限'
  };

  return { success: false, reason: reasons[result.outcome] };
}
