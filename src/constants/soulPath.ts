import { describeSoulNode } from './soulPathEffects';

export const SOUL_PATH_STAGE_LEVEL = 4;

export const SOUL_PATHS = {
  XUAN_FA: 'xuan_fa',
  LIAN_TI: 'lian_ti',
  YU_QI: 'yu_qi'
} as const;

export type SoulPathKey = (typeof SOUL_PATHS)[keyof typeof SOUL_PATHS];

export const SOUL_PATH_NAMES: Record<SoulPathKey, string> = {
  [SOUL_PATHS.XUAN_FA]: '玄法道',
  [SOUL_PATHS.LIAN_TI]: '炼体道',
  [SOUL_PATHS.YU_QI]: '御器道'
};

export const SOUL_NURTURE_DIRECTIONS = {
  DING_HUN: 'ding_hun',
  YANG_PO: 'yang_po',
  WU_DAO: 'wu_dao',
  CHU_QIAO: 'chu_qiao'
} as const;

export type SoulNurtureDirection = (typeof SOUL_NURTURE_DIRECTIONS)[keyof typeof SOUL_NURTURE_DIRECTIONS];

export type SoulTier = 'steady' | 'insight' | 'enlightened' | 'backlash';

/** 原有概率集中管理，结算、说明与模拟共用。 */
export const SOUL_NURTURE_WEIGHTS: Record<'safe' | 'chu_qiao', Array<{ tier: SoulTier; weight: number }>> = {
  safe: [
    { tier: 'steady', weight: 60 },
    { tier: 'insight', weight: 30 },
    { tier: 'enlightened', weight: 10 }
  ],
  chu_qiao: [
    { tier: 'backlash', weight: 12 },
    { tier: 'steady', weight: 40 },
    { tier: 'insight', weight: 35 },
    { tier: 'enlightened', weight: 13 }
  ]
};

export const SOUL_NURTURE_DIRECTION_NAMES: Record<SoulNurtureDirection, string> = {
  [SOUL_NURTURE_DIRECTIONS.DING_HUN]: '定魂',
  [SOUL_NURTURE_DIRECTIONS.YANG_PO]: '养魄',
  [SOUL_NURTURE_DIRECTIONS.WU_DAO]: '悟道',
  [SOUL_NURTURE_DIRECTIONS.CHU_QIAO]: '出窍'
};

export const SOUL_MATERIALS = {
  SOUL_DEW: 'soul_dew',
  CALMING_SAND: 'calming_sand',
  NOURISHING_JADE: 'nourishing_jade',
  ENLIGHTENMENT_FRAGMENT: 'enlightenment_fragment',
  OUT_OF_BODY_GUIDE: 'out_of_body_guide',
  DAO_MARK_CRYSTAL: 'dao_mark_crystal'
} as const;

export type SoulMaterialKey = (typeof SOUL_MATERIALS)[keyof typeof SOUL_MATERIALS];

export const SOUL_MATERIAL_CONFIG: Record<SoulMaterialKey, { name: string; description: string; tradeable: boolean }> = {
  [SOUL_MATERIALS.SOUL_DEW]: {
    name: '神魂露',
    description: '元婴修士温养神魂所需的通用灵露。',
    tradeable: false
  },
  [SOUL_MATERIALS.CALMING_SAND]: {
    name: '定魂砂',
    description: '可稳固神魂、辅助定魂温养的细砂。',
    tradeable: false
  },
  [SOUL_MATERIALS.NOURISHING_JADE]: {
    name: '养魄玉',
    description: '蕴有温养魄力之效的灵玉。',
    tradeable: false
  },
  [SOUL_MATERIALS.ENLIGHTENMENT_FRAGMENT]: {
    name: '悟道残篇',
    description: '残存道意的篇章，可用于参悟道途。',
    tradeable: false
  },
  [SOUL_MATERIALS.OUT_OF_BODY_GUIDE]: {
    name: '出窍引',
    description: '引神魂暂离躯壳、探寻道痕的引物。',
    tradeable: false
  },
  [SOUL_MATERIALS.DAO_MARK_CRYSTAL]: {
    name: '道痕结晶',
    description: '凝结后的道途痕迹，用于关键节点与道途切换。',
    tradeable: false
  }
};

export const SOUL_PATH_CONFIG = {
  initialStability: 70,
  minStability: 20,
  maxStability: 100,
  outOfBodyMinStability: 30,
  dailyNurtureLimit: 3,
  monthCardExtraLowRiskLimit: 1,
  monthCardRerollLimit: 1,
  lowYieldPityThreshold: 3,
  pathSwitchCooldownDays: 7,
  pathSwitchDaoMarkCrystalCost: 3,
  tutorialInsight: 20
} as const;

export type SoulShopProductConfig = {
  shopCode: 'WANBAOLOU' | 'SHENQI';
  material: SoulMaterialKey;
  priceAmount: number;
  priceCurrencyCode: 'SPIRIT_CRYSTAL' | 'SPIRIT_MILK';
  quantity: number;
  limitPeriod: 'daily' | 'weekly';
  limitCount: number;
  weight: number;
};

