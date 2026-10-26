import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend } from './client';
import type { BackendRequestContext } from './context';
import { parseSoulArtifactEquipPreview, parseSoulArtifactEquipResult } from './soul-artifact-equip';
import { parseSoulArtifactUnequipResult } from './soul-artifact-unequip';
import { parseConsumeResult } from './consume';

function row(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('本命物指令响应不完整');
  }

  return value as Record<string, unknown>;
}
export async function refineBackendSoulArtifact(
  bid: string | undefined,
  uid: number,
  instanceId: number,
  confirmed: boolean,
  request?: BackendRequestContext,
  repeatCommand?: string
) {
  if (!bid) {
    throw new Error('缺少平台身份');
  }
  const data = row(
    await requestBackend(bid, 'post_players_id_soul_artifacts_refine_command', {
      path: { id: uid },
      body: { instanceId, confirmed },
      headers: repeatPresentationHeaders(repeatCommand),
      requestId: request?.requestId,
      idempotencyKey: request?.idempotencyKey
    })
  );

  return parseSoulRefineCommand(data);
}

export function parseSoulRefineCommand(value: unknown) {
  const data = row(value);

  return {
    repeatSuffix: typeof data.repeatSuffix === 'string' ? data.repeatSuffix : '',
    preview: parseSoulArtifactEquipPreview(data.preview),
    equipped: data.equipped === null ? null : parseSoulArtifactEquipResult(data.equipped),
    consumed: data.consumed === null ? null : parseConsumeResult(data.consumed)
  };
}
export async function commandBackendSoulArtifactUnequip(
  bid: string | undefined,
  uid: number,
  confirmed: boolean,
  request?: BackendRequestContext,
  repeatCommand?: string
) {
  if (!bid) {
    throw new Error('缺少平台身份');
  }

  return parseSoulArtifactUnequipResult(
    await requestBackend(bid, 'post_players_id_soul_artifacts_unequip_command', {
      path: { id: uid },
      body: { confirmed },
      headers: repeatPresentationHeaders(repeatCommand),
      requestId: request?.requestId,
      idempotencyKey: request?.idempotencyKey
    })
  );
}
