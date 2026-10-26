import type { RecoveryTip } from './adventureRecovery';
import { cultivationRecoveryTips } from './cultivationRecovery';

/** Options are read-only; selecting an attribute consumes a charm before confirmation. */
export function skillRerollRecoveryTips(text: string): RecoveryTip[] {
  const tips = cultivationRecoveryTips('skill-books.reroll', text);
  let detail = '';

  if (/换词符不足/.test(text)) {
    detail = '仅查看词条列表不消耗；选择词条生成新预览会消耗1张换词符，先核对持有数量';
  } else if (/你有一份功法换词结果待确认/.test(text)) {
    detail = '预览有效期60秒，确认必须使用原预览的功法编号；本次拒绝未返回待确认编号，不能用本次请求编号代替，取消不返还已消耗的换词符';
  } else if (/当前没有待(?:确认|取消)的换词结果|换词结果已作废/.test(text)) {
    detail = '先核对原词条和换词符；预览过期不代表换词符返还，生成新预览会再次消耗1张，不自动重新生成';
  } else if (/当前待确认的是功法ID/.test(text)) {
    detail = '当前待确认编号与本次请求不符，回看原预览再决定，不把错误编号改成另一笔确认';
  } else if (/无法识别词条|没有激活词条|没有可替换/.test(text)) {
    detail = '先查看该已学实例的换词列表，再按当前激活词条的完整名称选择；没有有效目标时不为重试继续购买换词符';
  }
  if (tips.length) {
    const current = tips.map((tip, index) => (index === 0 && detail ? { ...tip, description: `${tip.description}；${detail}` } : tip));

    if (/操作繁忙|功法.*失败，请稍后再试/.test(text)) {
      current.push({ label: '核对换词符', command: '/储物袋', description: '生成预览会扣1张换词符，取消不返还；先核对原词条和换词符数量，不自动重放' });
    }

    return current;
  }
  if (/参数错误|确认需要原数字编号/.test(text)) {
    return [
      {
        label: '核对已学编号与用法',
        command: '/我的功法',
        description: '使用 /换词 功法ID 查看词条列表；选择完整词条名才生成付费预览，确认使用原预览上的 /确认换词 功法ID，不发送缺编号的确认'
      }
    ];
  }

  return [
    {
      label: '核对功法当前状态',
      command: '/我的功法',
      description: '换词结果尚需核对，保留原预览和结算回执；失败提示不证明生成、确认或取消一定未执行，不自动重放原操作'
    },
    {
      label: '核对换词符',
      command: '/储物袋',
      description: '核对当前换词符数量，生成预览会扣1张，取消不返还；原结果未明确前不再次选词消耗，持续异常时保留原反馈联系运营'
    }
  ];
}
