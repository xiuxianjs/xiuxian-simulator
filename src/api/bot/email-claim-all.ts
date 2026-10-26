import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

export type EmailClaimAllResult = { claimed: number; skipped: number; total: number };

export async function claimAllBackendEmails(bid: string | undefined, uid: number, request?: BackendRequestContext): Promise<EmailClaimAllResult> {
  if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0) {
    throw new Error('邮件批量领取参数无效');
  }

  const data: unknown = await requestBackend(bid, 'post_players_id_emails_claim_all', {
    headers: repeatPresentationHeaders('一键领取邮件'),
    path: { id: uid },
    ...writeContext(request)
  });

  return parseEmailClaimAll(data);
}
export function parseEmailClaimAll(data: unknown): EmailClaimAllResult {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('批量领取邮件响应不完整');
  }

  const result = data as Record<string, unknown>;

  for (const field of ['claimed', 'skipped', 'total'] as const) {
    if (typeof result[field] !== 'number' || !Number.isSafeInteger(result[field]) || result[field] < 0) {
      throw new Error('批量领取邮件计数不完整');
    }
  }

  const { claimed, skipped, total } = result as Record<'claimed' | 'skipped' | 'total', number>;

  if (claimed + skipped > total) {
    throw new Error('批量领取邮件计数不一致');
  }

  return { claimed, skipped, total };
}
