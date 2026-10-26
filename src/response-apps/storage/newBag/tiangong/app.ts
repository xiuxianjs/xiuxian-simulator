import { getBackendProfessionToolBag } from '@src/api/bot';
import { logger } from 'alemonjs';

export type TiangongBagCapability = 'replace' | 'lock' | 'unlock' | 'viewDetail' | 'lockAll' | 'unlockAll';
export type TiangongBagItem = {
  id: number;
  name: string;
  grade: string;
  isLocked: number;
  capabilities: TiangongBagCapability[];
};

export type StorageTiangongResult =
  | {
      code: 'OK';
      data: {
        types: string[];
        activeType: string | null;
        page: number;
        total: number;
        totalPages: number;
        items: TiangongBagItem[];
        capabilities: TiangongBagCapability[];
      };
    }
  | { code: 'LOAD_FAILED' };

export default async function App(params: { bid?: string; uid: number; equipmentType: string | null; page: number }): Promise<StorageTiangongResult> {
  try {
    const data = await getBackendProfessionToolBag(params.bid, params.uid, params.equipmentType ?? undefined, params.page);

    return { code: 'OK', data };
  } catch (error) {
    logger.error('查询天工工具失败:', error);

    return { code: 'LOAD_FAILED' };
  }
}
