export const forgeStatFields = {
  physicalAttack: '物攻',
  magicAttack: '法攻',
  physicalDefense: '物防',
  magicDefense: '法防',
  hp: '生命',
  speed: '速度',
  physicalAttackPercent: '物攻加成',
  magicAttackPercent: '法攻加成',
  physicalDefensePercent: '物防加成',
  magicDefensePercent: '法防加成',
  hpPercent: '生命加成',
  critRate: '暴击率',
  critDamage: '暴击伤害'
} as const;
export type ForgeStats = Record<keyof typeof forgeStatFields, number>;
export type ForgeEquipment = ForgeStats & { id: number; equipmentId: number; userId: number; permission: number; crafterName: string | null };
export type ForgeTemplate = ForgeStats & { id: number; name: string };
export type ForgeMaterial = {
  source: string;
  itemId: number;
  name: string;
  required: number;
  available: number;
  listed: number;
  locked: boolean;
};
export type ForgeAttribute = { key: string; name: string; unit: string; min: number; max: number };
export type ForgeComparison = { key: string; name: string; unit: string; value: number; current: number; delta: number };
export type ForgeRecipe = {
  attributes: ForgeAttribute[];
  tradeable: boolean;
  id: number;
  name: string;
  equipment: ForgeTemplate;
  grade: string;
  type: string;
  requiredRealm: string;
  canEquip: boolean;
  requiredLevel: number;
  craftRequiredLevel?: number;
  earlyCraft?: boolean;
  learned: boolean;
  assessment: boolean;
  completed: boolean;
  spiritStoneCost: number;
  materials: ForgeMaterial[];
  canCraft: boolean;
  reason: string;
  toolType: string;
  toolGrade: number;
};
export type ForgeOverview = {
  available: boolean;
  reason: string;
  joined: boolean;
  level: number;
  title: string;
  exp: number;
  expRequired: number;
  assessmentDone: number;
  assessmentRequired: number;
  canAdvance: boolean;
  advanceReason: string;
  nextTitle: string;
  entryRealm: string;
  canJoin: boolean;
  recipes: ForgeRecipe[];
};
export type ForgeTutorialTool = { templateId: number; name: string; type: string; grade: string; gradeLevel: number; permission: number };
export type ForgeTutorialToolReward = ForgeTutorialTool & { instanceId: number; equipped: boolean };
export type ForgePreview = {
  token: string;
  expiresAt: number;
  tutorial: boolean;
  recipe: ForgeRecipe;
  expGained: number;
  assessmentNew: boolean;
  tutorialTool?: ForgeTutorialTool;
};
export type ForgeResult = {
  tutorialTool?: ForgeTutorialToolReward;
  crafterId: number;
  comparisons: ForgeComparison[];
  currentEquipment: string;
  canEquip: boolean;
  craftId: number;
  recipeId: number;
  name: string;
  crafter: string;
  equipment: ForgeEquipment;
  expGained: number;
  assessmentNew: boolean;
  tutorial: boolean;
  spiritStoneCost: number;
  materials: ForgeMaterial[];
  createdAt: string;
  replayed: boolean;
};
export type ForgeHistory = { items: { result: ForgeResult; owned: boolean; exists: boolean }[]; page: number; hasMore: boolean };

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('锻造接口对象不完整');
  }

  return value as Record<string, unknown>;
}
function fields(value: unknown, strings: string[], integers: string[], booleans: string[]) {
  const row = object(value);

  for (const key of strings) {
    if (typeof row[key] !== 'string') {
      throw new Error(`锻造接口缺少文本 ${key}`);
    }
  }
  for (const key of integers) {
    if (!Number.isSafeInteger(row[key])) {
      throw new Error(`锻造接口整数无效 ${key}`);
    }
  }
  for (const key of booleans) {
    if (typeof row[key] !== 'boolean') {
      throw new Error(`锻造接口状态无效 ${key}`);
    }
  }

  return row;
}
function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error('锻造接口列表不完整');
  }

  return value;
}
function stats(value: unknown) {
  const row = object(value);

  for (const key of Object.keys(forgeStatFields)) {
    if (typeof row[key] !== 'number' || !Number.isFinite(row[key])) {
      throw new Error(`锻造属性无效 ${key}`);
    }
  }
}
function materials(value: unknown) {
  for (const row of array(value)) {
    fields(row, ['name', 'source'], ['itemId', 'required', 'available', 'listed'], ['locked']);
  }
}
function recipe(value: unknown) {
  const row = fields(
    value,
    ['name', 'grade', 'type', 'requiredRealm', 'reason', 'toolType'],
    ['id', 'requiredLevel', 'spiritStoneCost', 'toolGrade'],
    ['canEquip', 'learned', 'assessment', 'completed', 'canCraft', 'tradeable']
  );

  if (row.craftRequiredLevel !== undefined && (!Number.isSafeInteger(row.craftRequiredLevel) || (row.craftRequiredLevel as number) < 0)) {
    throw new Error('锻造制造等级无效');
  }
  if (row.earlyCraft !== undefined && typeof row.earlyCraft !== 'boolean') {
    throw new Error('提前锻造标记无效');
  }
  if (row.earlyCraft === true && row.craftRequiredLevel === undefined) {
    throw new Error('提前锻造缺少制造等级');
  }
  fields(row.equipment, ['name'], ['id'], []);
  stats(row.equipment);
  materials(row.materials);
  for (const value of array(row.attributes)) {
    const a = fields(value, ['key', 'name', 'unit'], [], []);

    for (const k of ['min', 'max']) {
      if (typeof a[k] !== 'number' || !Number.isFinite(a[k])) {
        throw new Error('锻造属性范围无效');
      }
    }
  }
}
export function parseForgeOverview(value: unknown): ForgeOverview {
  const row = fields(
    value,
    ['reason', 'title', 'advanceReason', 'nextTitle', 'entryRealm'],
    ['level', 'exp', 'expRequired', 'assessmentDone', 'assessmentRequired'],
    ['available', 'joined', 'canAdvance', 'canJoin']
  );

  array(row.recipes).forEach(recipe);

  return value as ForgeOverview;
}
function parseTutorialTool(value: unknown) {
  const tool = fields(value, ['name', 'type', 'grade'], ['templateId', 'gradeLevel', 'permission'], []);

  if (
    Number(tool.templateId) <= 0 ||
    Number(tool.gradeLevel) < 0 ||
    Number(tool.permission) < 0 ||
    Number(tool.permission) % 4 >= 2 ||
    !String(tool.name).trim() ||
    !String(tool.type).trim()
  ) {
    throw new Error('锻造入门工具定义无效');
  }
}
export function parseForgePreview(value: unknown): ForgePreview {
  const row = fields(value, ['token'], ['expiresAt', 'expGained'], ['tutorial', 'assessmentNew']);

  recipe(row.recipe);
  if (row.tutorialTool !== undefined) {
    parseTutorialTool(row.tutorialTool);
    if (!row.tutorial) {
      throw new Error('普通制作出现入门工具奖励');
    }
  }

  return value as ForgePreview;
}
export function parseForgeResult(value: unknown): ForgeResult {
  const row = fields(
    value,
    ['name', 'crafter', 'createdAt', 'currentEquipment'],
    ['craftId', 'recipeId', 'expGained', 'spiritStoneCost', 'crafterId'],
    ['assessmentNew', 'tutorial', 'replayed', 'canEquip']
  );
  const equipment = fields(row.equipment, [], ['id', 'equipmentId', 'userId', 'permission'], []);

  stats(equipment);
  if (equipment.crafterName !== null && typeof equipment.crafterName !== 'string') {
    throw new Error('锻造署名无效');
  }
  materials(row.materials);
  if (row.tutorialTool !== undefined) {
    parseTutorialTool(row.tutorialTool);
    const tool = fields(row.tutorialTool, [], ['instanceId'], ['equipped']);

    if (!row.tutorial || Number(tool.instanceId) <= 0) {
      throw new Error('锻造入门工具奖励无效');
    }
  }

  for (const value of array(row.comparisons)) {
    const a = fields(value, ['key', 'name', 'unit'], [], []);

    for (const k of ['value', 'current', 'delta']) {
      if (typeof a[k] !== 'number' || !Number.isFinite(a[k])) {
        throw new Error('锻造属性对比无效');
      }
    }
  }

  return value as ForgeResult;
}
export function parseForgeHistory(value: unknown): ForgeHistory {
  const row = fields(value, [], ['page'], ['hasMore']);

  for (const value of array(row.items)) {
    const item = fields(value, [], [], ['owned', 'exists']);

    parseForgeResult(item.result);
  }

  return value as ForgeHistory;
}

