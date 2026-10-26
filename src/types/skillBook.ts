/**
 * 功法相关类型定义
 */

// ==================== 功法基础信息类型 ====================

/**
 * 用户功法数据（储物袋中）
 */
export interface UserSkillBookStorageData {
  id: number;
  skillBookId?: number;
  name: string;
  quantity?: number; // 兼容旧数量字段，功法按实例展示
  grade: string;
  realm: string;
  skillType?: string; // 兼容旧数据的可选字段
  requiredExp?: number; // 学习所需经验
  physicalAttack?: number;
  magicAttack?: number;
  physicalDefense?: number;
  magicDefense?: number;
  hp?: number;
  physicalAttackPercent?: number;
  magicAttackPercent?: number;
  physicalDefensePercent?: number;
  magicDefensePercent?: number;
  hpPercent?: number;
  speed?: number;
  critRate?: number;
  critDamage?: number;
  maxPhysicalAttack?: number;
  maxMagicAttack?: number;
  maxPhysicalDefense?: number;
  maxMagicDefense?: number;
  maxHp?: number;
  maxPhysicalAttackPercent?: number;
  maxMagicAttackPercent?: number;
  maxPhysicalDefensePercent?: number;
  maxMagicDefensePercent?: number;
  maxHpPercent?: number;
  maxSpeed?: number;
  maxCritRate?: number;
  maxCritDamage?: number;
  status?: number; // 功法状态
  statusText?: string; // 功法状态文本
  ids?: number[]; // 兼容旧实例ID列表
  isLocked: number;
  type: string;
}

/**
 * 已学习功法数据
 */
export interface SkillBookEffectData {
  name: string;
  probability?: number;
  type?: number;
  module?: number | string | null;
  camp?: string | null;
  applyTiming?: number;
  effectTiming?: number;
  removable?: boolean;
  triggerScope?: 'all' | 'normal' | 'battle' | 'divine' | 'passive' | string;
  applyProbability?: number;
  effectProbability?: number;
  duration?: number;
  multiplier?: number;
  maxStacks?: number;
  attributeModule?: number;
}

export interface SkillBookDetailDisplay {
  titleText: string;
  damageLine: string | null;
  statusLine: string;
  proficiencyText: string;
  canComprehend: boolean;
  canUseMingwudan: boolean;
  visibilityAction: 'SHOW' | 'HIDE' | 'NONE';
  visibilityLabel: string | null;
  canReset: boolean;
  cooldownLine: string;
  costLine: string | null;
  defenseIgnoreLine: string | null;
  triggerLine: string | null;
  narrativeLines: string[];
  effectLines: string[];
  effectNamesLine: string | null;
  attributeLines: string[];
  recoveryLines?: string[];
}

/**
 * 已学习功法数据
 */
export interface LearnedSkillBookData {
  id: number;
  name: string;
  skillType: string;
  skillName?: string;
  skillTypeId?: number;
  damageType?: string | null;
  buffNames?: string[];
  skillModule?: number | string | null;
  multiplier?: number | null;
  camp?: string | null;
  cost?: number | null;
  cooldown?: number | null;
  triggerCondition?: string | null;
  targetCount?: number | null;
  defenseIgnorePercent?: number | null;
  skillEffects?: SkillBookEffectData[];
  detailDisplay?: SkillBookDetailDisplay;
  skillId?: number;
  status: number;
  statusText: string;
  listText?: string;
  slotText?: string;
  attributeSummary?: string;
  canHide?: boolean;
  canReset?: boolean;
  physicalAttack?: number;
  magicAttack?: number;
  physicalDefense?: number;
  magicDefense?: number;
  hp?: number;
  physicalAttackPercent?: number;
  magicAttackPercent?: number;
  physicalDefensePercent?: number;
  magicDefensePercent?: number;
  hpPercent?: number;
  speed?: number;
  critRate?: number;
  critDamage?: number;
  maxPhysicalAttack?: number;
  maxMagicAttack?: number;
  maxPhysicalDefense?: number;
  maxMagicDefense?: number;
  maxHp?: number;
  maxPhysicalAttackPercent?: number;
  maxMagicAttackPercent?: number;
  maxPhysicalDefensePercent?: number;
  maxMagicDefensePercent?: number;
  maxHpPercent?: number;
  maxSpeed?: number;
  maxCritRate?: number;
  maxCritDamage?: number;
  upgradeCount: number;
  proficiency: number;
  proficiencyFailStreak?: number;
  isHidden: number;
}

