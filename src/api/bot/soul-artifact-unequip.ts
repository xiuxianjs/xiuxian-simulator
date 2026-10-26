import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import type { SoulArtifactUnequipResult } from '../schemas/soul-artifact-unequip';

export async function unequipBackendSoulArtifact(bid: string | undefined, uid: number, request?: BackendRequestContext): Promise<SoulArtifactUnequipResult> {
  if (!bid) {
    throw new Error('缺少平台身份');
  }
  const data: unknown = await requestBackend(bid, 'post_players_id_soul_artifacts_unequip', {
    path: { id: uid },
    ...writeContext(request)
  });

  const result = parseSoulArtifactUnequipResult(data);

  if (result.outcome === 'confirmation') {
    throw new Error('分离本命物响应不完整');
  }

  return result;
}

export function parseSoulArtifactUnequipResult(
  data: unknown
): SoulArtifactUnequipResult | { outcome: 'confirmation'; artifact: NonNullable<SoulArtifactUnequipResult['artifact']> } {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('分离本命物响应不完整');
  }
  const response = data as Record<string, unknown>;
  const artifact = response.artifact;

  if (response.outcome === 'not_equipped') {
    if (artifact !== null) {
      throw new Error('分离本命物响应不完整');
    }

    return { outcome: 'not_equipped', artifact: null };
  }
  if ((response.outcome !== 'unequipped' && response.outcome !== 'confirmation') || !artifact || typeof artifact !== 'object' || Array.isArray(artifact)) {
    throw new Error('分离本命物响应不完整');
  }
  const row = artifact as Record<string, unknown>;
  const count = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

  if ((row.name !== null && typeof row.name !== 'string') || !count(row.previousLevel) || !count(row.totalCost) || !count(row.refundQuantity)) {
    throw new Error('分离本命物响应不完整');
  }

  return {
    outcome: response.outcome,
    artifact: { name: row.name, previousLevel: row.previousLevel, totalCost: row.totalCost, refundQuantity: row.refundQuantity }
  };
}
