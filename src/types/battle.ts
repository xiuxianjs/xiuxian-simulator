/**
 * 战斗系统类型定义
 */

/**
 * 攻击模组枚举
 * 定义不同的攻击范围和目标选择优先级规则
 * 优先级顺序：前后排原则 > 就近原则 > 就左原则（位置序号小）
 */
export enum AttackModule {
  // 对位单个目标
  /** 对位单个 - 前排优先 */
  SINGLE_FRONT_PRIORITY = 'single_front_priority',
  /** 对位单个 - 后排优先 */
  SINGLE_BACK_PRIORITY = 'single_back_priority',

  // 对位整列（竖列）
  /** 对位整列 - 前排优先 */
  COLUMN_FRONT_PRIORITY = 'column_front_priority',
  /** 对位整列 - 后排优先 */
  COLUMN_BACK_PRIORITY = 'column_back_priority',

  // 对位整排（横行）
  /** 对位整排 - 前排优先 */
  ROW_FRONT_PRIORITY = 'row_front_priority',
  /** 对位整排 - 后排优先 */
  ROW_BACK_PRIORITY = 'row_back_priority',

  // 全体
  /** 全体伤害 */
  ALL_ENEMIES = 'all_enemies'
}

/**
 * 阵位定义（便于理解位置）
 * 前排：位置1、2、3
 * 后排：位置4、5、6
 *
 * 阵位布局：
 * 前排: 1 2 3
 * 后排: 4 5 6
 *
 * 列信息：
 * 列1: 位置1、4
 * 列2: 位置2、5
 * 列3: 位置3、6
 */
export const POSITION_GROUPS = {
  FRONT_ROW: [1, 2, 3],
  BACK_ROW: [4, 5, 6],
  COLUMN_1: [1, 4],
  COLUMN_2: [2, 5],
  COLUMN_3: [3, 6]
} as const;

/**
 * 战斗单位基础数据
 */
export interface BattleUnit {
  id: string; // 唯一标识（玩家ID 或 NPC 实例 ID）
  name: string; // 名称
  position: 1 | 2 | 3 | 4 | 5 | 6; // 占位（1-3前排，4-6后排）
  side: 'A' | 'B'; // 阵营
  unitType: 'player' | 'npc'; // 单位类型（2026-04-18 起 'monster' 已下线）

  // 基础属性
  hp: number; // 当前生命值
  maxHp: number; // 最大生命值
  mp: number; // 当前灵力
  maxMp: number; // 最大灵力
  念力: number; // 当前念力（初始0）
  max念力: number; // 最大念力

  // 战斗属性
  physicalAttack: number; // 物理攻击
  magicAttack: number; // 法术攻击
  physicalDefense: number; // 物理防御
  magicDefense: number; // 法术防御
  speed: number; // 速度
  critRate: number; // 原始暴击率（可超过100，战斗结算时再与抗暴率对冲）
  critDamage: number; // 暴击伤害（百分比，如150表示150%）
  antiCritRate: number; // 抗暴率（0-100）
  hitRate: number; // 命中率（0-100）
  dodgeRate: number; // 闪避率（0-100）
  normalAttackCritRate: number; // 普攻暴击率加成（0-100）
  skillCritRate: number; // 战技暴击率加成（0-100）
  ultimateCritRate: number; // 神通暴击率加成（0-100）
  allSkillCritRate: number; // 全技能暴击率加成（0-100）

  // 技能数据
  normalAttack: BattleSkill; // 普通攻击
  battleSkill?: BattleSkill; // 战技
  divineSkill?: BattleSkill; // 神通
  passiveSkill?: BattleSkill; // 被动技能

  // 状态
  buffs: BattleBuff[]; // 当前buff列表
  isDead: boolean; // 是否死亡

  // 属性计算缓存（回合内有效，buff变化时需要清除）
  _cachedStats?: {
    physicalAttack?: number;
    magicAttack?: number;
    physicalDefense?: number;
    magicDefense?: number;
    speed?: number;
    critRate?: number;
    critDamage?: number;
    antiCritRate?: number;
    hitRate?: number;
    dodgeRate?: number;
    round?: number; // 缓存所属回合
  };

