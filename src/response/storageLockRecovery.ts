import type { RecoveryTip } from './adventureRecovery';

/** Category/name failures can hide earlier committed changes; never reverse or retry here. */
export function storageLockRecoveryTips(operation: string, text: string): RecoveryTip[] {
  if (operation !== 'storage.lock' && operation !== 'storage.unlock') {
    return [];
  }
  const category = text.match(/(?:^|\n)分类[:：]\s*([^\n]+)|分类["“]([^"”]+)["”]/);
  const first = (category?.[1] ?? category?.[2] ?? '').split('-')[0];
  const command = ['材料', '道具', '装备', '天工', '功法', '本命'].includes(first) ? `/储物袋 ${first}` : '/储物袋';

  if (/参数错误|物品ID必须/.test(text)) {
    return [
      {
        label: '核对物品分类与实例',
        command: '/储物袋',
        description: '从本人当前分类使用物品实例ID或原名称，模板ID和页内序号不能替代实例ID；按分类操作会影响整个范围，先核对目标与保留意愿'
      }
    ];
  }
  if (/上架中/.test(text)) {
    return [
      {
        label: '核对我的上架',
        command: '/我的上架',
        description: '上架中的本命物不能在这里修改保护状态；先核对当前上架与持有状态，是否下架由你决定，不自动下架或解锁'
      }
    ];
  }
  if (/已装备的装备/.test(text)) {
    return [
      { label: '核对当前穿戴', command: '/我的装备', description: '该操作针对未穿戴实例，当前装备无需在这里修改锁定；先核对部位和保护意愿，不自动卸下后操作' }
    ];
  }
  if (/已启用的天工/.test(text)) {
    return [
      { label: '核对当前天工工具', command: '/储物袋 天工', description: '启用中的工具无需在这里修改保护状态；核对当前持有与启用状态，不自动替换或卸下工具' }
    ];
  }
  if (/已学习的功法/.test(text)) {
    return [
      { label: '核对持有功法', command: '/储物袋 功法', description: '已学习功法无需在这里修改锁定；核对未学习实例与当前状态，不自动卸下、分解或重复学习' }
    ];
  }
  if (/不存在|不属于你|未找到名为|可能原因|已被锁定|未被锁定|物品已锁定|物品未锁定/.test(text)) {
    return [
      {
        label: '核对当前物品状态',
        command,
        description: '按当前实例、分类和保护状态核对原反馈；列出的可能原因不等于已确认全部达到目标，名称操作也可能已有部分变更，不自动反向操作或重放整批'
      }
    ];
  }

  return [
    {
      label: '先核对各分类状态',
      command,
      description: '保留原成功数量和问题反馈；名称操作可能跨类别逐段提交，前段完成不会因后段异常而回滚，未知结果不证明没有变更，不自动重复锁定、解锁或反向恢复'
    }
  ];
}
