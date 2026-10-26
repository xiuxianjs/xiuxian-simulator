import { getBackendEquipmentDetail } from '@src/api/bot/equipment-detail-queries';

export const TYPE_NAME_MAP: Record<string, string> = {
  饰品: '头饰',
  法袍: '衣服',
  鞋: '鞋子'
};

export function resolveTypeName(typeName: string): string {
  return TYPE_NAME_MAP[typeName] ?? typeName;
}

export async function getEquipmentDetail(bid: string | undefined, uid: number, typeName: string) {
  const result = await getBackendEquipmentDetail(bid, uid, typeName);

  return {
    playerName: result.playerName === '' ? '未知玩家' : (result.playerName ?? '未知玩家'),
    item: result.item ? { ...result.item, equipment: { name: result.item.name, grade: { name: result.item.gradeName } } } : null
  };
}
