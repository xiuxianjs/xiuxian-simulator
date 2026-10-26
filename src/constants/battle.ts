/**
 * 战斗系统常量配置
 */

/**

 * 位置相关常量
 */
export const POSITION = {
  FRONT_ROW: [1, 2, 3], // 前排位置
  BACK_ROW: [4, 5, 6], // 后排位置
  MIN_POSITION: 1,
  MAX_POSITION: 6
};

/**
 * 技能类型
 */
export const SKILL_TYPE = {
  NORMAL: 'normal', // 普通攻击
  BATTLE: 'battle', // 战技
  DIVINE: 'divine', // 神通
  PASSIVE: 'passive' // 被动技能
};

/**
 * 伤害类型
 */
export const DAMAGE_TYPE = {
  PHYSICAL: 'physical', // 物理伤害
  MAGICAL: 'magical', // 法术伤害
  TRUE: 'true', // 真实伤害
  DUAL: 'dual' // 双属性伤害(物理+法术)
};

/**
 * 目标阵营
 */
export const TARGET_SIDE = {
  ENEMY: 'enemy', // 敌方
  ALLY: 'ally', // 友方
  SELF: 'self' // 自己
};

/**
 * 战斗阵营
 */
export const BATTLE_SIDE = {
  A: 'A', // A方（通常是玩家）
  B: 'B' // B方（通常是怪物）
};

/**
 * Buff触发时机（已废弃，使用 BUFF_APPLY_TIMING 和 BUFF_EFFECT_TIMING）
 * @deprecated 请使用 BUFF_APPLY_TIMING 和 BUFF_EFFECT_TIMING 替代
 */
export const BUFF_TRIGGER_TIMING = {
  ROUND_START: 1,
  BEFORE_ACTION: 2,
  ON_CAST_SKILL: 3,
  ON_DAMAGE_DEAL: 4,
  ON_DAMAGE_TAKE: 5,
  AFTER_ACTION: 6,
  ROUND_END: 7,
  ON_DEATH: 8,
  ON_KILL: 9
};

/**
 * Buff施加时机
 * 决定什么时候把buff添加到单位身上
 */
export const BUFF_APPLY_TIMING = {
  // 技能释放阶段
  BEFORE_SKILL_CAST: 0, // 技能释放前（选择技能后，消耗资源前）
  AFTER_SKILL_CAST: 1, // 技能释放后（消耗资源后，选择目标前）

  // 伤害计算阶段
  BEFORE_DAMAGE_CALC: 2, // 伤害计算前
  AFTER_DAMAGE_DEALT: 4, // 造成伤害后（保持4，数据库中已使用）
  AFTER_DAMAGE_TAKEN: 5, // 受到伤害后

  // 回合阶段
  ROUND_START: 6, // 回合开始
  TURN_START: 7, // 自己回合开始
  TURN_END: 8, // 自己回合结束
  ROUND_END: 9, // 回合结束

  // 特殊事件
  ON_KILL: 10, // 击杀敌人时
  ON_DEATH: 11, // 死亡时
  ON_CRIT: 12, // 造成暴击时
  ON_BE_CRIT: 13, // 被暴击时
  ON_DODGE: 14, // 闪避时
  ON_BE_DODGED: 15 // 被闪避时
};

/**
 * buff生效时机（新设计）
 * 决定什么时候buff影响计算
 */
export const BUFF_EFFECT_TIMING = {
  // 属性计算时机
  ON_STAT_CALC: 1, // 属性计算时（速度、攻击、防御等）
  ON_DAMAGE_CALC: 2, // 伤害计算时
  ON_HEAL_CALC: 3, // 治疗计算时
  ON_CRIT_CALC: 4, // 暴击率/伤害计算时

  // 持续效果时机
  ON_ROUND_TICK: 5, // 每回合tick（DOT/HOT）
  ON_TURN_TICK: 6, // 每个行动tick

  // 即时效果
  INSTANT: 7 // 立即生效（施加时）
};

/**
 * buff类型枚举
 */
export const BUFF_TYPE = {
  ATTACK_UP: 1, // 攻击提升
  ATTACK_DOWN: 2, // 攻击降低
  DEFENSE_UP: 3, // 防御提升
  DEFENSE_DOWN: 4, // 防御降低
  SPEED_UP: 5, // 速度提升
  SPEED_DOWN: 6, // 速度降低
  CRIT_RATE_UP: 7, // 暴击率提升
  CRIT_DAMAGE_UP: 8, // 暴击伤害提升
  SHIELD: 9, // 护盾
  REGEN: 10, // 持续回血
  DOT: 11, // 持续伤害
  STUN: 12, // 眩晕
  SILENCE: 13, // 沉默（无法使用技能）
  COUNTER: 14, // 反击
  INVINCIBLE: 15, // 无敌
  DAMAGE_REFLECT: 16, // 伤害反弹
  HIT_RATE_UP: 17, // 命中率提升
  DODGE_RATE_UP: 18, // 闪避率提升
  ANTI_CRIT_UP: 19, // 抗暴率提升
  HP_MAX_UP: 20, // 生命上限提升
  DEATH_IMMUNITY: 21, // 免死(保留1HP)
  EXTRA_TURN: 22, // 额外行动
  HEAL_INSTANT: 23 // 即时回复
};

/**
 * buff属性模组（影响哪个属性）
 */
