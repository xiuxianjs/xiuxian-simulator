import { equipBackendEquipment } from '@src/api/bot/equipment-equip';
import type { BackendRequestContext } from '@src/api/bot/context';
import { MSG_EQUIPMENT } from '@src/constants/messages';

export { parseEquipCommand } from '@src/api/bot/equipment-equip';

type Result = { code: 'OK'; data: { message: string; equipment: any } } | { code: 'FAIL'; data: { message: string } };

export default async function App(params: {
  bid?: string;
  uid: number;
  identifier: string;
  messageText?: string;
  request?: BackendRequestContext;
}): Promise<Result> {
  try {
    const result = await equipBackendEquipment(params.bid, params.uid, params.identifier, params.request, params.messageText);

    if (result.outcome !== 'equipped' || !result.equipment) {
      const messages = {
        not_found: '未找到该装备',
        not_found_or_equipped: '未找到该装备或装备已被装备',
        life_equipment: MSG_EQUIPMENT.CRAFT_EQUIP_USE_REPLACE,
        realm_insufficient: MSG_EQUIPMENT.REALM_INSUFFICIENT
      };

      return { code: 'FAIL', data: { message: messages[result.outcome] } };
    }
    const item = result.equipment;

    return {
      code: 'OK',
      data: {
        message: `成功装备 ${item.name}`,
        equipment: {
          ...item,
          equipment: { name: item.name, grade: { name: item.grade }, equipmentType: { name: item.equipmentType } }
        }
      }
    };
  } catch {
    return { code: 'FAIL', data: { message: MSG_EQUIPMENT.EQUIP_FAILED } };
  }
}
