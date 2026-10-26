import { parseGuildShopAutoRefresh } from './guild-shop-auto-refresh';
import { parseGuildWorkflow } from './guild-workflow';
import { formatGuildShopAutoRefreshHours, parseAutoRefreshHours } from '../../response-apps/guild/autoRefreshShop/view';
export function guildAutoRefreshArguments(param: string): { mode: string; hours?: number[] } {
  if (!param) {
    return { mode: 'view' };
  }
  const hours = parseAutoRefreshHours(param);

  return hours ? { mode: 'hours', hours } : { mode: param === '开启' ? 'enable' : param === '关闭' ? 'disable' : 'invalid' };
}
export function parseRobotGuildAutoRefresh(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('宗门自动刷新响应不完整');
  }
  const row = value as Record<string, unknown>;

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