export const BUFF_ATTRIBUTE_MODULE = {
  PHYSICAL_ATTACK: 1, // 物理攻击
  MAGIC_ATTACK: 2, // 法术攻击
  PHYSICAL_DEFENSE: 3, // 物理防御
  MAGIC_DEFENSE: 4, // 法术防御
  SPEED: 5, // 速度
  HP: 6, // 生命值
  CRIT_RATE: 7, // 暴击率
  CRIT_DAMAGE: 8, // 暴击伤害
  DAMAGE_BONUS: 9, // 伤害加成（最终伤害倍率）
  DAMAGE_REDUCTION: 10, // 伤害减免（最终伤害倍率）
  HIT_RATE: 11, // 命中率
  DODGE_RATE: 12, // 闪避率
  ANTI_CRIT_RATE: 13, // 抗暴率
  SPECIAL: 99 // 特殊效果
};

/**
 * 攻击模组（用于目标选择）
 * 与技能的攻击模组一致，用于选择buff施加目标
 */
export const ATTACK_MODULE = {
  SINGLE_FRONT_PRIORITY: 'single_front_priority', // 对位单个 - 前排优先
  SINGLE_BACK_PRIORITY: 'single_back_priority', // 对位单个 - 后排优先
  COLUMN_FRONT_PRIORITY: 'column_front_priority', // 对位整列 - 前排优先
  COLUMN_BACK_PRIORITY: 'column_back_priority', // 对位整列 - 后排优先
  ROW_FRONT_PRIORITY: 'row_front_priority', // 对位整排 - 前排优先
  ROW_BACK_PRIORITY: 'row_back_priority', // 对位整排 - 后排优先
  ALL_ENEMIES: 'all_enemies' // 全体
};

/**
 * 攻击模组ID映射
 * 将数字ID映射到攻击模组枚举值（用于buff.module字段）
 */
export const ATTACK_MODULE_ID_MAP: Record<number, string> = {
  1: ATTACK_MODULE.SINGLE_FRONT_PRIORITY, // 单体-前排优先
  2: ATTACK_MODULE.SINGLE_BACK_PRIORITY, // 单体-后排优先
  3: ATTACK_MODULE.COLUMN_FRONT_PRIORITY, // 整列-前排优先
  4: ATTACK_MODULE.COLUMN_BACK_PRIORITY, // 整列-后排优先
  5: ATTACK_MODULE.ROW_FRONT_PRIORITY, // 整排-前排优先
  6: ATTACK_MODULE.ROW_BACK_PRIORITY, // 整排-后排优先
  7: ATTACK_MODULE.ALL_ENEMIES // 全体
};

/**
 * 根据模组ID或模组字符串获取标准的攻击模组
 * @param module 模组ID（数字）或模组字符串
 * @returns 标准攻击模组字符串
 */
export function getAttackModule(module: number | string): string {
  if (typeof module === 'number') {
    return ATTACK_MODULE_ID_MAP[module] || ATTACK_MODULE.SINGLE_FRONT_PRIORITY;
  }

  return module;
}

/**
 * 伤害计算相关常量
 */
export const DAMAGE_CALC = {
  MIN_DAMAGE_RATIO: 0.05, // 最小伤害比例（攻击力的5%）
  DEFENSE_REDUCTION_RATIO: 0.5, // 防御减伤比例
  RANDOM_DAMAGE_RANGE: 0.1, // 随机伤害浮动范围（±10%）
  BASE_CRIT_DAMAGE: 150, // 基础暴击伤害（150%）
  MULTIPLIER_BASE: 10000 // 倍率基数（万分比）
};

/**
 * 行动阶段
 */
export const ACTION_PHASE = {
  BEFORE_TURN: 'before_turn', // 个人回合开始前
  TURN_START: 'turn_start', // 个人回合开始
  ACTION: 'action', // 行动（释放技能）
  DAMAGE_SETTLE: 'damage_settle', // 伤害结算
  TURN_END: 'turn_end' // 个人回合结束
};

/**
 * 战斗阶段
 */
export const BATTLE_PHASE = {
  INIT: 'init', // 初始化
  WAVE_START: 'wave_start', // 波次开始
  ROUND_BEFORE: 'round_before', // 回合开始前（速度排序）
  ROUND_START: 'round_start', // 回合开始
  UNIT_ACTIONS: 'unit_actions', // 单位行动阶段
  ROUND_SETTLE: 'round_settle', // 回合结算
  ROUND_END: 'round_end', // 回合结束
  WAVE_END: 'wave_end', // 波次结束
  BATTLE_END: 'battle_end' // 战斗结束
};

/**
 * 单位类型
 */
export const UNIT_TYPE = {
  PLAYER: 'player', // 玩家
  NPC: 'npc' // NPC
};

/**
 * 战斗结果
 */
export const BATTLE_RESULT = {
  WIN_A: 'A',
  WIN_B: 'B',
  DRAW: 'draw',
  ONGOING: 'ongoing'
};

/**
 * 技能效果模组映射
 */
export const SKILL_MODULE = {
  DAMAGE: 'damage', // 伤害
  HEAL: 'heal', // 治疗
  BUFF: 'buff', // 增益
  DEBUFF: 'debuff', // 减益
  DISPEL: 'dispel', // 驱散
  SHIELD: 'shield', // 护盾
  SUMMON: 'summon', // 召唤
  SPECIAL: 'special' // 特殊效果
};

/**
 * 数值限制
 */
export const VALUE_LIMITS = {
  MIN_HP: 0,
  MIN_MP: 0,
  MIN_念力: 0,
  MAX_念力: 100,
  MIN_CRIT_RATE: 0,
  MAX_CRIT_RATE: 100,
  MIN_SPEED: 1,
  MAX_BUFF_DURATION: 999
};

/**
 * 战斗日志相关
 */
export const BATTLE_LOG = {
  MAX_LOGS_PER_WAVE: 1000, // 每波最大日志数
  ENABLE_DETAIL_LOG: true // 是否启用详细日志
};
