import type { RecoveryTip } from './adventureRecovery';

export function achievementProgressTips(category: string): RecoveryTip[] {
  if (category === 'combat_power') {
    return [
      { label: '核对装备', command: '/我的装备', description: '对照本页实时战力和未达成的下一目标，核对当前穿戴、属性与套装；不承诺固定提升多少战力' },
      { label: '核对在用功法', command: '/我的功法', description: '核对当前在用功法及属性，再按实际培养条件选择提升，不承诺固定提升多少战力' },
      { label: '核对境界进度', command: '/我的境界', description: '核对境界、修为和突破材料，按实际成长条件提升；成就记录与奖励领取以服务端当前状态和回执为准' }
    ];
  }
  const targets: Record<string, { command: string; description: string }> = {
    storyline: {
      command: '/查看主线',
      description: '对照未达成目标与历史最佳星数，优先提高未满星关卡；成就按服务端累计口径判断，不把重复通关次数当成新增星数'
    },
    lingzhi: { command: '/我的灵田', description: '对照本分类未达成目标和实际进度，核对灵田等级、种植与收获状态；不同目标分别判断，不保证一次收割即可完成' },
    master: { command: '/我的师门', description: '对照本分类未达成目标核对当前师门与培养记录，不把存在师徒关系直接当作所有培养成就已达成' },
    tower_shop_unlock: { command: '/妖塔', description: '对照当前未达成目标与妖塔历史最佳星数，查看尚未满星的挑战；不把重复领取或消费当作提高成就进度' }
  };
  const target = targets[category];

  return target
    ? [{ label: '推进未达成目标', ...target }]
    : [
        {
          label: '核对成就条件',
          command: '/所有成就',
          description: '按目标名称和描述逐项核对实际达成条件，完成记录与奖励领取分开判断，不生成未满足条件的领取操作'
        }
      ];
}

export function achievementRecoveryTips(operation: string, text: string): RecoveryTip[] {
  if (!operation.startsWith('achievements.')) {
    return [];
  }
  if (/境界不足|炼气五层/.test(text)) {
    return [];
  }
  if (/页数超出|本页无记录/.test(text)) {
    return [
      {
        label: '返回记录首页',
        command: operation === 'achievements.all' ? '/所有成就' : '/我的成就',
        description: '按当前总数和页数重新选择，本页无记录不代表全部成就已消失'
      }
    ];
  }
  if (/没有可领取|奖励已领取/.test(text)) {
    return [
      {
        label: '核对成就进度',
        command: operation === 'achievements.claim-combat-power' ? '/成就 战力' : '/成就',
        description: '先核对当前目标、待领取数量与分类领取状态；没有可领取可能是尚未满足或已经领取，不重复提交，也不把兜底文案当作真实下一目标'
      }
    ];
  }
  if (/暂无.*配置|暂无成就数据/.test(text)) {
    return [
      { label: '查看成就目录', command: '/所有成就', description: '当前范围没有可显示配置，不等于人物进度归零；可核对目录，持续无配置时保留原反馈联系运营' }
    ];
  }
  if (text === '历史记录待核对') {
    return [
      {
        label: '核对历史成就状态',
        command: '/成就',
        description: '本页待领取按当前战力投影，历史已达成但未领取的记录请对照分类状态并以服务端结算为准；当前战力下降不证明历史奖励已经失效，不自动重新领取'
      }
    ];
  }
  if (operation.startsWith('achievements.claim-')) {
    return [
      {
        label: '核对成就进度与状态',
        command: '/成就',
        description: '领取结果未获完整确认，原事务或提交后的缓存步骤异常不证明奖励未发放；先核对分类状态，不自动重放整批领取'
      },
      { label: '核对已到账奖励', command: '/我的信息', description: '对照原回执核对本人资产，物品奖励再从储物袋查看；持续异常时保留原反馈联系运营' }
    ];
  }

  return [{ label: '查看成就总览', command: '/成就', description: '从总览核对当前分类、进度与领取状态；查询失败或完成记录为空不证明奖励丢失，不自动发起领取' }];
}