/** Go learned-page fields required by the active list bubbles. */
export interface LearnedSkillBookProjected extends LearnedSkillBookData {
  listText: string;
  slotText: string;
  attributeSummary: string;
  canHide: boolean;
  canReset: boolean;
}

// ==================== 功法操作结果类型 ====================

/**
 * 基础操作结果
 */
export interface SkillBookOperationResult {
  success: boolean;
  message: string;
}

/**
 * 学习功法结果
 */
export interface LearnSkillBookResult extends SkillBookOperationResult {
  needConfirm?: boolean;
  replaced?: boolean;
  comparisonLines?: string[];
  skillBook?: {
    name: string;
    skillType: string;
  };
  oldSkillBook?: {
    id: number;
    name: string;
    grade: string;
    realm: string;
    proficiency?: number;
  };
  refundInfo?: {
    totalExp: number;
    baseExp: number;
    upgradeExp: number;
    upgradeCount: number;
    transferredProficiency: number;
    items: Array<{
      name: string;
      quantity: number;
      expValue: number;
    }>;
  };
}

/**
 * 升级功法结果
 */
export interface UpgradeSkillBookResult extends SkillBookOperationResult {
  skillBook?: {
    name: string;
    skillType: string;
  };
  upgradeCount?: number;
  consumedExp?: number;
  consumedSpiritStone?: number;
  overflowExp?: number;
  consumedItems?: Array<{
    name: string;
    quantity: number;
    expValue: number;
  }>;
  refundedItems?: Array<{
    name: string;
    quantity: number;
    expValue: number;
  }>;
  attributeUpgrade?: {
    name: string;
    growth: number;
    isNew: boolean;
    currentValue: number;
    maxValue: number;
  };
}

export interface ResetSkillBookResult extends SkillBookOperationResult {
  pending?: boolean;
  skillBook?: {
    id: number;
    name: string;
    skillType: string;
  };
  refundInfo?: {
    exp: number;
    spiritStone: number;
    upgradeCount: number;
    affectedAttrs: string[];
    items?: Array<{
      name: string;
      quantity: number;
      expValue: number;
    }>;
  };
}

/**
 * 切换功法结果
 */
export interface SwitchSkillBookResult extends SkillBookOperationResult {
  needConfirm?: boolean;
  comparisonLines?: string[];
  skillBook?: {
    name: string;
    skillType: string;
  };
  oldSkillBook?: {
    name: string;
    skillType: string;
  };
}

/**
 * 卸下功法结果
 */
export interface UnequipSkillBookResult extends SkillBookOperationResult {
  skillBook?: {
    name: string;
    skillType: string;
  };
}

// ==================== 分页结果类型 ====================

/**
 * 功法分页结果
 */
export interface SkillBookPageResult {
  items: LearnedSkillBookData[];
  total: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// ==================== 经验道具类型 ====================

/**
 * 经验道具数据
 */
export interface ExpItemData {
  userExpItemId: number;
  expItemId: number;
  name: string;
  quantity: number;
  expValue: number;
  grade: string;
}

/**
 * 消耗经验道具结果
 */
export interface ConsumeExpItemsResult {
  success: boolean;
  message?: string;
  required?: number;
  available?: number;
  shortage?: number;
  consumedItems?: Array<{
    name: string;
    quantity: number;
    expValue: number;
  }>;
  totalConsumedExp?: number;
  overflowExp?: number;
}
