import type { BackendRequestContext } from './context';
import { requestBackend, writeContext } from './client';
import type {
  SoulArtifactWashAction,
  SoulArtifactWashConfirm,
  SoulArtifactWashPending,
  SoulArtifactWashPreview,
  SoulArtifactWashStep
} from '../schemas/soul-artifact-wash';

const actions = new Set<SoulArtifactWashAction>(['add', 'replace', 'upgrade']);

function row(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('本命物洗涤响应不完整');
  }

  return value as Record<string, unknown>;
}

function positiveInteger(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new Error('本命物洗涤响应不完整');
  }

  return value;
}

function parseStep(value: unknown): SoulArtifactWashStep {
  const source = row(value);

  if (typeof source.success !== 'boolean') {
    throw new Error('本命物洗涤响应不完整');
  }
  if (source.action !== undefined && (typeof source.action !== 'string' || !actions.has(source.action as SoulArtifactWashAction))) {
    throw new Error('本命物洗涤响应不完整');
  }
  if (source.message !== undefined && typeof source.message !== 'string') {
    throw new Error('本命物洗涤响应不完整');
  }
  if (source.details !== undefined && (!Array.isArray(source.details) || source.details.some(item => typeof item !== 'string'))) {
    throw new Error('本命物洗涤响应不完整');
  }

  return {
    success: source.success,
    ...(source.action === undefined ? {} : { action: source.action as SoulArtifactWashAction }),
    ...(source.message === undefined ? {} : { message: source.message }),
    ...(source.details === undefined ? {} : { details: source.details as string[] })
  };
}

function parsePending(value: unknown): SoulArtifactWashPending {
  const source = row(value);

  const instanceId = positiveInteger(source.instanceId);
  const artifactId = positiveInteger(source.artifactId);
  const times = positiveInteger(source.times);
  const totalSuccess = positiveInteger(source.totalSuccess);
  const createdAt = positiveInteger(source.createdAt);

  if (typeof source.artifactName !== 'string' || typeof source.finalMessage !== 'string' || !Array.isArray(source.results)) {
    throw new Error('本命物洗涤响应不完整');
  }

  const results = source.results.map(parseStep);

  if (results.length !== totalSuccess || results.some(item => !item.success)) {
    throw new Error('本命物洗涤响应不完整');
  }

  return {
    instanceId,
    artifactId,
    artifactName: source.artifactName,
    times,
    totalSuccess,
    createdAt,
    finalMessage: source.finalMessage,
    results
  };
}

export async function previewBackendSoulArtifactWash(
  bid: string | undefined,
  uid: number,
  times: number,
  request?: BackendRequestContext
): Promise<SoulArtifactWashPreview> {
  if (!bid) {
    throw new Error('缺少平台身份');
  }

  return parseSoulArtifactWashPreview(
    await requestBackend(bid, 'post_players_id_soul_artifacts_wash', {
      path: { id: uid },
      body: { times },
      ...writeContext(request)
    })
  );
}

export function parseSoulArtifactWashPreview(value: unknown): SoulArtifactWashPreview {
  const data = row(value);

  return { pending: parsePending(data.pending) };
}

export async function confirmBackendSoulArtifactWash(bid: string | undefined, uid: number, request?: BackendRequestContext): Promise<SoulArtifactWashConfirm> {
  if (!bid) {
    throw new Error('缺少平台身份');
  }

  return parseSoulArtifactWashConfirm(
    await requestBackend(bid, 'post_players_id_soul_artifacts_wash_confirm', {
      path: { id: uid },
      ...writeContext(request)
    })
  );
}

export function parseSoulArtifactWashConfirm(value: unknown): SoulArtifactWashConfirm {
  const data = row(value);

  if (typeof data.message !== 'string') {
    throw new Error('本命物洗涤响应不完整');
  }

  return { pending: parsePending(data.pending), message: data.message };
}
