import { EMPTY_STRING } from '@src/constants';
import { decomposeBackendEquipment } from '@src/api/bot/equipment-decompose';
import type { BackendRequestContext } from '@src/api/bot/context';

export function parseDecomposeCommand(messageText: string): number | null {
  const text = (messageText || EMPTY_STRING).replace(/^(!|！|\/|#|＃)?分解装备\s*/, EMPTY_STRING).trim();
  const idStr = text.split(/\s+/)[0];

  if (!idStr) {
    return null;
  }

  const id = parseInt(idStr, 10);

  if (isNaN(id) || id <= 0) {
    return -1;
  }

  return id;
}

type Result = { code: 'OK'; data: { message: string } } | { code: 'FAIL'; data: { message: string } };

export default async function App(params: {
  bid?: string;
  uid: number;
  equipmentId: number;
  messageText?: string;
  request?: BackendRequestContext;
}): Promise<Result> {
  try {
    const result = await decomposeBackendEquipment(params.bid, params.uid, params.equipmentId, params.request, params.messageText);

    return {
      code: 'OK',
      data: { message: `分解成功！【${result.equipmentName}】(${result.equipmentGrade}) → ${result.yieldItemName} ×${result.yieldQuantity}` }
    };
  } catch (error) {
    return { code: 'FAIL', data: { message: error instanceof Error ? error.message : '分解失败，请稍后再试' } };
  }
}