/** 神魂材料固定货架。道痕结晶只在万宝楼出售，且服务层另校验每次购买间隔7天。 */
export const SOUL_SHOP_PRODUCT_CONFIG: readonly SoulShopProductConfig[] = [
  {
    shopCode: 'WANBAOLOU',
    material: SOUL_MATERIALS.SOUL_DEW,
    priceAmount: 100,
    priceCurrencyCode: 'SPIRIT_CRYSTAL',
    quantity: 1,
    limitPeriod: 'daily',
    limitCount: 3,
    weight: 860
  },
  {
    shopCode: 'WANBAOLOU',
    material: SOUL_MATERIALS.CALMING_SAND,
    priceAmount: 200,
    priceCurrencyCode: 'SPIRIT_CRYSTAL',
    quantity: 1,
    limitPeriod: 'weekly',
    limitCount: 7,
    weight: 859
  },
  {
    shopCode: 'WANBAOLOU',
    material: SOUL_MATERIALS.NOURISHING_JADE,
    priceAmount: 200,
    priceCurrencyCode: 'SPIRIT_CRYSTAL',
    quantity: 1,
    limitPeriod: 'weekly',
    limitCount: 7,
    weight: 858
  },
  {
    shopCode: 'WANBAOLOU',
    material: SOUL_MATERIALS.ENLIGHTENMENT_FRAGMENT,
    priceAmount: 400,
    priceCurrencyCode: 'SPIRIT_CRYSTAL',
    quantity: 1,
    limitPeriod: 'weekly',
    limitCount: 7,
    weight: 857
  },
  {
    shopCode: 'WANBAOLOU',
    material: SOUL_MATERIALS.OUT_OF_BODY_GUIDE,
    priceAmount: 400,
    priceCurrencyCode: 'SPIRIT_CRYSTAL',
    quantity: 1,
    limitPeriod: 'weekly',
    limitCount: 7,
    weight: 856
  },
  {
    shopCode: 'WANBAOLOU',
    material: SOUL_MATERIALS.DAO_MARK_CRYSTAL,
    priceAmount: 1000,
    priceCurrencyCode: 'SPIRIT_CRYSTAL',
    quantity: 1,
    limitPeriod: 'weekly',
    limitCount: 1,
    weight: 855
  },
  {
    shopCode: 'SHENQI',
    material: SOUL_MATERIALS.SOUL_DEW,
    priceAmount: 10,
    priceCurrencyCode: 'SPIRIT_MILK',
    quantity: 2,
    limitPeriod: 'daily',
    limitCount: 1,
    weight: 860
  },
  {
    shopCode: 'SHENQI',
    material: SOUL_MATERIALS.CALMING_SAND,
    priceAmount: 20,
    priceCurrencyCode: 'SPIRIT_MILK',
    quantity: 2,
    limitPeriod: 'weekly',
    limitCount: 2,
    weight: 859
  },
  {
    shopCode: 'SHENQI',
    material: SOUL_MATERIALS.NOURISHING_JADE,
    priceAmount: 20,
    priceCurrencyCode: 'SPIRIT_MILK',
    quantity: 2,
    limitPeriod: 'weekly',
    limitCount: 2,
    weight: 858
  },
  {
    shopCode: 'SHENQI',
    material: SOUL_MATERIALS.ENLIGHTENMENT_FRAGMENT,
    priceAmount: 40,
    priceCurrencyCode: 'SPIRIT_MILK',
    quantity: 2,
    limitPeriod: 'weekly',
    limitCount: 3,
    weight: 857
  },
  {
    shopCode: 'SHENQI',
    material: SOUL_MATERIALS.OUT_OF_BODY_GUIDE,
    priceAmount: 40,
    priceCurrencyCode: 'SPIRIT_MILK',
    quantity: 2,
    limitPeriod: 'weekly',
    limitCount: 3,
    weight: 856
  }
];

export const SOUL_DUNGEON_DROP_CONFIG = {
  soulDewProbability: 200,
  soulDewWeeklyLimit: 3,
  pathMaterialProbability: 60,
  pathMaterialWeeklyLimit: 2,
  outOfBodyGuideProbability: 20,
  outOfBodyGuideWeeklyLimit: 1
} as const;

type NurtureConfig = {
  name: string;
  description: string;
  material: SoulMaterialKey;
  preferredPath: SoulPathKey | null;
  baseStability: number;
  baseInsight: number;
  baseProficiency: number;
  lowRisk: boolean;
};

