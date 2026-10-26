import { archiveRow, legacySections, type ArchiveRow, type LegacySection } from '@src/api/bot/legacy-archive';

export const legacyUsage =
  '用法：/前世 [旧UID] [资料|境界|装备|本命|功法|财富|储物袋|纳戒] [页码]\n/继承 使用相同查询方式。省略旧UID时尝试当前平台ID；查询不会绑定或转移存档。';

export function parseLegacyCommand(text: string, bid: string) {
  const match = text.trim().match(/^[!！/#＃]?(?:继承|前世)(?:\s+(.*))?$/u);

  if (!match) {
    throw new Error(legacyUsage);
  }
  const args = match[1]?.trim().split(/\s+/).filter(Boolean) ?? [];
  const uid = args[0] && !Object.hasOwn(legacySections, args[0]) ? args.shift()! : bid;
  const section = args.shift() ?? '资料';
  const page = Number(args.shift() ?? 1);

  if (
    args.length ||
    !Object.hasOwn(legacySections, section) ||
    !/^[\p{L}\p{N}_:-]{1,50}$/u.test(uid) ||
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 1_000_000
  ) {
    throw new Error(legacyUsage);
  }

  return { uid, section: section as LegacySection, page };
}

/** BIGINT 字符串原样显示，不经过 Number 转换。 */
export function archiveText(value: unknown): string {
  if (typeof value === 'number' && (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER)) {
    throw new Error('旧版数值响应无效，请稍后再试。');
  }

  return typeof value === 'string' || typeof value === 'number' ? String(value) : '未留存';
}

export function archiveItems(data: ArchiveRow): ArchiveRow[] {
  if (!Array.isArray(data.items) || !data.items.every(archiveRow)) {
    throw new Error('旧版列表响应不完整，请稍后再试。');
  }

  return data.items;
}

export function archivePage(data: ArchiveRow) {
  const { page, pageSize, total } = data;

  if (
    !Number.isSafeInteger(page) ||
    Number(page) < 1 ||
    Number(page) > 1_000_000 ||
    !Number.isSafeInteger(pageSize) ||
    Number(pageSize) < 1 ||
    Number(pageSize) > 100 ||
    !Number.isSafeInteger(total) ||
    Number(total) < 0
  ) {
    throw new Error('旧版分页响应不完整，请稍后再试。');
  }

  return { current: Number(page), total: Math.max(1, Math.ceil(Number(total) / Number(pageSize))), count: Number(total) };
}

export function legacyProfileLines(profile: ArchiveRow, levels: ArchiveRow[]) {
  const constitution = archiveRow(profile.constitution) ? profile.constitution.name : undefined;
  const talents = Array.isArray(profile.talents) ? profile.talents.filter(archiveRow).map(row => archiveText(row.name)) : [];

  return [
    `道号：${archiveText(profile.name)}`,
    `体质：${archiveText(constitution)}`,
    `天赋：${talents.length ? talents.join('、') : '未留存关联定义'}`,
    ...levels.map(row => {
      const name = ({ 1: '炼气', 2: '炼体', 3: '神魂' } as Record<string, string>)[String(row.type)] ?? `类别${archiveText(row.type)}`;
      const definition = archiveRow(row.definition) ? row.definition.name : undefined;

      const realmName = definition === null || definition === undefined ? `境界编号${archiveText(row.realm)}` : archiveText(definition);

      return `${name}：${realmName} · 积累 ${archiveText(row.experience)}`;
    }),
    `战力：${archiveText(profile.battle_power)}`,
    `生命上限：${archiveText(profile.battle_blood_limit)}`,
    `攻击：${archiveText(profile.battle_attack)} · 防御：${archiveText(profile.battle_defense)}`,
    `速度：${archiveText(profile.battle_speed)}`,
    `暴击：${archiveText(profile.battle_critical_hit)} · 暴伤：${archiveText(profile.battle_critical_damage)}`
  ];
}
