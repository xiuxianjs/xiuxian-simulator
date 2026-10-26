import { parseEmailDelete } from './email-delete';
import { parseEmailDeleteAll } from './email-delete-all';
import { parseEmailClaim } from './email-claim';
import { parseEmailClaimAll } from './email-claim-all';

export function emailActionArguments(text: string, command: '删除邮件' | '领取邮件') {
  const pattern = command === '删除邮件' ? /^(!|！|\/|#|＃)?删除邮件/ : /^(!|！|\/|#|＃)?领取邮件/;
  const raw = text.replace(pattern, '').trim();
  const id = Number(raw);

  return { emailId: Number.isSafeInteger(id) && id >= 1 ? id : null };
}
export function emailDeleteDecoder(id: number) {
  return (value: unknown) => {
    const result = parseEmailDelete(value, id);

    if (result.confirmationRequired) {
      return { code: 'CONFIRM' as const, emailId: id, expiresInSeconds: result.confirmationExpiresInSeconds! };
    }
    if (!result.deleted) {
      throw new Error('删除邮件结果不完整');
    }

    return { code: 'DELETED' as const };
  };
}
export function emailClaimDecoder(id: number) {
  return (value: unknown) => parseEmailClaim(value, id);
}
export { parseEmailDeleteAll, parseEmailClaimAll };
