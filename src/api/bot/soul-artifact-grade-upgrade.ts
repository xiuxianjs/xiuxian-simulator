import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

export type SoulArtifactGradeUpgradeResponse = {
  artifact: { id: number; artifactId: number; name: string; gradeId: number; level: number };
  consumed: number;
  previousGrade: number;
  newGrade: number;
  previousGradeName: string;
  newGradeName: string;
};

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('本命物升品接口响应不完整');
  }

  return value as Record<string, unknown>;
}

function integer(value: unknown, field: string, allowZero = false): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || (!allowZero && value <= 0)) {
    throw new Error(`本命物升品接口字段无效: ${field}`);
  }

  return value;
}

export async function upgradeBackendSoulArtifactGrade(
  bid: string | undefined,
  uid: number,
  artifactId: number | undefined,
  request?: BackendRequestContext
): Promise<SoulArtifactGradeUpgradeResponse> {
  if (!bid) {
    throw new Error('缺少平台身份');
  }

  return parseSoulArtifactGradeUpgrade(
    await requestBackend(bid, 'post_players_id_soul_artifacts_grade_upgrade', {
      path: { id: uid },
      body: artifactId === undefined ? {} : { artifactId },
      ...writeContext(request)
    })
  );
}

export function parseSoulArtifactGradeUpgrade(value: unknown): SoulArtifactGradeUpgradeResponse {
  const data = record(value);
  const artifact = record(data.artifact);

  if (typeof artifact.name !== 'string') {
    throw new Error('本命物升品接口字段无效: artifact.name');
  }
  if (typeof data.previousGradeName !== 'string' || !data.previousGradeName || typeof data.newGradeName !== 'string' || !data.newGradeName) {
    throw new Error('本命物升品接口字段无效: gradeName');
  }

  return {
    artifact: {
      id: integer(artifact.id, 'artifact.id'),
      artifactId: integer(artifact.artifactId, 'artifact.artifactId'),
      name: artifact.name,
      gradeId: integer(artifact.gradeId, 'artifact.gradeId'),
      level: integer(artifact.level, 'artifact.level', true)
    },
    consumed: integer(data.consumed, 'consumed'),
    previousGrade: integer(data.previousGrade, 'previousGrade'),
    newGrade: integer(data.newGrade, 'newGrade'),
    previousGradeName: data.previousGradeName,
    newGradeName: data.newGradeName
  };
}
