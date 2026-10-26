import { logger } from 'alemonjs';
import { getBackendInventory, type BackendInventoryPage, type BackendRequestContext } from '@src/api';

export type StoragePropsResult =
  | {
      code: 'OK';
      data: {
        activeSubcategory: string;
        page: number;
        total: number;
        pageSize: number;
        items: BackendInventoryPage['items'];
        capabilities: BackendInventoryPage['capabilities'];
      };
    }
  | { code: 'LOAD_FAILED' };

export default async function App(params: {
  uid: number;
  subcategory: string | null;
  page: number;
  bid?: string;
  request?: BackendRequestContext;
}): Promise<StoragePropsResult> {
  try {
    if (!params.bid) {
      throw new Error('背包请求缺少平台身份');
    }
    const remote = await getBackendInventory(
      params.bid,
      params.uid,
      { category: 'prop', subtype: params.subcategory ?? undefined, page: params.page },
      params.request
    );

    return {
      code: 'OK',
      data: {
        activeSubcategory: remote.activeSubcategory,
        page: remote.pagination.page,
        total: remote.pagination.total,
        pageSize: remote.pagination.pageSize,
        items: remote.items,
        capabilities: remote.capabilities
      }
    };
  } catch (error) {
    logger.error('查询道具失败:', { requestId: params.request?.requestId, error });

    return { code: 'LOAD_FAILED' };
  }
}
