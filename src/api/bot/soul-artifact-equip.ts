import type { SoulArtifactEquipPreview, SoulArtifactEquipResult } from '../schemas/soul-artifact-equip';

function record(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(message);
  }

  return value as Record<string, unknown>;
}

function integer(value: unknown, message: string, minimum = 0): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum) {
    throw new Error(message);
  }

  return value;
}

function previewItem(value: unknown): SoulArtifactEquipPreview['target'] {
  if (value === null) {
    return null;
  }
  const item = record(value, '本命物炼化预览响应不完整');

  if (typeof item.name !== 'string' || !Array.isArray(item.panels)) {
    throw new Error('本命物炼化预览响应不完整');
  }
  const instanceId = integer(item.instanceId, '本命物炼化预览响应不完整', 1);
  const gradeId = integer(item.gradeId, '本命物炼化预览响应不完整', 1);
  const level = integer(item.level, '本命物炼化预览响应不完整');
  const panels = item.panels.map(panel => {
    const fact = record(panel, '本命物炼化预览响应不完整');

    if (typeof fact.key !== 'string' || typeof fact.value !== 'number' || !Number.isFinite(fact.value) || typeof fact.isPercent !== 'boolean') {
      throw new Error('本命物炼化预览响应不完整');
    }

    return { key: fact.key, value: fact.value, isPercent: fact.isPercent };
  });

  return { instanceId, name: item.name, gradeId, level, panels };
}

export function parseSoulArtifactEquipPreview(value: unknown): SoulArtifactEquipPreview {
  const data = record(value, '本命物炼化预览响应不完整');

  if (typeof data.found !== 'boolean' || typeof data.needsConfirmation !== 'boolean') {
    throw new Error('本命物炼化预览响应不完整');
  }
  const target = previewItem(data.target);
  const current = previewItem(data.current);

  const refundQuantity = integer(data.refundQuantity, '本命物炼化预览响应不完整');

  if (!data.found && (target !== null || current !== null || data.needsConfirmation || data.refundQuantity !== 0)) {
    throw new Error('本命物炼化预览响应不完整');
  }
  if (data.needsConfirmation !== (target !== null && current !== null)) {
    throw new Error('本命物炼化预览响应不完整');
  }

  if (
    typeof data.currentGradeName !== 'string' ||
    typeof data.targetGradeName !== 'string' ||
    !Array.isArray(data.comparisonLines) ||
    !data.comparisonLines.every(line => typeof line === 'string') ||
    typeof data.refundLine !== 'string'
  ) {
    throw new Error('本命物炼化预览响应不完整');
  }

  return {
    found: data.found,
    needsConfirmation: data.needsConfirmation,
    target,
    current,
    refundQuantity,
    currentGradeName: data.currentGradeName,
    targetGradeName: data.targetGradeName,
    comparisonLines: data.comparisonLines,
    refundLine: data.refundLine
  };
}

export function parseSoulArtifactEquipResult(value: unknown): SoulArtifactEquipResult {
  const data = record(value, '炼化本命物响应不完整');
  const artifact = record(data.artifact, '炼化本命物响应不完整');

  const id = integer(artifact.id, '炼化本命物响应不完整');
  const artifactId = integer(artifact.artifactId, '炼化本命物响应不完整');
  const gradeId = integer(artifact.gradeId, '炼化本命物响应不完整');
  const level = integer(artifact.level, '炼化本命物响应不完整');
  const washCount = integer(artifact.washCount, '炼化本命物响应不完整');

  if (
    typeof artifact.name !== 'string' ||
    typeof artifact.category !== 'string' ||
    typeof artifact.isEquipped !== 'boolean' ||
    typeof artifact.isListed !== 'boolean'
  ) {
    throw new Error('炼化本命物响应不完整');
  }
  let separated: SoulArtifactEquipResult['separated'] = null;

  if (data.separated !== null) {
    const old = record(data.separated, '炼化本命物响应不完整');

    if (old.name !== null && typeof old.name !== 'string') {
      throw new Error('炼化本命物响应不完整');
    }
    separated = {
      name: old.name,
      previousLevel: integer(old.previousLevel, '炼化本命物响应不完整'),
      refundQuantity: integer(old.refundQuantity, '炼化本命物响应不完整')
    };
  }

  return {
    artifact: {
      id,
      artifactId,
      gradeId,
      level,
      washCount,
      name: artifact.name,
      category: artifact.category,
      isEquipped: artifact.isEquipped,
      isListed: artifact.isListed
    },
    separated
  };
}
