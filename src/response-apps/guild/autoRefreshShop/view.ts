export function formatGuildShopAutoRefreshHours(hours: number[]): string {
  const normalized = [...new Set(hours.map(Number).filter(hour => Number.isFinite(hour) && hour >= 0 && hour <= 23))].sort((a, b) => a - b).slice(0, 3);

  return normalized.length ? `每日${normalized.map(hour => `${hour}:00`).join('、')}` : '未开启';
}
export function parseAutoRefreshHours(param: string): number[] | null {
  const tokens = param.trim().split(/\s+/).filter(Boolean);

  if (!tokens.length || tokens.length > 3 || tokens.some(token => !/^\d+$/.test(token))) {
    return null;
  }
  const hours = [...new Set(tokens.map(token => parseInt(token, 10)).filter(hour => Number.isFinite(hour) && hour >= 0 && hour <= 23))].sort((a, b) => a - b);

  return hours.length === tokens.length ? hours : null;
}
