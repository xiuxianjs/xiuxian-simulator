import { getBackendEquipmentBag, type EquipmentBagData } from '@src/api';
import { logger } from 'alemonjs';

export type StorageEquipmentsResult = { code: 'OK'; data: EquipmentBagData } | { code: 'LOAD_FAILED' };

export default async function App(params: { bid?: string; uid: number; equipmentType: string | null; page: number }): Promise<StorageEquipmentsResult> {
  try {
    const result = await getBackendEquipmentBag(params.bid, params.uid, params.equipmentType, params.page);

    return {
      code: 'OK',
      data: result
    };
  } catch (error) {
    logger.error('查询装备失败:', error);

    return { code: 'LOAD_FAILED' };
  }
}
