import type { RecoveryTip } from './adventureRecovery';

export function consumeRecoveryTips(operation: string, text: string): RecoveryTip[] {
  if (operation !== 'items.consume' && operation !== 'soul-artifacts.refine') {
    return [];
  }
  if (/参数错误|数量必须|请输入物品名称/.test(text)) {
    return [
      {
        label: '从背包核对名称与实例',
        command: operation === 'soul-artifacts.refine' ? '/储物袋 本命' : '/储物袋 道具',
        description: '服用/消耗按完整物品名称与正整数数量操作；炼化数字编号后只可追加“确认”。先核对实际持有，不把模板编号或页内序号当作本命物实例'
      }
    ];
  }
  if (operation === 'soul-artifacts.refine') {
    return [
      {
        label: '核对本命物实例',
        command: '/储物袋 本命',
        description: '从本人本命物详情选择实例编号；旧炼化入口未命中本命物时可能按储物袋道具消耗，先核对目标，未找到不证明本命物丢失'
      },
      {
        label: '核对当前本命物',
        command: '/本命物信息',
        description: '核对当前已炼化对象与原比较，结果不明时不再次确认或炼化其他实例；失败提示不证明替换一定未执行'
      },
      {
        label: '核对筑灵石返还',
        command: '/储物袋 材料 其它',
        description: '若发生替换，先核对原对象等级、背包与原返还回执；预览中的返还不是到账证明，不重复提交补领'
      }
    ];
  }

  return [
    {
      label: '核对道具与原回执',
      command: '/储物袋 道具',
      description: '核对当前持有数量和原使用回执，结果尚未明确时不再次服用或消耗；失败提示不证明道具一定未扣除'
    },
    { label: '核对人物状态', command: '/我的信息', description: '核对实际生效的修为、精力或元力等状态，不以本地预览代替结算；持续异常时保留原反馈联系运营' }
  ];
}