  // 原始数据引用（用于奖励结算等）
  sourceData?: {
    soulPath?: { pathKey: string | null; nodes: string[]; signature: string };
    userId?: number;
    npcId?: number;
    /** 虚拟 NPC 标识：如 tribulation:三九劫:L2、demonTower:L3:S2:star3、worldBoss:9 */
    virtualNpcRef?: string;
    realmId?: number;
  };
}

/**
 * 战斗技能
 */
export interface BattleSkill {
  id: number; // 技能ID
  name: string; // 技能名称
  type: 'normal' | 'battle' | 'divine' | 'passive'; // 技能类型
  module: AttackModule | string; // 攻击模组（目标选择规则）
  damageType: 'physical' | 'magical' | 'true' | 'dual'; // 伤害类型（数据库字段：physical/magical/true/dual）

  // 消耗
  mpCost: number; // 灵力消耗
  念力Cost: number; // 念力消耗

  // 伤害计算
  damageFormula: 'physical' | 'magical' | 'true' | 'dual'; // 伤害公式类型（physical物理、magical法术、true真实伤害、dual双属性）
  multiplier: number; // 伤害倍率（万分比，如10000表示100%）
  multiplierBoost?: number; // 倍率强化百分比（强化技能本体倍率）
  defenseIgnorePercent?: number; // 无视防御百分比
  effectBoost?: number; // 效果强化百分比（强化关联buff的倍率/概率/持续时间）
  targetCount?: number; // 目标数量
  camp: string; // 目标阵营（enemy/ally/self）

  // 冷却
  cooldown: number; // 冷却回合数
  currentCooldown: number; // 当前冷却

  // 技能关联buff
  linkedBuffs?: SkillBuffLink[];

  // 被动技能触发条件（仅passive类型使用）
  triggerCondition?: string;
}

/**
 * 技能关联buff配置（新设计）
 */
export interface SkillBuffLink {
  buffId: number; // 关联的buff ID
  applyTiming: number; // 施加时机（使用 BUFF_APPLY_TIMING）
  applyProbability: number; // 施加概率（万分比）
  targetOverride?: string; // 覆盖buff的目标选择（可选）
  condition?: BuffCondition; // 触发条件（可选）
}

/**
 * Buff触发条件（新设计）
 */
export interface BuffCondition {
  type: string; // 条件类型
  params: Record<string, any>; // 条件参数
}

/**
 * Buff/Debuff
 */
export interface BattleBuff {
  id: number; // buff数据库ID
  name: string; // buff名称
  type: number; // buff类型
  module: string; // 攻击模组（用于选择目标施加buff）
  attributeModule: number; // 属性模组（影响哪个属性，1-10）
  camp: string; // 目标阵营类型

  // 时机控制
  applyTiming: number; // 施加时机
  effectTiming: number; // 生效时机

  // 概率控制
  applyProbability: number; // 施加概率（万分比）
  effectProbability: number; // 生效概率（万分比）

  // 属性与效果
  removable: boolean; // 是否可被解除
  triggerScope: 'all' | 'normal' | 'battle' | 'divine' | 'passive'; // 生效技能范围
  duration: number; // 剩余回合数
  multiplier: number; // 倍率（万分比）

  // 叠加控制
  maxStacks: number; // 最大叠加层数
  currentStacks?: number; // 当前层数（运行时）

  // 运行时字段
  sourceUnitId?: string; // 施加者ID
  sourceUnitName?: string; // 施加者名称
  sourceSkillType?: BattleSkill['type']; // 来源技能类型
  sourceSkillName?: string; // 来源技能名称
  isTemporary?: boolean; // 是否为临时buff（仅当次技能生效）
  shieldValue?: number; // 护盾剩余值（仅护盾buff使用）
  hpMaxBonus?: number; // 生命上限加成值（仅生命上限buff使用）
}

/**
 * 行动类型
 */
export type BattleActionType = 'normal' | 'battle' | 'divine' | 'passive';

/**
 * 战斗模式
 */
export type BattleMode = 'auto' | 'manual';

/**
 * 技能选择类型
 */
export type SkillChoice = 'normal' | 'battle' | 'divine';

