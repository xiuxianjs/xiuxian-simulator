import type { GlossaryApplyResult } from '../schemas/glossary-apply';
import type { BackendRequestContext } from './context';
import { requestBackend, writeContext } from './client';
export async function applyBackendGlossaryEdit(bid: string | undefined, reason: string, request?: BackendRequestContext): Promise<GlossaryApplyResult> {
  if (!bid) {
    throw new Error('申请缺少平台身份');
  }
  const context = writeContext(request);
  const result = await requestBackend(bid, 'post_glossary_edit_applications', { body: { reason }, ...context });

  return parseBackendGlossaryApply(result);
}
export function parseBackendGlossaryApply(result: any): GlossaryApplyResult {
  if (
    !result ||
    typeof result !== 'object' ||
    Array.isArray(result) ||
    typeof result.outcome !== 'string' ||
    !['submitted', 'reason_too_long', 'already_allowed', 'pending', 'player_missing', 'realm_missing', 'realm_locked'].includes(result.outcome)
  ) {
    throw new Error('词典申请响应不完整');
  }

  return result;
}
