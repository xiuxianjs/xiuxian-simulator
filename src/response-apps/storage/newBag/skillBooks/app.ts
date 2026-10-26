import { getBackendSkillBookBag, type SkillBookStoragePageData } from '@src/api';
import { logger } from 'alemonjs';

export type StorageSkillBooksResult =
  | {
      code: 'OK';
      data: SkillBookStoragePageData;
    }
  | { code: 'LOAD_FAILED' };

export default async function App(params: { bid?: string; uid: number; skillType: string | null; page: number }): Promise<StorageSkillBooksResult> {
  try {
    const result = await getBackendSkillBookBag(params.bid, params.uid, params.skillType, params.page);

    return {
      code: 'OK',
      data: {
        skillType: result.skillType,
        page: result.page,
        total: result.total,
        totalPages: result.totalPages,
        items: result.items,
        capabilities: result.capabilities
      }
    };
  } catch (error) {
    logger.error('查询功法失败:', error);

    return { code: 'LOAD_FAILED' };
  }
}
