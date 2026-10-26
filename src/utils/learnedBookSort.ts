import type { GuiButton } from './messageHelper';

export const LEARNED_BOOK_ATTRIBUTES = [
  { label: '物攻', key: 'physicalAttack' },
  { label: '法攻', key: 'magicAttack' },
  { label: '物防', key: 'physicalDefense' },
  { label: '法防', key: 'magicDefense' },
  { label: '气血', key: 'hp' },
  { label: '物攻%', key: 'physicalAttackPercent' },
  { label: '法攻%', key: 'magicAttackPercent' },
  { label: '物防%', key: 'physicalDefensePercent' },
  { label: '法防%', key: 'magicDefensePercent' },
  { label: '气血%', key: 'hpPercent' },
  { label: '速度', key: 'speed' },
  { label: '暴击率', key: 'critRate' },
  { label: '暴击伤害', key: 'critDamage' }
] as const;

export type LearnedBookSort = { attribute: string; direction: string; basis: string };

export function parseLearnedBookListCommand(message: string): { page: string | null; sort?: LearnedBookSort } {
  const tokens = message
    .replace(/^(!|！|\/|#|＃)?我的功法\s*/, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (tokens[0] !== '排序') {
    return { page: tokens[0] ?? null };
  }
  if (!tokens[1]) {
    return { page: '2' };
  }

  return {
    page: tokens[4] ?? '2',
    sort: {
      attribute: LEARNED_BOOK_ATTRIBUTES.find(item => item.label === tokens[1])?.key ?? tokens[1],
      direction: tokens[2] === '升序' ? 'asc' : tokens[2] === '降序' || !tokens[2] ? 'desc' : tokens[2],
      basis: tokens[3] === '上限' ? 'max' : tokens[3] === '当前' || !tokens[3] ? 'current' : tokens[3]
    }
  };
}

export function buildLearnedBookListCommand(sort?: LearnedBookSort, page: number | string = 2) {
  if (!sort) {
    return `/我的功法 ${page}`;
  }
  const label = LEARNED_BOOK_ATTRIBUTES.find(item => item.key === sort.attribute)?.label ?? sort.attribute;

  return `/我的功法 排序 ${label} ${sort.direction === 'asc' ? '升序' : '降序'} ${sort.basis === 'max' ? '上限' : '当前'} ${page}`;
}

export function learnedBookSortLabel(sort: LearnedBookSort) {
  const label = LEARNED_BOOK_ATTRIBUTES.find(item => item.key === sort.attribute)?.label ?? sort.attribute;

  return `${sort.basis === 'max' ? '上限' : '当前'}${label}${sort.direction === 'asc' ? '↑' : '↓'}`;
}

export function createLearnedBookSortRows(sort?: LearnedBookSort): GuiButton[][] {
  const attributes = LEARNED_BOOK_ATTRIBUTES.map(item => ({
    label: `${sort?.attribute === item.key ? '·' : ''}${item.label}`,
    command: buildLearnedBookListCommand({ attribute: item.key, direction: sort?.direction ?? 'desc', basis: sort?.basis ?? 'current' })
  }));
  const rows: GuiButton[][] = [
    [{ label: sort ? '默认' : '·默认', command: buildLearnedBookListCommand() }, ...attributes.slice(0, 5)],
    attributes.slice(5, 10),
    attributes.slice(10)
  ];

  if (sort) {
    rows.push([
      { label: `${sort.basis === 'current' ? '·' : ''}当前属性`, command: buildLearnedBookListCommand({ ...sort, basis: 'current' }) },
      { label: `${sort.basis === 'max' ? '·' : ''}属性上限`, command: buildLearnedBookListCommand({ ...sort, basis: 'max' }) },
      { label: `${sort.direction === 'desc' ? '·' : ''}从高到低`, command: buildLearnedBookListCommand({ ...sort, direction: 'desc' }) },
      { label: `${sort.direction === 'asc' ? '·' : ''}从低到高`, command: buildLearnedBookListCommand({ ...sort, direction: 'asc' }) }
    ]);
  }

  return rows;
}