/**
 * 可用技能信息
 */
export interface AvailableSkill {
  type: SkillChoice; // 技能类型
  skill: BattleSkill; // 技能数据
  available: boolean; // 是否可用（资源足够、冷却完成）
  reason?: string; // 不可用原因
}

/**
 * 技能选择请求
 */
export interface SkillSelectionRequest {
  unitId: string; // 需要选择技能的单位ID
  unitName: string; // 单位名称
  side: 'A' | 'B'; // 所属阵营
  round: number; // 当前回合
  wave: number; // 当前波次
  availableSkills: AvailableSkill[]; // 可用技能列表
  unitState: {
    // 当前单位状态
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    念力: number;
    max念力: number;
  };
  teamUnits?: {
    // 队伍其他单位状态（如果是队伍战）
    id: string;
    name: string;
    hp: number;
    maxHp: number;
    isDead: boolean;
  }[];
  enemyUnits?: {
    // 敌方单位状态
    id: string;
    name: string;
    hp: number;
    maxHp: number;
    isDead: boolean;
  }[];
}

/**
 * 技能选择响应
 */
export interface SkillSelectionResponse {
  unitId: string; // 单位ID
  skillChoice: SkillChoice; // 选择的技能类型
}

/**
 * 技能选择回调函数类型
 * @param request 技能选择请求
 * @returns Promise<技能选择响应>
 */
export type SkillSelectionCallback = (request: SkillSelectionRequest) => Promise<SkillSelectionResponse>;

/**
 * 战斗配置
 */
export interface BattleConfig {
  mode: BattleMode; // 战斗模式（向后兼容，整体模式）
  modeA?: BattleMode; // A方模式（优先级高于mode）
  modeB?: BattleMode; // B方模式（优先级高于mode）
  maxRounds: number; // 最大回合数（每波）
  念力PerAction: number; // 每次行动获得的念力
  speedRandomRange: number; // 速度随机浮动范围（0-1）

  // 回合恢复
  mpRegenPerRound: number; // 每回合灵力恢复
  念力RegenPerRound: number; // 每回合念力恢复（回合开始时）

  // 手动模式技能选择回调
  skillSelectionCallback?: SkillSelectionCallback;

  // 手动模式超时设置（毫秒）
  skillSelectionTimeout?: number;

  // 行动完成回调（用于实时显示战斗消息）
  onActionComplete?: (log: BattleActionLog) => void;
}

/**
 * 战斗波次数据
 */
export interface BattleWave {
  waveNumber: number; // 波次编号
  units: BattleUnit[]; // 该波次的单位
}

/**
 * 战斗输入数据
 */
export interface BattleInput {
  sideA: BattleWave[]; // A方的所有波次（玩家方）
  sideB: BattleWave[]; // B方的所有波次（怪物方）
  config: BattleConfig; // 战斗配置
}

/**
 * 单位行动数据
 */
export interface UnitAction {
  round: number; // 所在回合
  wave: number; // 所在波次
  actorId: string; // 行动者ID
  actorName: string; // 行动者名称
  skill: BattleSkill; // 使用的技能
  targets: string[]; // 目标ID列表
  actionPhase: 'before_turn' | 'turn_start' | 'action' | 'damage_settle' | 'turn_end'; // 当前阶段
}

/**
 * 伤害结算结果
 */
export interface DamageResult {
  targetId: string; // 目标ID
  targetName: string; // 目标名称
  damage: number; // 造成的伤害
  actualDamage: number; // 实际伤害（扣除防御后）
  shieldAbsorbed?: number; // 护盾吸收量
  isCrit: boolean; // 是否暴击
  critProbability?: number; // 本次结算时的实际暴击概率（百分比）
  isDodged: boolean; // 是否被闪避
  dodgeProbability?: number; // 本次结算时目标实际闪避成功概率（百分比）
  isDead: boolean; // 是否致死
  triggerBuffs?: BattleBuff[]; // 触发的buff
  damageType?: 'physical' | 'magical' | 'true' | 'dual'; // 伤害类型
  attackModule?: string; // 攻击模组
}

/**
 * 治疗结算结果
 */
