import type { EmailDisplayGood } from '@src/api/schemas/queries';
import type { parseBackendEmails } from '@src/api/bot/queries';
const PAGE_SIZE = 5;

export interface EmailListItem {
  emailId: number;
  name: string;
  subtitle: string;
  state: number;
  goodsList: EmailDisplayGood[];
  canClaim: boolean;
  canDelete: boolean;
}

type MyEmailListResult =
  | { code: 'EMPTY'; total: number }
  | {
      code: 'OK';
      list: EmailListItem[];
      page: number;
      totalPage: number;
      total: number;
      hasClaimable: boolean;
      hasDeletable: boolean;
    };

export function emailListView(result: ReturnType<typeof parseBackendEmails>, page: number): MyEmailListResult {
  const visibleEmails = result.list ?? [];
  const totalPage = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  if (visibleEmails.length === 0) {
    return { code: 'EMPTY', total: result.total };
  }

  const list: EmailListItem[] = visibleEmails.map(emailItem => {
    const goodsList = emailItem['email.goods'] ?? [];

    return {
      emailId: emailItem['email.id'],
      name: emailItem['email.name'],
      subtitle: emailItem['email.subtitle'] ?? '',
      state: emailItem.state,
      goodsList: Array.isArray(goodsList) ? goodsList : [],
      canClaim: emailItem.canClaim,
      canDelete: emailItem.canDelete
    };
  });

  return {
    code: 'OK',
    list,
    page,
    totalPage,
    total: result.total,
    hasClaimable: result.hasClaimable,
    hasDeletable: result.hasDeletable
  };
}
