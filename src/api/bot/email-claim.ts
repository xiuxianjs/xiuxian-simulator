import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import { parsePositiveIssuedRewards } from '../schemas/issued-reward';

export type EmailClaimResult = {
  emailId: number;
  issued: Array<{ type: string; name: string; amount: number }>;
};

export async function claimBackendEmail(bid: string | undefined, uid: number, emailId: number, request?: BackendRequestContext): Promise<EmailClaimResult> {
  if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0 || !Number.isSafeInteger(emailId) || emailId <= 0) {
    throw new Error('邮件领取参数无效');
  }
  const data = await requestBackend(bid, 'post_players_id_emails_emailId_claim', {
    headers: repeatPresentationHeaders('领取邮件'),
    path: { id: uid, emailId },
    ...writeContext(request)
  });

  return parseEmailClaim(data, emailId);
}
export function parseEmailClaim(data: unknown, emailId: number): EmailClaimResult {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('邮件领取响应不完整');
  }
  const result = data as Record<string, unknown>;

  if (result.emailId !== emailId) {
    throw new Error('邮件领取响应不完整');
  }

  return { emailId, issued: parsePositiveIssuedRewards(result.issued, '邮件领取响应不完整') };
}