export const SOUL_NURTURE_CONFIG: Record<SoulNurtureDirection, NurtureConfig> = {
  [SOUL_NURTURE_DIRECTIONS.DING_HUN]: {
    name: '定魂',
    description: '稳固神魂，适合积累保底。',
    material: SOUL_MATERIALS.CALMING_SAND,
    preferredPath: SOUL_PATHS.LIAN_TI,
    baseStability: 6,
    baseInsight: 10,
    baseProficiency: 3,
    lowRisk: true
  },
  [SOUL_NURTURE_DIRECTIONS.YANG_PO]: {
    name: '养魄',
    description: '温养魄力，偏向炼体道。',
    material: SOUL_MATERIALS.NOURISHING_JADE,
    preferredPath: SOUL_PATHS.LIAN_TI,
    baseStability: 2,
    baseInsight: 12,
    baseProficiency: 8,
    lowRisk: true
  },
  [SOUL_NURTURE_DIRECTIONS.WU_DAO]: {
    name: '悟道',
    description: '参悟道意，偏向玄法道。',
    material: SOUL_MATERIALS.ENLIGHTENMENT_FRAGMENT,
    preferredPath: SOUL_PATHS.XUAN_FA,
    baseStability: 0,
    baseInsight: 15,
    baseProficiency: 8,
    lowRisk: true
  },
  [SOUL_NURTURE_DIRECTIONS.CHU_QIAO]: {
    name: '出窍',
    description: '神游寻痕，偏向御器道，可能遭遇反噬。',
    material: SOUL_MATERIALS.OUT_OF_BODY_GUIDE,
    preferredPath: SOUL_PATHS.YU_QI,
    baseStability: -2,
    baseInsight: 20,
    baseProficiency: 10,
    lowRisk: false
  }
};

export const SOUL_PATH_NODE_CONFIG: Record<
  SoulPathKey,
  Array<{
    key: string;
    name: string;
    description: string;
    requiredInsight: number;
    requiredProficiency: number;
    costs: Partial<Record<SoulMaterialKey, number>>;
  }>
> = {
  [SOUL_PATHS.XUAN_FA]: [
    { key: 'entry', name: '玄法·入门', description: '悟道温养获得额外道途熟练。', requiredInsight: 0, requiredProficiency: 0, costs: {} },
    {
      key: 'minor',
      name: '玄法·明悟',
      description: describeSoulNode('xuan_fa', 'minor'),
      requiredInsight: 100,
      requiredProficiency: 100,
      costs: { [SOUL_MATERIALS.ENLIGHTENMENT_FRAGMENT]: 3, [SOUL_MATERIALS.DAO_MARK_CRYSTAL]: 1 }
    },
    {
      key: 'complete',
      name: '玄法·圆融',
      description: describeSoulNode('xuan_fa', 'complete'),
      requiredInsight: 300,
      requiredProficiency: 300,
      costs: { [SOUL_MATERIALS.ENLIGHTENMENT_FRAGMENT]: 8, [SOUL_MATERIALS.DAO_MARK_CRYSTAL]: 3 }
    }
  ],
  [SOUL_PATHS.LIAN_TI]: [
    { key: 'entry', name: '炼体·入门', description: '养魄与定魂温养获得额外道途熟练。', requiredInsight: 0, requiredProficiency: 0, costs: {} },
    {
      key: 'minor',
      name: '炼体·凝魄',
      description: describeSoulNode('lian_ti', 'minor'),
      requiredInsight: 100,
      requiredProficiency: 100,
      costs: { [SOUL_MATERIALS.NOURISHING_JADE]: 3, [SOUL_MATERIALS.DAO_MARK_CRYSTAL]: 1 }
    },
    {
      key: 'complete',
      name: '炼体·圆融',
      description: describeSoulNode('lian_ti', 'complete'),
      requiredInsight: 300,
      requiredProficiency: 300,
      costs: { [SOUL_MATERIALS.NOURISHING_JADE]: 8, [SOUL_MATERIALS.DAO_MARK_CRYSTAL]: 3 }
    }
  ],
  [SOUL_PATHS.YU_QI]: [
    { key: 'entry', name: '御器·入门', description: '出窍温养获得额外道途熟练。', requiredInsight: 0, requiredProficiency: 0, costs: {} },
    {
      key: 'minor',
      name: '御器·通灵',
      description: describeSoulNode('yu_qi', 'minor'),
      requiredInsight: 100,
      requiredProficiency: 100,
      costs: { [SOUL_MATERIALS.OUT_OF_BODY_GUIDE]: 3, [SOUL_MATERIALS.DAO_MARK_CRYSTAL]: 1 }
    },
    {
      key: 'complete',
      name: '御器·圆融',
      description: describeSoulNode('yu_qi', 'complete'),
      requiredInsight: 300,
      requiredProficiency: 300,
      costs: { [SOUL_MATERIALS.OUT_OF_BODY_GUIDE]: 8, [SOUL_MATERIALS.DAO_MARK_CRYSTAL]: 3 }
    }
  ]
};

export const getSoulPathStageName = (nodeCount: number): string => {
  if (nodeCount >= 3) {
    return '圆融';
  }
  if (nodeCount >= 2) {
    return '小成';
  }

  return nodeCount > 0 ? '入门' : '未修习';
};