export type ForgeOrderPreview = ForgePreview & { crafterId: number; crafterName: string; fee: number; lifetimeSeconds: number };
export type ForgeOrder = {
  id: number;
  ownerId: number;
  ownerName: string;
  crafterId: number;
  crafterName: string;
  status: 'pending' | 'delivered' | 'cancelled' | 'expired';
  expiresAt: number;
  name: string;
  fee: number;
  spiritStoneCost: number;
  materials: ForgeMaterial[];
  canAccept: boolean;
  canCancel: boolean;
  refundPending?: boolean;
  result: ForgeResult | null;
};
export type ForgeOrders = { items: ForgeOrder[]; page: number; hasMore: boolean };
function validateEscrowTotal(cost: unknown, fee: unknown) {
  if (!Number.isSafeInteger(cost) || !Number.isSafeInteger(fee) || Number(cost) < 0 || Number(fee) < 0 || !Number.isSafeInteger(Number(cost) + Number(fee))) {
    throw new Error('锻造托管总额超出安全整数范围');
  }
}
export function parseForgeOrderPreview(value: unknown): ForgeOrderPreview {
  parseForgePreview(value);
  const row = fields(value, ['crafterName'], ['crafterId', 'fee', 'lifetimeSeconds'], []);

  validateEscrowTotal(object(row.recipe).spiritStoneCost, row.fee);

  if (Number(row.crafterId) <= 0 || Number(row.fee) < 0 || Number(row.lifetimeSeconds) <= 0 || row.tutorial) {
    throw new Error('锻造委托预览无效');
  }

  return value as ForgeOrderPreview;
}
export function parseForgeOrder(value: unknown): ForgeOrder {
  const row = fields(
    value,
    ['ownerName', 'crafterName', 'status', 'name'],
    ['id', 'ownerId', 'crafterId', 'expiresAt', 'fee', 'spiritStoneCost'],
    ['canAccept', 'canCancel']
  );

  if (!['pending', 'delivered', 'cancelled', 'expired'].includes(String(row.status))) {
    throw new Error('锻造委托状态无效');
  }
  if (
    ['id', 'ownerId', 'crafterId', 'expiresAt'].some(key => Number(row[key]) <= 0) ||
    row.ownerId === row.crafterId ||
    Number(row.fee) < 0 ||
    Number(row.spiritStoneCost) < 0
  ) {
    throw new Error('锻造委托数据无效');
  }
  if (row.status !== 'pending' && (row.canAccept || row.canCancel)) {
    throw new Error('已结束的锻造委托仍有操作权限');
  }
  if (row.refundPending !== undefined && typeof row.refundPending !== 'boolean') {
    throw new Error('锻造委托待退款标记无效');
  }
  if (row.refundPending && (row.status !== 'pending' || row.canAccept)) {
    throw new Error('锻造委托待退款状态与操作权限不一致');
  }
  validateEscrowTotal(row.spiritStoneCost, row.fee);
  materials(row.materials);
  if (row.result !== null) {
    parseForgeResult(row.result);
  }
  if (row.status === 'delivered') {
    if (row.result === null) {
      throw new Error('锻造委托缺少交付结果');
    }
    const result = row.result as ForgeResult;

    if (result.equipment.userId !== row.ownerId || result.crafterId !== row.crafterId) {
      throw new Error('锻造委托交付归属无效');
    }
  } else if (row.result !== null) {
    throw new Error('未交付的锻造委托出现成品');
  }

  return value as ForgeOrder;
}
export function parseForgeOrders(value: unknown): ForgeOrders {
  const row = fields(value, [], ['page'], ['hasMore']);

  array(row.items).forEach(parseForgeOrder);

  return value as ForgeOrders;
}
