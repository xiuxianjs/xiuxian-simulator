/**
 * 战斗属性 → 展示文本  统一映射 & 格式化工具
 *
 * 所有装备属性、套装效果、功法属性的展示均从此处派生，
 * 新增属性字段只需在 STAT_FIELDS 中补一行即可全局生效。
 */

// ─── 属性定义 ────────────────────────────────────────────

export type StatFieldDef = {
  /** 数据库 / 模型字段名 */
  field: string;
  /** 简称（套装等紧凑场景） */
  short: string;
  /** 全称（装备详情/功法详情等宽裕场景） */
  full: string;
  /** 是否为百分比属性 */
  isPercent: boolean;
};

/** 全量战斗属性定义（顺序即展示顺序） */
export const STAT_FIELDS: StatFieldDef[] = [
  // ── 固定值 ──
  { field: 'physicalAttack', short: '物攻', full: '物理攻击', isPercent: false },
  { field: 'magicAttack', short: '法攻', full: '法术攻击', isPercent: false },
  { field: 'physicalDefense', short: '物防', full: '物理防御', isPercent: false },
  { field: 'magicDefense', short: '法防', full: '法术防御', isPercent: false },
  { field: 'hp', short: '生命', full: '生命', isPercent: false },
  { field: 'speed', short: '速度', full: '速度', isPercent: false },
  // ── 百分比 ──
  { field: 'physicalAttackPercent', short: '物攻%', full: '物理攻击加成', isPercent: true },
  { field: 'magicAttackPercent', short: '法攻%', full: '法术攻击加成', isPercent: true },
  { field: 'physicalDefensePercent', short: '物防%', full: '物理防御加成', isPercent: true },
  { field: 'magicDefensePercent', short: '法防%', full: '法术防御加成', isPercent: true },
  { field: 'hpPercent', short: '生命%', full: '生命加成', isPercent: true },
  { field: 'speedPercent', short: '速度%', full: '速度加成', isPercent: true },
  { field: 'critRate', short: '暴击率', full: '暴击率', isPercent: true },
  { field: 'critDamage', short: '暴击伤害', full: '暴击伤害', isPercent: true },
  { field: 'antiCritRate', short: '抗暴率', full: '抗暴率', isPercent: true },
  { field: 'hitRate', short: '命中率', full: '命中率', isPercent: true },
  { field: 'dodgeRate', short: '闪避率', full: '闪避率', isPercent: true },
  { field: 'normalAttackCritRate', short: '普攻暴击率', full: '普攻暴击率', isPercent: true },
  { field: 'skillCritRate', short: '战技暴击率', full: '战技暴击率', isPercent: true },
  { field: 'ultimateCritRate', short: '终结技暴击率', full: '终结技暴击率', isPercent: true },
  { field: 'allSkillCritRate', short: '全技能暴击率', full: '全技能暴击率', isPercent: true },
  // ── 功法专属（仅 max* 场景会用到） ──
  { field: 'multiplierBoost', short: '倍率强化', full: '倍率强化', isPercent: true },
  { field: 'effectBoost', short: '效果强化', full: '效果强化', isPercent: true }
];

// ─── 格式化工具 ──────────────────────────────────────────

/** 安全数值转换 */
const toNum = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);

  return Number.isFinite(n) ? n : 0;
};

export type StatStyle = 'short' | 'full';

/**
 * 将一条属性记录的非零字段转为可读文本数组
 *
 * @param obj       数据对象（套装效果 / 装备实例等）
 * @param style     'short' → 简称（物攻+50），'full' → 全称（物理攻击: 50）
 * @param separator 名称与数值之间的分隔符，默认 short→'+' / full→': '
 * @returns 例如 ['物攻+50', '暴击率+5%']
 */
export function formatStatParts(obj: Record<string, any>, style: StatStyle = 'short', separator?: string): string[] {
  const sep = separator ?? (style === 'short' ? '+' : ': ');
  const parts: string[] = [];

  for (const { field, short, full, isPercent } of STAT_FIELDS) {
    const v = toNum(obj[field]);

    if (v) {
      const label = style === 'short' ? short : full;
      const suffix = isPercent ? '%' : '';

      parts.push(`${label}${sep}${v}${suffix}`);
    }
  }

  return parts;
}

/**
 * 将属性记录转为 "当前值/上限值" 格式的文本数组（功法场景）
 *
 * @param obj       含 current & max 字段的对象
 * @param style     'short' | 'full'
 * @param separator 分隔符，默认 short→无 / full→': '
 * @param maxPrefix max 字段的前缀，默认 'max' (如 maxPhysicalAttack)
 */
export function formatStatRangeParts(obj: Record<string, any>, style: StatStyle = 'short', separator?: string, maxPrefix = 'max'): string[] {
  const sep = separator ?? (style === 'short' ? '' : ': ');
  const parts: string[] = [];

  for (const { field, short, full, isPercent } of STAT_FIELDS) {
    const cur = toNum(obj[field]);
    const maxKey = `${maxPrefix}${field.charAt(0).toUpperCase()}${field.slice(1)}`;
    const max = toNum(obj[maxKey]);

    if (cur > 0) {
      const label = style === 'short' ? short : full;
      const suffix = isPercent ? '%' : '';

      if (max > 0) {
        if (sep) {
          parts.push(`${label}${sep}${cur}${suffix}/${max}${suffix}`);
        } else {
          parts.push(`${label}(${cur}${suffix}/${max}${suffix})`);
        }
      } else {
        if (sep) {
          parts.push(`${label}${sep}${cur}${suffix}`);
        } else {
          parts.push(`${label}(${cur}${suffix})`);
        }
      }
    }
  }

  return parts;
}

/**
 * 将属性记录转为仅展示 max 字段的文本数组（功法模板上限场景）
 */
export function formatStatMaxParts(obj: Record<string, any>, style: StatStyle = 'full', separator = ':', maxPrefix = 'max'): string[] {
  const parts: string[] = [];

  for (const { field, short, full, isPercent } of STAT_FIELDS) {
    const maxKey = `${maxPrefix}${field.charAt(0).toUpperCase()}${field.slice(1)}`;
    const v = toNum(obj[maxKey]);

    if (v > 0) {
      const label = style === 'short' ? short : full;
      const suffix = isPercent ? '%' : '';

      parts.push(`${label}${separator}${v}${suffix}`);
    }
  }

  return parts;
}

// ─── 套装效果专用 ────────────────────────────────────────

/**
 * 将一条套装效果记录格式化为完整行文本
 * @param eff     效果记录
 * @param count   当前已装备件数
 * @returns 例如 '【2件】生命%+8%，物防%+5%' 或 '【4件】(未激活)抗暴率+7%'
 */
export function formatSetEffectLine(eff: Record<string, any>, active: boolean): string {
  const parts = formatStatParts(eff, 'short', '+');
  const inactive = active ? '' : '(未激活)';

  return `【${eff.pieces}件】${inactive}${parts.join('，')}`;
}
