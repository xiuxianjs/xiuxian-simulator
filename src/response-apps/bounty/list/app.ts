import { PAGE_SIZE } from '@src/constants';
/**
 * 悬赏榜 - 业务逻辑层
 */
import { getBackendBounties } from '@src/api/bot/bounty-queries';

type ListResult = {
  code: 'OK';
  data: {
    list: Awaited<ReturnType<typeof getBackendBounties>>['list'];
    total: number;
    page: number;
    totalPages: number;
  };
};

export type { ListResult };

export default async function App(params: { bid?: string; page: number }): Promise<ListResult> {
  let { page } = params;

  if (!Number.isFinite(page) || page < 1) {
    page = 1;
  }

  const { list, total } = await getBackendBounties(params.bid, page);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return {
    code: 'OK',
    data: { list, total, page, totalPages }
  };
}
