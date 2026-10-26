import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import type { EmailDeleteData } from '../schemas/email-delete';

export async function attemptBackendEmailDelete(
  bid: string | undefined,
  uid: number,
  emailId: number,
  request?: BackendRequestContext
): Promise<EmailDeleteData> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const result: unknown = await requestBackend(bid, 'post_players_id_emails_emailId_delete_attempt', {
    headers: repeatPresentationHeaders('删除邮件'),
    path: { id: uid, emailId },
    ...writeContext(request)
  });

  return parseEmailDelete(result, emailId);
}
export function parseEmailDelete(result: unknown, emailId: number): EmailDeleteData {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new Error('删除邮件确认响应不完整');
  }
  const row = result as Record<string, unknown>;

  if (row.emailId !== emailId || typeof row.deleted !== 'boolean') {
    throw new Error('删除邮件确认返回对象不一致');
  }
  if (row.confirmationRequired === true && (row.deleted || row.confirmationExpiresInSeconds !== 60)) {
    throw new Error('删除邮件确认窗口无效');
  }
  if (row.confirmationRequired !== undefined && typeof row.confirmationRequired !== 'boolean') {
    throw new Error('删除邮件确认状态无效');
  }

  return result as EmailDeleteData;
}
