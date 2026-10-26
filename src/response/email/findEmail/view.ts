import type { EmailDetailData } from '@src/api/schemas/email-detail';
export type EmailDisplayGood = { category?: string; name?: string; quantity?: number };

type FindEmailResult =
  | { code: 'NOT_FOUND'; emailId: string }
  | {
      code: 'OK';
      emailId: number;
      name: string | null;
      subtitle: string;
      data: string;
      state: number;
      goodsList: EmailDisplayGood[];
      hasGoods: boolean;
      canClaim: boolean;
      canDelete: boolean;
    };

export function emailDetailView(result: EmailDetailData): Extract<FindEmailResult, { code: 'OK' }> {
  let goodsList: EmailDisplayGood[] = [];

  if (result.goods && Array.isArray(result.goods)) {
    goodsList = result.goods as EmailDisplayGood[];
  }

  const hasGoods = goodsList.length > 0;

  // Action availability is a Go lifecycle projection. The bot only renders it.
  const canClaim = result.canClaim;
  const canDelete = result.canDelete;

  return {
    code: 'OK',
    emailId: result.id,
    name: result.name,
    subtitle: result.subtitle ?? '',
    data: result.data ?? '',
    state: result.state,
    goodsList,
    hasGoods,
    canClaim,
    canDelete
  };
}
