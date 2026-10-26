import assert from 'node:assert/strict';
import { bubbleSemantics } from './bubble-semantics.mjs';

// Reviewed additions only. Expectations stay independent of production recovery helpers.
export function inventoryAdvice(operation, text) {
  if (operation === 'learned' || operation === 'hidden') {
    const hidden=operation==='hidden';
    if (/页码超出范围/.test(text)) return [{ text: hidden?'隐藏列表从第1页开始':'实例列表从第2页开始', command: hidden?'/我的隐藏功法 1':'/我的功法 2' }];
    if (hidden && /暂无隐藏功法/.test(text)) return [{ text: '隐藏列表为空不代表功法丢失', command: '/我的功法' }];
    if (/可见列表为空/.test(text)) return [{ text: '可见列表为空不等于没有已学实例', command: '/我的隐藏功法' }, { text: '储物袋秘籍与已学列表不同', command: '/储物袋 功法' }];
    return [{ text: '查询失败不证明功法丢失', command: hidden?'/我的隐藏功法':'/我的功法' }, { text: '可见与隐藏列表分别核对', command: hidden?'/我的功法':'/我的隐藏功法' }];
  }
  if (operation === 'wudao') {
    if (/缺少道具[：:]悟道石|悟道石不足/.test(text)) return [{ text: '每次消耗1个', command: '/储物袋' }, { text: '不保证当前有货', command: '/珍宝楼' }];
    if (/已无可悟道|已达到模板约定上限|已无法提升|当前值为0/.test(text)) return [{ text: '不以提升人物境界或补石代替模板上限', command: '/我的功法' }];
    if (/功法不存在或未学习/.test(text)) return [{ text: '从本人已学功法查看有效编号', command: '/我的功法' }];
    return [{ text: '使用本人已学实例编号', command: '/我的功法' }, { text: '异常不证明缺石或未消耗', command: '/储物袋' }];
  }
  if (operation === 'proficiency') {
    if (/熟练点不足/.test(text)) return [{ text: '投入次数不保证等量成功', command: '/我的功法' }, { text: '不会补充熟练点', command: '/比试' }];
    if (/熟练度已达圆满/.test(text)) return [{ text: '无需继续投入熟练点', command: '/我的功法' }];
    if (/没有已学习的功法/.test(text)) return [{ text: '查看当前功法状态', command: '/我的功法' }];
    return [{ text: '使用本人已学实例编号或完整名称', command: '/我的功法' }];
  }
  if (operation === 'batch-learn') {
    if (/取消/.test(text) && !/参数错误/.test(text)) return [{ text: '取消只结束本次选择', command: '/我的功法' }, { text: '仍需你明确确认', command: '/一键学习功法' }];
    return [{ text: /同技能/.test(text) ? '不会替换、返还或继承' : '不直接重复确认', command: '/我的功法' }, { text: '按每个技能选择当前最高品级候选', command: '/储物袋 功法' }];
  }
  if (operation === 'unequip') return [{ text: /当前没有使用中的/.test(text) ? '无需重复换下' : '结果未获确认时不直接重复换下', command: '/我的功法' }];
  if (operation === 'hide' || operation === 'show') {
    if (/找不到ID为 .* 的已学功法/.test(text)) return [{ text: '从本人已学功法查看有效编号', command: '/我的功法' }];
    if (/使用中的功法无法隐藏/.test(text)) return [{ text: '不会自动卸下', command: '/我的功法' }];
    return [{ text: '从本人已学列表核对完整正整数实例编号', command: '/我的功法' }, { text: '已达到目标状态无需重复提交', command: '/我的隐藏功法' }];
  }
  if (operation === 'batch-query' || operation === 'batch-confirm') {
    if (operation === 'batch-confirm' && /功法状态已变化/.test(text)) return [{ text: '不重复执行旧分解', command: '/储物袋 功法' }];
    if (operation === 'batch-confirm' && !/没有符合条件|暂无可分解/.test(text)) return [{ text: '结果不明时不重复确认', command: '/储物袋 功法' }, { text: '失败提示不证明未删除或未返还', command: '/储物袋 材料 经验材料' }];
    return [{ text: '不自动解锁或换下', command: '/储物袋 功法' }, { text: '新预览仍需你确认', command: '/一键分解功法' }];
  }
  if (/参数错误|ID必须|次数必须|第二个参数/.test(text)) return [{ text: '编号和次数使用完整正整数', command: operation === 'upgrade' ? '/我的功法' : '/储物袋 功法' }];
  if (/功法不存在或未学习|找不到ID为 .* 的已学功法|功法未学习|该功法已经在使用中|类型不匹配/.test(text)) return [{ text: '从本人已学功法查看有效编号', command: '/我的功法' }];
  if (/功法已被锁定|功法状态已变化/.test(text)) return [{ text: '不重复执行旧分解', command: '/储物袋 功法' }];
  if (operation === 'learn' && /该功法已经学习/.test(text)) return [{ text: '该实例已学，无需再购买或重复学习', command: '/我的功法' }];
  if (operation === 'learn' && /功法正在使用中，无法替换/.test(text)) return [{ text: '换下后重新比较目标与返还', command: '/我的功法' }];
  if (operation === 'learn' && /当前待学功法品级低于已学功法/.test(text)) return [{ text: '确认文字不能绕过此限制', command: '/我的功法' }, { text: '不以提升人物境界替代功法品级条件', command: '/储物袋 功法' }];
  if (operation === 'learn') return /锁定/.test(text)
    ? [{ text: '自行决定是否解锁', command: '/储物袋 功法' }]
    : [{ text: '未找到不等于秘籍被消耗', command: '/储物袋 功法' }, { text: '失败提示不证明替换未执行', command: '/我的功法' }];
  if (operation === 'decompose') return [{ text: '分解会删除实例', command: '/储物袋 功法' }, { text: '失败提示不证明分解或返还未发生', command: '/储物袋 材料 经验材料' }];
  if (/功法经验道具不足/.test(text)) return [{ text: '核对可用于功法升级的经验道具', command: '/储物袋 材料 经验材料' }, { text: '查询是否有需要的经验材料出售', command: '/珍宝楼' }];
  if (/所有属性已达到上限|没有已学习的功法/.test(text)) return [{ text: '查看当前功法状态', command: '/我的功法' }];
  if (/^(?:❌\s*)?灵石不足/.test(text)) return [{ text: '核对可用灵石', command: '/我的信息' }];
  return [{ text: '部分成功以服务器实际次数和消耗为准', command: '/我的功法' }, { text: '核对功法经验材料', command: '/储物袋 材料 经验材料' }, { text: '结果未确认时不直接继续原数量升级', command: '/我的信息' }];
}

export function rejectsInventoryInput(operation, args) {
  const positive = value => /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0;
  return args.bookId != null && !positive(args.bookId)
    || operation === 'learn' && args.confirm != null && !['确认', '是', 'yes', 'Yes', 'YES'].includes(args.confirm)
    || operation === 'upgrade' && args.count != null && args.count !== '选择' && !positive(args.count);
}

export function assertInventoryGuard(messages, operation) {
  const view = bubbleSemantics(messages);
  assert.ok(view.text.includes('参数错误：请核对功法实例编号及完整参数，不附多余文字。'));
  assert.ok(view.commands.includes(operation === 'upgrade' ? '/我的功法' : '/储物袋 功法'));
  assert.ok(!view.commands.some(command => /^\/(?:学习功法|分解功法|升级功法|解锁)(?:\s|$)/.test(command)));
}
