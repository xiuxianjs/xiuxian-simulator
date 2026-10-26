import { parseBackendCaveAccelerationPreview } from './cave-plot-actions';
import { parseBackendCaveCommand, parseBackendCavePlantQuery } from './cave-command';

export function caveCultivateArguments(text: string) {
  if (/^(?:[!！/#＃])?(?:开垦所有|一键开垦)\s*$/.test(text)) {
    return { plotIndex: null, all: true };
  }
  const match = text.match(/开垦(?:\s+(\d+))?$/);
  const index = match?.[1] ? Number(match[1]) : undefined;

  return { plotIndex: index !== undefined ? String(index) : null };
}

export function cavePlantArguments(text: string) {
  const match = text.trim().match(/播种(?:\s+(\d+))?(?:\s+(.+))?$/);
  const index = match?.[1] ? Number(match[1]) : undefined;

  const seedName = match?.[2]?.trim() ?? '';

  return { plotIndex: index !== undefined ? String(index) : null, seedName: seedName.length > 0 ? seedName : null };
}

export function parseRobotCavePlant(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('播种响应不完整');
  }
  const data = value as Record<string, unknown>;

  if (data.mode === 'select') {
    return { mode: 'select' as const, ...parseBackendCavePlantQuery(data.query) };
  }
  if (data.mode === 'plant') {
    return { mode: 'plant' as const, result: parseBackendCaveCommand(data.result) };
  }
  throw new Error('播种响应分支无效');
}

export function caveActionCommand(messageText: string) {
  if (/^[!！/#＃]?一键(?:灵田)?(?:加速|催熟)$/.test(messageText.trim())) {
    return {
      operation: 'cave.accelerate' as const,
      title: messageText.includes('催熟') ? '一键灵田催熟' : '一键灵田加速',
      args: { mode: 'all', plotIndex: null, accelerator: messageText.includes('催熟') ? 'ripen' : 'spiritStone', count: '1' }
    };
  }
  const text = messageText.trim().replace(/^([!！/#＃]?)一键(浇灌|除虫|除草|收割)(?=\s|$)/, '$1$2');

  for (const [word, operation, title] of [
    ['浇灌', 'cave.water', '浇灌灵田'],
    ['除虫', 'cave.worm', '除虫'],
    ['除草', 'cave.weed', '除草'],
    ['收割', 'cave.harvest', '收割灵植'],
    ['升级灵田', 'cave.upgrade', '升级灵田']
  ] as const) {
    if (new RegExp('^([!！/#＃]?' + word + ')').test(text)) {
      const value = text.match(new RegExp(word + '(?:\\s+(\\d+))?$'))?.[1];

      return { operation, title, args: { plotIndex: value ? String(Number(value)) : null } };
    }
  }
  const [, indexText, itemName, countText] = text.match(/灵田加速\s+(\d+)(?:\s+(灵肥|小绿瓶|灵石|催熟))?(?:\s+(\d+))?$/) ?? [];
  const index = indexText ? Number(indexText) : undefined;

  return {
    operation: 'cave.accelerate' as const,
    title: '灵田加速',
    args: {
      mode: !index ? 'usage' : itemName ? 'execute' : 'preview',
      plotIndex: index !== undefined ? String(index) : null,
      accelerator: itemName ? (itemName === '灵石' ? 'spiritStone' : itemName === '催熟' ? 'ripen' : itemName === '灵肥' ? 'lingfei' : 'greenBottle') : null,
      count: countText ? String(Number(countText)) : null
    }
  };
}

export function parseRobotCaveAction(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('灵田操作响应不完整');
  }
  const data = value as Record<string, unknown>;

  if (data.mode === 'command') {
    return { mode: 'command' as const, result: parseBackendCaveCommand(data.result) };
  }
  if (data.mode === 'preview') {
    return { mode: 'preview' as const, preview: parseBackendCaveAccelerationPreview(data.preview) };
  }
  throw new Error('灵田操作响应分支无效');
}

export async function caveSocialCommand(
  messageText: string,
  mention?: { findOne: () => Promise<{ count?: number; data?: { UserId?: string | null } | null }> }
) {
  const text = messageText.trim();
  const steal = /^(!|！|\/|#|＃)?偷药/.test(text);
  const operation = steal ? ('cave.steal' as const) : ('cave.collaborate' as const);
  const match = steal
    ? text.match(/^(!|！|\/|#|＃)?偷药\s+(.+?)(?:\s+(\d+))?$/u)
    : text.match(/^(!|！|\/|#|＃)?协作灵田\s+(.+?)\s+(浇灌|除虫|除草|收割)(?:\s+(\d+))?$/u);
  const args: {
    mode: string;
    ownerUid: string | null;
    ownerBid: string | null;
    plotIndex: string | null;
    careAction: 'water' | 'worm' | 'weed' | 'harvest' | null;
  } = { mode: 'usage', ownerUid: null, ownerBid: null, plotIndex: null, careAction: null };

  if (!match) {
    return { operation, args };
  }
  const targetUid = /^\d+$/.test(match[2]) ? Number(match[2]) : undefined;
  let ownerBid: string | undefined;

  if (targetUid === undefined) {
    const user = await mention?.findOne();

    ownerBid = user?.count && user.data?.UserId ? user.data.UserId : undefined;
  }
  if ((!targetUid || targetUid <= 0) && !ownerBid) {
    return { operation, args };
  }
  const index = match[steal ? 3 : 4];
  const actionMap = { 浇灌: 'water', 除虫: 'worm', 除草: 'weed', 收割: 'harvest' } as const;

  return {
    operation,
    args: {
      ...args,
      mode: 'command',
      ownerUid: targetUid !== undefined ? String(targetUid) : null,
      ownerBid: ownerBid ?? null,
      plotIndex: index ? String(Number(index)) : null,
      careAction: steal ? null : actionMap[match[3] as keyof typeof actionMap]
    }
  };
}
