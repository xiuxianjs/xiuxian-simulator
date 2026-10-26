import type { getBackendGiftRecords } from '@src/api/bot/queries';
export type GiftRecordMode = 'all' | 'send' | 'receive';

const getTitle = (mode: GiftRecordMode) => {
  if (mode === 'send') {
    return '赠礼记录（送出）';
  }

  if (mode === 'receive') {
    return '赠礼记录（收到）';
  }

  return '赠礼记录';
};

const getCmdPrefix = (mode: GiftRecordMode) => {
  if (mode === 'send') {
    return '/赠礼记录 送出';
  }

  if (mode === 'receive') {
    return '/赠礼记录 收到';
  }

  return '/赠礼记录';
};

export function presentGiftRecords(data: Awaited<ReturnType<typeof getBackendGiftRecords>>, mode: GiftRecordMode) {
  return { ...data, title: getTitle(mode), cmdPrefix: getCmdPrefix(mode), mode };
}
