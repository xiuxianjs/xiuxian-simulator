import type { BackendInventoryPage, EquipmentBagData } from '@src/api';
import type { SkillBookBagCapability, SkillBookStoragePageData } from '@src/api';

type GuiAction = { label: string; command: string };
type InventoryItem = BackendInventoryPage['items'][number];
type InventoryCapability = InventoryItem['capabilities'][number];
type EquipmentItem = EquipmentBagData['items'][number];
type EquipmentCapability = EquipmentBagData['capabilities'][number];
type SkillBookItem = SkillBookStoragePageData['items'][number];

/**
 * The server decides which entry points are authorized. This adapter only
 * renders those facts as commands understood by the chat platform.
 */
export function inventoryItemActions(item: InventoryItem): GuiAction[] {
  const category = item.type === 'prop' ? '道具' : item.type === 'material' ? '材料' : item.type;

  return item.capabilities.map(capability => inventoryCapabilityAction(capability, item, category));
}

export function inventoryPageActions(capabilities: BackendInventoryPage['capabilities'], category: '道具' | '材料', subcategory: string): GuiAction[] {
  return capabilities.map(capability => {
    if (capability.kind === 'lockAll') {
      return { label: '一键锁定', command: `/锁定 ${category} ${subcategory}` };
    }
    if (capability.kind === 'unlockAll') {
      return { label: '一键解锁', command: `/解锁 ${category} ${subcategory}` };
    }
    if (capability.kind === 'nascentSoulPath') {
      return { label: '元婴道途', command: '/元婴道途' };
    }
    if (capability.kind === 'viewProfile') {
      return { label: '我的主页', command: '/我' };
    }
    throw new Error(`背包接口返回未知页面能力: ${capability.kind}`);
  });
}

/**
 * Equipment eligibility belongs to the server.  This adapter only translates
 * the already-authorized capability into the command vocabulary of the bot.
 */
export function equipmentItemActions(item: EquipmentItem): GuiAction[] {
  return item.capabilities.map(capability => equipmentCapabilityAction(capability, item));
}

export function equipmentPageActions(capabilities: EquipmentBagData['capabilities']): GuiAction[] {
  return capabilities.map(capability => equipmentCapabilityAction(capability));
}

/** The service owns all skill-book eligibility and parameters. */
export function skillBookItemActions(item: SkillBookItem): GuiAction[] {
  return item.capabilities.map(capability => skillBookCapabilityAction(capability, item));
}

export function skillBookPageActions(capabilities: SkillBookBagCapability[]): GuiAction[] {
  return capabilities.map(capability => skillBookCapabilityAction(capability));
}

function skillBookCapabilityAction(capability: SkillBookBagCapability, item?: SkillBookItem): GuiAction {
  switch (capability.kind) {
    case 'lock':
      return { label: '锁定', command: `/锁定 功法 ${skillBookID(item)}` };
    case 'unlock':
      return { label: '解锁', command: `/解锁 功法 ${skillBookID(item)}` };
    case 'learn':
      return { label: '学习', command: `/学习功法 ${skillBookID(item)}` };
    case 'decompose':
      return { label: '分解', command: `/分解功法 ${skillBookID(item)}` };
    case 'viewDetail':
      if (!item || item.skillBookId <= 0) {
        throw new Error('功法详情能力缺少模板ID');
      }

      return { label: '详情', command: `/物品详情 功法 ${item.skillBookId}` };
    case 'lockAll':
      return { label: '一键锁定', command: `/锁定 功法 ${skillType(capability)}` };
    case 'unlockAll':
      return { label: '一键解锁', command: `/解锁 功法 ${skillType(capability)}` };
    case 'decomposeAll':
      return { label: '一键分解预览', command: '/一键分解功法' };
  }
}

function skillBookID(item: SkillBookItem | undefined): number {
  if (!item) {
    throw new Error('功法实例能力缺少实例');
  }

  return item.id;
}

function skillType(capability: SkillBookBagCapability): string {
  if (!capability.skillType) {
    throw new Error('功法批量能力缺少分类');
  }

  return capability.skillType;
}

function equipmentCapabilityAction(capability: EquipmentCapability, item?: EquipmentItem): GuiAction {
  switch (capability.kind) {
    case 'equip':
      if (!item) {
        throw new Error('装备能力缺少实例');
      }

      return { label: '装备', command: `/装备 ${item.id}` };
    case 'lock':
      if (!item) {
        throw new Error('装备能力缺少实例');
      }

      return { label: '锁定', command: `/锁定 装备 ${item.id}` };
    case 'unlock':
      if (!item) {
        throw new Error('装备能力缺少实例');
      }

      return { label: '解锁', command: `/解锁 装备 ${item.id}` };
    case 'decompose':
      if (!item) {
        throw new Error('装备能力缺少实例');
      }

      return { label: '分解', command: `/分解装备 ${item.id}` };
    case 'viewDetail':
      if (!item) {
        throw new Error('装备能力缺少实例');
      }

      return { label: '详情', command: `/物品详情 装备 ${item.equipmentId}` };
    case 'lockAll':
      return { label: '一键锁定', command: `/锁定 装备 ${equipmentType(capability)}` };
    case 'unlockAll':
      return { label: '一键解锁', command: `/解锁 装备 ${equipmentType(capability)}` };
    case 'decomposeAll':
      return { label: '一键分解预览', command: '/一键分解装备' };
    default:
      throw new Error(`装备接口返回未知能力: ${capability.kind}`);
  }
}

function equipmentType(capability: EquipmentCapability): string {
  if (!capability.equipmentType) {
    throw new Error('装备批量能力缺少分类');
  }

  return capability.equipmentType;
}

function inventoryCapabilityAction(capability: InventoryCapability, item: InventoryItem, category: string): GuiAction {
  switch (capability.kind) {
    case 'consume':
      if (item.effect && typeof item.effect === 'object' && 'effectType' in item.effect && item.effect.effectType === 'forge_blueprint') {
        return { label: '学习', command: `/消耗 ${item.name} 1` };
      }

      return { label: '服用', command: `/服用 ${item.name} 1` };
    case 'viewRecipe':
      if (!capability.recipeId) {
        throw new Error('背包接口的配方能力缺少配方ID');
      }

      return { label: '配方', command: `/丹方详情 ${capability.recipeId}` };
    case 'startOath':
      return { label: '誓约', command: '/结为道侣' };
    case 'giveGift':
      return { label: '赠送', command: `/赠送 ${item.name}` };
    case 'activateFormation':
      return { label: '激活', command: `/激活阵盘 ${item.name}` };
    case 'unlock':
      return { label: '解锁', command: `/解锁 ${category} ${item.id}` };
    case 'lock':
      return { label: '锁定', command: `/锁定 ${category} ${item.id}` };
    case 'viewDetail':
      return { label: '详情', command: `/物品详情 ${item.name}` };
    default:
      throw new Error(`背包接口返回未知物品能力: ${capability.kind}`);
  }
}