export interface HealResult {
  targetId: string; // 目标ID
  targetName: string; // 目标名称
  heal: number; // 治疗量
  actualHeal: number; // 实际治疗量
  overflow: number; // 溢出量
}

/**
 * 行动记录
 */
export interface BattleActionLog {
  round: number; // 回合数
  wave: number; // 波次
  actor: string; // 行动者ID
  actorName: string; // 行动者名称
  actionType: BattleActionType; // 行动类型
  phase?: 'round_start' | 'before_action' | 'action' | 'extra_action'; // 行动阶段
  skillName: string; // 技能名称
  skillModule?: string; // 技能模组
  targets: string[]; // 目标ID列表
  damageResults?: DamageResult[]; // 伤害结算结果
  healResults?: HealResult[]; // 治疗结算结果
  mpCost: number; // 灵力消耗
  mpGain: number; // 灵力获得
  念力Cost: number; // 念力消耗
  念力Gain: number; // 念力获得
  appliedBuffs?: Array<{
    // 施加的buff信息
    targetId: string;
    targetName: string;
    buffName: string;
    buffType: number;
    duration: number;
    applyProbability?: number;
    sourceUnitId?: string; // 来源单位ID
    sourceUnitName?: string; // 来源单位名称
    sourceSkillType?: BattleSkill['type']; // 来源技能类型
    sourceSkillName?: string; // 来源技能名称
  }>;
  activeBuffs?: Array<{
    // 生效的buff信息
    unitId: string;
    unitName: string;
    buffName: string;
    effectType: string; // 效果类型（如：伤害增幅、伤害减免、攻击提升等）
    effectValue: number; // 效果值（百分比）
    stacks: number; // 层数
    sourceUnitId?: string; // 来源单位ID
    sourceUnitName?: string; // 来源单位名称
    sourceSkillType?: BattleSkill['type']; // 来源技能类型
    sourceSkillName?: string; // 来源技能名称
  }>;
  buffsRemoved?: string[]; // 移除的buff（buff名称）
  timestamp: number; // 时间戳
}

/**
 * 波次结果
 */
export interface WaveResult {
  waveNumber: number; // 波次编号
  rounds: number; // 该波次战斗回合数
  winner: 'A' | 'B' | 'ongoing'; // 波次结果
  actionLogs: BattleActionLog[]; // 该波次的行动记录
  endState: {
    // 波次结束时的状态
    sideA: BattleUnit[];
    sideB: BattleUnit[];
  };
}

/**
 * 战斗结果
 */
export interface BattleResult {
  winner: 'A' | 'B' | 'draw'; // 最终胜利方
  totalWaves: number; // 总波次数
  totalRounds: number; // 总回合数
  waveResults: WaveResult[]; // 各波次结果
  finalState: {
    // 最终状态
    sideA: BattleUnit[];
    sideB: BattleUnit[];
  };
  battleLog: BattleActionLog[]; // 完整战斗日志
  rewards?: BattleReward; // 战斗奖励
}

/**
 * 战斗奖励
 */
export interface BattleReward {
  exp: number; // 经验值
  spiritStone?: number; // 灵石
  items?: Array<{
    // 掉落物品
    itemId: number;
    itemType: string;
    quantity: number;
  }>;
}

/**
 * 战斗上下文（内部使用）
 */
export interface BattleContext {
  // 当前状态
  currentWave: number; // 当前波次
  currentRound: number; // 当前回合（当前波次内的回合数）
  totalRounds: number; // 总回合数（累计所有波次）

  // 双方当前战斗单位
  sideA: BattleUnit[];
  sideB: BattleUnit[];

  // 剩余波次
  remainingWavesA: BattleWave[];
  remainingWavesB: BattleWave[];

  // 配置
  config: BattleConfig;

  // 记录
  waveResults: WaveResult[];
  actionLogs: BattleActionLog[];

  // 战斗状态
  battleEnded: boolean;
  winner?: 'A' | 'B' | 'draw';
}

/**
 * 目标选择上下文
 */
export interface TargetContext {
  caster: BattleUnit; // 施法者
  skill: BattleSkill; // 技能
  allySide: BattleUnit[]; // 己方单位
  enemySide: BattleUnit[]; // 敌方单位
}
