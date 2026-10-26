import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import type { EmailDeleteAllData } from '../schemas/email-delete-all';

export async function deleteAllBackendEmails(bid: string | undefined, uid: number, request?: BackendRequestContext): Promise<EmailDeleteAllData> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const context = writeContext(request);
  const data: unknown = await requestBackend(bid, 'delete_players_id_emails', {
    headers: repeatPresentationHeaders('一键删除邮件'),
    path: { id: uid },
    ...context
  });

  return parseEmailDeleteAll(data);
}
export function parseEmailDeleteAll(data: unknown): EmailDeleteAllData {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('批量删除邮件响应不完整');
  }
  const row = data as Record<string, unknown>;

  if (
    typeof row.deleted !== 'number' ||
    !Number.isSafeInteger(row.deleted) ||
    row.deleted < 0 ||
    typeof row.total !== 'number' ||
    !Number.isSafeInteger(row.total) ||
    row.total < row.deleted
  ) {
    throw new Error('批量删除邮件计数不完整');
  }

  return data as EmailDeleteAllData;
}
