import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import type { SoulArtifactLevelComparison, SoulArtifactLevelUpgrade } from '../schemas/soul-artifact-upgrade';

const comparisonKeys = new Set<SoulArtifactLevelComparison['key']>(['patk', 'matk', 'pdef', 'mdef', 'hp', 'speed']);

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('本命物升级响应不完整');
  }

  return value as Record<string, unknown>;
}

function nonnegativeInteger(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`本命物升级响应字段无效: ${field}`);
  }

  return value;
}

function finiteNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`本命物升级响应字段无效: ${field}`);
  }

  return value;
}

export async function upgradeBackendSoulArtifactLevel(
  bid: string | undefined,
  uid: number,
  levels: number,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<SoulArtifactLevelUpgrade> {
  if (!bid) {
    throw new Error('缺少平台身份');
  }

  return parseSoulArtifactLevelUpgrade(
    await requestBackend(bid, 'post_players_id_soul_artifacts_upgrade', {
      path: { id: uid },
      body: { levels },
      headers: repeatPresentationHeaders(repeatCommand),
      ...writeContext(request)
    })
  );
}

export function parseSoulArtifactLevelUpgrade(value: unknown): SoulArtifactLevelUpgrade {
  const response = record(value);
  const artifact = record(response.artifact);

  if (typeof artifact.name !== 'string') {
    throw new Error('本命物升级响应字段无效: artifact.name');
  }
  if (
    !Array.isArray(response.comparison) ||
    typeof response.message !== 'string' ||
    !Array.isArray(response.compareLines) ||
    !response.compareLines.every(line => typeof line === 'string')
  ) {
    throw new Error('本命物升级响应字段无效: comparison');
  }
  const comparison = response.comparison.map(value => {
    const row = record(value);

    if (typeof row.key !== 'string' || !comparisonKeys.has(row.key as SoulArtifactLevelComparison['key'])) {
      throw new Error('本命物升级响应字段无效: comparison.key');
    }

    return {
      key: row.key as SoulArtifactLevelComparison['key'],
      before: finiteNumber(row.before, 'comparison.before'),
      after: finiteNumber(row.after, 'comparison.after')
    };
  });

  return {
    artifact: {
      id: nonnegativeInteger(artifact.id, 'artifact.id'),
      name: artifact.name,
      level: nonnegativeInteger(artifact.level, 'artifact.level')
    },
    previousLevel: nonnegativeInteger(response.previousLevel, 'previousLevel'),
    actualLevels: nonnegativeInteger(response.actualLevels, 'actualLevels'),
    cost: nonnegativeInteger(response.cost, 'cost'),
    comparison,
    message: response.message,
    compareLines: response.compareLines
  };
}

export function parseRobotSoulArtifactUpgrade(value: unknown): { result: SoulArtifactLevelUpgrade; message: string } {
  const data = record(value);

  if (typeof data.message !== 'string') {
    throw new Error('本命物升级响应不完整');
  }

  return { result: parseSoulArtifactLevelUpgrade(data.result), message: data.message };
}
