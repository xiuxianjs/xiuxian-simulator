import type { SoulArtifactOverviewCapability, SoulArtifactOverviewPageCapability } from '@src/api/schemas/soul-artifact-overview-query';

type GuiAction = { label: string; command: string };

/**
 * The service decides whether each action is currently available and supplies
 * its instance and count facts. This adapter only translates those facts into
 * the bot command vocabulary.
 */
export function soulArtifactActions(capabilities: SoulArtifactOverviewCapability[]): GuiAction[] {
  return capabilities.flatMap(capability => {
    if (!capability.available) {
      return [];
    }

    switch (capability.kind) {
      case 'refine':
        return [{ label: '炼化', command: `/炼化 ${capability.instanceId}` }];
      case 'gradeUpgrade':
        return [{ label: '升品', command: `/本命物升品 ${capability.instanceId}` }];
      case 'upgradeLevel':
        return upgradeActions(capability);
      case 'wash':
        return [{ label: '洗涤×1', command: '/本命物洗涤' }];
      case 'unequip':
        return [{ label: '分离', command: '/分离' }];
      case 'lock':
        return [{ label: '锁定', command: `/锁定 本命 ${capability.instanceId}` }];
      case 'unlock':
        return [{ label: '解锁', command: `/解锁 本命 ${capability.instanceId}` }];
    }
  });
}

export function soulArtifactPageActions(capabilities: SoulArtifactOverviewPageCapability[]): GuiAction[] {
  return capabilities.flatMap(capability => {
    if (!capability.available) {
      return [];
    }

    switch (capability.kind) {
      case 'soulPath':
        return [{ label: '元婴道途', command: '/元婴道途' }];
    }
  });
}

function upgradeActions(capability: SoulArtifactOverviewCapability): GuiAction[] {
  const maxLevels = capability.maxLevels;

  if (!maxLevels || maxLevels < 1) {
    throw new Error('本命物升级能力缺少可用等级数');
  }
  const actions: GuiAction[] = [{ label: '升级×1', command: '/本命物升级' }];

  if (maxLevels >= 5) {
    actions.push({ label: '升级×5', command: '/本命物升级 5' });
  }
  if (maxLevels > 1) {
    actions.push({ label: '一键升级', command: `/本命物升级 ${maxLevels}` });
  }

  return actions;
}

/** Explain only the operation state supplied by the service; no client eligibility calculation. */
export function soulArtifactBlockedAdvice(
  capabilities: Array<SoulArtifactOverviewCapability | SoulArtifactOverviewPageCapability>
): Array<{ command: string; description: string }> {
  const labels = {
    refine: '炼化',
    gradeUpgrade: '升品',
    upgradeLevel: '升级',
    wash: '洗涤',
    unequip: '分离',
    lock: '锁定',
    unlock: '解锁',
    soulPath: '元婴道途'
  };
  const tips = capabilities
    .filter(capability => !capability.available)
    .map(capability => {
      const label = labels[capability.kind];
      const result = (command: string, description: string) => ({ command, description: `${label}暂不可用：${description}` });

      switch (capability.reasonCode) {
        case 'realmTooLow':
        case 'realmStageTooLow':
          return result('/查看主线', '当前境界尚未开放；先核对人物修为与突破材料，推进主线积累修为，符合条件后突破，离线前可闭关');
        case 'listed':
          return result('/我的上架', '目标正在上架，先核对本人挂单，再决定是否下架；不会自动下架或解锁');
        case 'alreadyUpgraded':
          return result('/储物袋 本命', '此实例已升品，核对其他实例和当前品级，不为同一实例继续准备升品材料');
        case 'maxGrade':
          return result('/储物袋 本命', '已达当前品级上限，查看其他实例或现有培养方向，继续补同品材料不能解除此上限');
        case 'maxLevel':
          return result('/我的境界', '当前服务端未开放更多可升等级；核对人物境界上限和本命物等级，不据此继续购买升级材料');
        case 'materialsInsufficient':
          return result(
            '/储物袋 本命',
            `核对同名同品、未装备未锁定且排除目标自身的材料实例${'requiredQuantity' in capability && capability.requiredQuantity !== undefined ? `，需要${capability.requiredQuantity}` : ''}${'availableQuantity' in capability && capability.availableQuantity !== undefined ? `、可用${capability.availableQuantity}` : ''}；背包总数不等于可消耗数`
          );
        case 'itemsInsufficient':
          return result('/储物袋 材料 其它', `先核对${capability.kind === 'wash' ? '洗涤石' : '筑灵石'}及当前可用数量，再决定是否补充；不自动购买或继续消耗`);
        case 'pendingConfirmation':
          return result('/本命物信息', '已有洗涤结果待处理，先回看原预览与当前词条再决定确认或放弃；放弃不返还已用洗涤石，不重复生成新预览');
        case 'serviceUnavailable':
          return result('/本命物信息', '对应服务暂不可用，保留原状态，稍后重新查看；补充材料不能解决服务未配置');
        default:
          return result('/本命物信息', '暂不可用，请查看当前本命物');
      }
    });

  return tips.filter((tip, index) => tips.findIndex(other => other.command === tip.command && other.description === tip.description) === index);
}
