import { requestBackend } from './client';

export type BackendTitleOverview = {
  moodText: string;
  titles: Array<{
    id: number;
    title: string;
    isActive: boolean;
    description: string | null;
    bonusSummary: string | null;
    expireDate: string | null;
    actionLabel: string;
    actionCommand: string;
  }>;
};

export async function getBackendTitleOverview(bid: string | undefined, uid: number): Promise<BackendTitleOverview> {
  if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0) {
    throw new Error('称号概览参数无效');
  }
  const data = await requestBackend(bid, 'get_players_id_titles_overview', { path: { id: uid } });

  return validateBackendTitleOverview(data);
}

export function validateBackendTitleOverview(data: unknown): BackendTitleOverview {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('称号概览响应不完整');
  }
  const row = data as Record<string, unknown>;

  if (typeof row.moodText !== 'string' || !Array.isArray(row.titles)) {
    throw new Error('称号概览响应不完整');
  }
  const titles = row.titles.map(value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('称号概览响应不完整');
    }
    const item = value as Record<string, unknown>;

    if (
      !Number.isSafeInteger(item.id) ||
      typeof item.title !== 'string' ||
      typeof item.isActive !== 'boolean' ||
      (item.description !== null && item.description !== undefined && typeof item.description !== 'string') ||
      (item.bonusSummary !== null && item.bonusSummary !== undefined && typeof item.bonusSummary !== 'string') ||
      (item.expireDate !== null && item.expireDate !== undefined && typeof item.expireDate !== 'string') ||
      typeof item.actionLabel !== 'string' ||
      typeof item.actionCommand !== 'string'
    ) {
      throw new Error('称号概览响应不完整');
    }

    return {
      id: item.id as number,
      title: item.title,
      isActive: item.isActive,
      description: item.description ?? null,
      bonusSummary: item.bonusSummary ?? null,
      expireDate: item.expireDate ?? null,
      actionLabel: item.actionLabel,
      actionCommand: item.actionCommand
    };
  });

  return { moodText: row.moodText, titles };
}
