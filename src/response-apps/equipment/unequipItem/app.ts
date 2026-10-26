import { unequipBackendEquipmentOne } from '@src/api/bot/equipment-unequip-one';
import type { BackendRequestContext } from '@src/api/bot/context';
import { MSG_EQUIPMENT } from '@src/constants/messages';

type Result = { code: 'OK'; data: { message: string } } | { code: 'FAIL'; data: { message: string } } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  bid?: string;
  uid: number;
  equipmentTypeName: string;
  messageText?: string;
  request?: BackendRequestContext;
}): Promise<Result> {
  try {
    const result = await unequipBackendEquipmentOne(params.bid, params.uid, params.equipmentTypeName, params.request, params.messageText);
    const messages = {
      type_missing: MSG_EQUIPMENT.TYPE_NOT_FOUND,
      templates_missing: `未找到${params.equipmentTypeName}类型的装备`,
      not_equipped: `未装备任何${params.equipmentTypeName}`,
      unequipped: `成功卸下${params.equipmentTypeName}`,
      failed: MSG_EQUIPMENT.UNEQUIP_FAILED
    };

    return { code: result.outcome === 'unequipped' ? 'OK' : 'FAIL', data: { message: messages[result.outcome] } };
  } catch {
    return { code: 'FAIL', data: { message: MSG_EQUIPMENT.UNEQUIP_FAILED } };
  }
}
