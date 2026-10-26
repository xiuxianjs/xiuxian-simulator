import type { ThemeQueryData } from '../schemas/theme-query';
import { requestBackend } from './client';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('主题查询接口数据不完整');
  }

  return value as Record<string, unknown>;
}
const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value);

export async function getBackendThemes(bid: string | undefined, uid: number): Promise<ThemeQueryData> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }

  return validateBackendThemes(await requestBackend(bid, 'get_players_id_themes', { path: { id: uid } }));
}

export function validateBackendThemes(value: unknown): ThemeQueryData {
  const data = record(value);
  const permission = record(data.permission);

  if (!Array.isArray(data.themes) || typeof permission.canCustomEdit !== 'boolean' || !integer(permission.maxCustomSlots)) {
    throw new Error('主题查询接口数据不完整');
  }
  if (permission.requiredVipLevel !== undefined && (!integer(permission.requiredVipLevel) || permission.requiredVipLevel < 1)) {
    throw new Error('主题查询接口数据不完整');
  }
  const themes = data.themes.map<ThemeQueryData['themes'][number]>(value => {
    const row = record(value);

    if (
      !integer(row.id) ||
      row.id < 1 ||
      typeof row.name !== 'string' ||
      typeof row.config !== 'string' ||
      (row.source !== 'system' && row.source !== 'custom') ||
      typeof row.isActive !== 'boolean' ||
      !integer(row.sortOrder)
    ) {
      throw new Error('主题查询接口数据不完整');
    }

    return { id: row.id, name: row.name, config: row.config, source: row.source, isActive: row.isActive, sortOrder: row.sortOrder };
  });

  return {
    themes,
    permission: {
      canCustomEdit: permission.canCustomEdit,
      maxCustomSlots: permission.maxCustomSlots,
      ...(permission.requiredVipLevel === undefined ? {} : { requiredVipLevel: permission.requiredVipLevel })
    }
  };
}
