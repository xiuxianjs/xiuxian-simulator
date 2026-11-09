import { parseGuildShopAutoRefresh } from './guild-shop-auto-refresh';
import { parseGuildWorkflow } from './guild-workflow';
import { formatGuildShopAutoRefreshHours, parseAutoRefreshHours } from '../../response-apps/guild/autoRefreshShop/view';
const autoRefreshReference = /^r1_[0-9a-z]{1,13}_i_[0-9a-z]{1,13}_[0-9a-f]{24}$/;

export function guildAutoRefreshArguments(param: string): { mode: string; hours?: number[]; preview?: boolean; reference?: string } {
  if (!param) {
    return { mode: 'view' };
  }
  const reference = param.match(/^确认 (.+)$/)?.[1];

  if (reference && autoRefreshReference.test(reference)) {
    return { mode: 'confirm', reference };
  }
  const hours = parseAutoRefreshHours(param);

  if (hours) {
    return { mode: 'hours', hours, preview: true };
  }
  if (param === '开启') {
    return { mode: 'enable', preview: true };
  }

  return { mode: param === '关闭' ? 'disable' : 'invalid' };
}
export function parseRobotGuildAutoRefresh(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('宗门自动刷新响应不完整');
  }
  const row = value as Record<string, unknown>;

  if (row.outcome === 'preview') {
    if (
      typeof row.reference !== 'string' ||
      !autoRefreshReference.test(row.reference) ||
      !Array.isArray(row.hours) ||
      !row.hours.length ||
      row.hours.length > 3 ||
      !row.hours.every(hour => Number.isInteger(hour) && hour >= 0 && hour <= 23)
    ) {
      throw new Error('宗门商店自动刷新预览不完整');
    }

    return { outcome: 'preview' as const, reference: row.reference, hours: row.hours as number[] };
  }

  if (row.outcome === 'view') {
    const state = parseGuildShopAutoRefresh(row.data);

    if (state.outcome !== 'ready') {
      throw new Error('宗门自动刷新响应不完整');
    }

    return { outcome: 'view' as const, state };
  }
  if (row.outcome !== 'set') {
    throw new Error('宗门自动刷新响应不完整');
  }
  const data = parseGuildWorkflow({ action: 'auto_refresh', mode: 'enable' }, 0, row.data);

  if (data.outcome !== 'updated') {
    throw new Error('宗门自动刷新响应不完整');
  }
  const status = data.enabled ? `已开启，${formatGuildShopAutoRefreshHours(data.hours)}自动刷新` : '已关闭';

  return { outcome: 'set' as const, message: `商店自动刷新设置成功：${status}`, isLeader: data.isLeader };
}
