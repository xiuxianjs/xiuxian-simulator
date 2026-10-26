import { repeatPresentationHeaders } from './repeat-presentation';
import type { BackendRequestContext } from './context';
import { requestBackend, writeContext } from './client';
export async function confirmBackendPeiyuan(bid: string | undefined, uid: number, request?: BackendRequestContext): Promise<any> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  return await requestBackend(bid, 'post_players_id_peiyuan_dan_confirm', {
    path: { id: uid },
    headers: repeatPresentationHeaders('确认培元丹'),
    ...writeContext(request)
  });
}

export function parsePeiyuanConfirm(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('培元丹确认回执不完整');
  }
  const data = value as Record<string, unknown>;
  // The domain returns a nil Go slice for a valid empty preview.
  const changes = data.changes === null ? [] : data.changes;

  if (!Array.isArray(changes)) {
    throw new Error('培元丹确认回执不完整');
  }

  return {
    changes: changes.map(value => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('培元丹确认回执不完整');
      }
      const change = value as Record<string, unknown>;

      if (
        typeof change.attributeName !== 'string' ||
        !Number.isSafeInteger(change.change) ||
        !Number.isSafeInteger(change.oldValue) ||
        !Number.isSafeInteger(change.newValue)
      ) {
        throw new Error('培元丹确认回执不完整');
      }

      return { attributeName: change.attributeName, change: change.change as number, oldValue: change.oldValue as number, newValue: change.newValue as number };
    })
  };
}
