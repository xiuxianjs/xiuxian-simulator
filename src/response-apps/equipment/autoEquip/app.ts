import { autoEquipBackendEquipment } from '@src/api/bot/equipment-auto-equip';
import type { BackendRequestContext } from '@src/api/bot/context';

type Result =
  | {
      code: 'OK';
      data: {
        message: string;
        results: Array<{
          typeName: string;
          equipped: boolean;
          equipmentName?: string;
          reason?: string;
        }>;
        power?: number;
      };
    }
  | { code: 'FAIL'; data: { message: string } };

export default async function App(params: { bid?: string; uid: number; messageText?: string; request?: BackendRequestContext }): Promise<Result> {
  try {
    const result = await autoEquipBackendEquipment(params.bid, params.uid, params.request, params.messageText);

    if (!result.success && result.results.length === 0) {
      return { code: 'FAIL', data: { message: result.message } };
    }

    return { code: 'OK', data: { message: result.message, results: result.results, power: result.power } };
  } catch {
    return { code: 'FAIL', data: { message: '一键装备失败，请稍后重试' } };
  }
}
