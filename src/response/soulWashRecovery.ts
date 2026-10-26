import type { RecoveryTip } from './adventureRecovery';
import { cultivationRecoveryTips } from './cultivationRecovery';

export function soulWashRecoveryTips(text: string): RecoveryTip[] {
  // Realm growth is supplied by the shared business renderer.
  if (/金丹及以上方可洗涤|需达到.+后开放|境界不足/.test(text)) {
    return [];
  }
  if (/确认与取消不接收参数/.test(text)) {
    return [
      {
        label: '核对原预览',
        command: '/本命物信息',
        description: '回看当前原预览后使用 /确认本命物洗涤 或 /取消本命物洗涤，不附编号或数量；先核对词条，不自动提交原选择'
      }
    ];
  }
  const existing = cultivationRecoveryTips('soul-artifacts.wash', text);

  if (existing.length) {
    const detail = /洗涤结果待确认/.test(text)
      ? '原预览有效期60秒，先回看原预览再决定，不再次生成预览'
      : /没有待(?:确认|取消)|已作废/.test(text)
        ? '预览过期不代表洗涤石返还；需要新操作时先核对当前材料与消耗'
        : '';

    return existing.map((tip, index) => (index === 0 && detail ? { ...tip, description: `${tip.description}；${detail}` } : tip));
  }
  if (/请先炼化本命物/.test(text)) {
    return [
      { label: '核对持有本命物', command: '/储物袋 本命', description: '先从本人背包核对实例和炼化条件，选定当前本命物后再查看洗涤能力，不自动炼化或消耗材料' }
    ];
  }
  if (/仅支持单次/.test(text)) {
    return [
      {
        label: '核对单次洗涤条件',
        command: '/本命物信息',
        description: '机器人只支持单次预览；先核对当前本命物与洗涤石，需要新操作时直接发送 /本命物洗涤，不附数量；生成预览会消耗洗涤石'
      }
    ];
  }

  return [
    {
      label: '先核对本命物面板',
      command: '/本命物信息',
      description: '洗涤结果尚未确认，先核对原预览和当前词条；失败提示不证明生成、确认或取消一定未执行，不直接重新洗涤'
    },
    {
      label: '核对洗涤石',
      command: '/储物袋',
      description: '核对当前洗涤石数量，生成预览会消耗材料，取消不返还；原结果不明时不重新生成预览，持续异常时保留原反馈联系运营'
    }
  ];
}
