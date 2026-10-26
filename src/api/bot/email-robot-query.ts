import { parseBackendEmails } from './queries';
import { parseEmailDetail } from './email-detail';
import { emailListView } from '@src/response/email/MyEmailList/view';
import { emailDetailView } from '@src/response/email/findEmail/view';

export function emailListArguments(text: string) {
  const match = text.trim().match(/^(!|！|\/|#|＃)?我的邮件\s*(\d+)?$/);

  return { pageText: String(match?.[2] ? Number(match[2]) : 1) };
}
export function emailDetailArguments(text: string) {
  const idText = text.replace(/^(!|！|\/|#|＃)?查看邮件/, '').trim();

  return { idText, idValue: String(Number(idText)) };
}
export function parseRobotEmailList(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('邮件列表响应不完整');
  }
  const row = value as Record<string, unknown>;

  if (typeof row.pageText !== 'string') {
    throw new Error('邮件列表响应不完整');
  }

  return emailListView(parseBackendEmails(row.data), Number(row.pageText));
}
export function parseRobotEmailDetail(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('邮件详情响应不完整');
  }
  const id = (value as Record<string, unknown>).id;

  return emailDetailView(parseEmailDetail(value, typeof id === 'number' ? id : NaN));
}

/** Bind the original request ID so a valid but different mail cannot be rendered. */
export function emailDetailDecoder(emailId: number) {
  return (value: unknown) => emailDetailView(parseEmailDetail(value, emailId));
}
