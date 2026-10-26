/**
 * 通用商店配置
 * 每个商店的元信息：名称、货币、指令等
 */
type ShopCode = 'WANBAOLOU' | 'SHENQI' | 'REPUTATION' | 'CHECKIN' | 'TOWER_SCORE' | 'DAOLV';

export interface ShopMeta {
  /** 商店代号 */
  code: ShopCode;
  /** 商店中文名 */
  name: string;
  /** 商店主货币中文名（展示用） */
  currencyName: string;
  /** 列表指令名 */
  listCmd: string;
  /** 购买指令名 */
  buyCmd: string;
}

/**
 * 所有商店共用统一的购买指令 /购买 <id> [数量]
 * 因为商品 id 在 wanbaolou_products 表中全局唯一
 */
const UNIFIED_BUY_CMD = '购买';

export const SHOP_META: Record<string, ShopMeta> = {
  WANBAOLOU: {
    code: 'WANBAOLOU',
    name: '万宝楼',
    currencyName: '灵石/灵晶/道晶',
    listCmd: '商店 万宝楼',
    buyCmd: UNIFIED_BUY_CMD
  },
  SHENQI: {
    code: 'SHENQI',
    name: '神奇商店',
    currencyName: '道晶',
    listCmd: '商店 神奇',
    buyCmd: UNIFIED_BUY_CMD
  },
  REPUTATION: {
    code: 'REPUTATION',
    name: '声望商店',
    currencyName: '声望',
    listCmd: '商店 声望',
    buyCmd: UNIFIED_BUY_CMD
  },
  CHECKIN: {
    code: 'CHECKIN',
    name: '签到商店',
    currencyName: '签到币',
    listCmd: '商店 签到',
    buyCmd: UNIFIED_BUY_CMD
  },
  TOWER_SCORE: {
    code: 'TOWER_SCORE',
    name: '积分商店',
    currencyName: '积分',
    listCmd: '商店 积分',
    buyCmd: UNIFIED_BUY_CMD
  },
  DAOLV: {
    code: 'DAOLV',
    name: '道侣商店',
    currencyName: '同心值',
    listCmd: '商店 道侣',
    buyCmd: UNIFIED_BUY_CMD
  }
};

/** 根据商店代号获取配置 */
export const getShopMeta = (code: string): ShopMeta | undefined => SHOP_META[code];
