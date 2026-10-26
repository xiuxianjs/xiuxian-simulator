import { getBackendGiftRecords } from '@src/api';
import { PAGE_SIZE } from '@src/constants';
import { logger } from 'alemonjs';

import { presentGiftRecords, type GiftRecordMode } from '@src/utils/giftRecordPresentation';
export type { GiftRecordMode };
export default async function App(params: {
  bid?: string;
  uid: number;
  mode: GiftRecordMode;
  page: number;
}): Promise<{ code: 'OK'; data: ReturnType<typeof presentGiftRecords> } | { code: 'LOAD_FAILED'; data: { message: string } }> {
  try {
    const pageSize = PAGE_SIZE;

    const data = await getBackendGiftRecords(params.bid, params.uid, params.mode, params.page, pageSize);

    return { code: 'OK', data: presentGiftRecords(data, params.mode) };
  } catch (error) {
    logger.error('查看赠礼记录失败:', error);

    return { code: 'LOAD_FAILED', data: { message: '查看赠礼记录失败，请稍后再试' } };
  }
}
