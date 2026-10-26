import { withoutExpectedAdvice } from './recovery-delta.mjs';

// Frozen bubble comparison checks the new navigation first; the live-handler
// recovery suite independently checks each authoritative reason and next action.
export function withoutEquipmentRecovery(messages, row) {
  const text = row.result.middleware?.replies?.at(-1)?.text ?? '';
  let tips = [];
  if (row.op === 'equipment.detail') {
    if (!row.result.success) tips = text.includes('未装备任何') ? [['/储物袋 装备', '没有穿戴不等于背包没有']] : [['/我的装备', '从当前穿戴面板核对部位名称']];
  } else if (row.op === 'equipment.equipped') {
    if (!row.result.success) tips = [['/储物袋 装备', '不证明装备已丢失']];
    else if (row.result.data.slots.length === 0) tips = [['/储物袋 装备', '核对类型配置']];
  } else if (!row.result.success) {
    if (row.op === 'equipment.equip' || row.operation === 'equipment.equip') {
      if (text.includes('境界不足')) tips = [
        ['/我的信息', '核对当前境界'], ['/查看主线', '挑战主线获取修为'], ['/我的境界', '核对当前修为'], ['/闭关', '暂时不打关卡']
      ];
      else if (text.includes('天工工具')) tips = [['/储物袋 天工', '职业工具替换流程']];
      else if (/指定要装备|未找到该装备/.test(text)) tips = [['/储物袋 装备', '模板ID和页内序号'], ['/我的装备', '是否已经穿戴']];
      else tips = [['/我的装备', '装备状态可能已写入']];
    } else if (row.op === 'equipment.unequip-one') {
      tips = [['/我的装备', /指定要卸下|未找到|未装备任何/.test(text) ? '卸下参数是装备类型' : '装备状态可能已写入']];
    } else if (text.includes('暂无装备类型数据')) tips = [['/储物袋 装备', '核对类型配置']];
    else tips = [['/我的装备', '装备状态可能已写入']];
  } else if (row.op === 'equipment.auto-equip') {
    const data = row.result.data;
    if (!data.success) tips = [['/我的装备', '装备状态可能已写入']];
    else if (data.results.some(item => !item.equipped && item.reason === '无可用装备')) tips = [['/储物袋 装备', '不代表整个背包为空']];
    else if (data.results.length > 0 && data.results.every(item => !item.equipped && item.reason === '已是最佳')) tips = [['/我的装备', '无需反复提交']];
  }
  return withoutExpectedAdvice(messages, tips.map(([command, text]) => ({ command, text })));
}

export function withoutDecomposeRecovery(messages, reason) {
  if (!reason) return withoutExpectedAdvice(messages, []);
  let command='/储物袋 装备', text='不证明没有消耗或收益';
  if (/参数错误|装备ID必须|instanceId 必须/.test(reason)) text='不使用模板ID或页内序号';
  else if (/先卸下装备/.test(reason)) {command='/我的装备';text='不自动卸下';}
  else if (/已锁定/.test(reason)&&!reason.includes('暂无可分解')) text='不自动解锁';
  else if (/暂无可分解|没有可分解/.test(reason)) text='不默认解锁或卸下装备';
  else if (/无效的品级|预览失败|状态已变化|确认超时|已取消分解/.test(reason)) {command='/一键分解装备';text='不沿用过期确认';}
  return withoutExpectedAdvice(messages,[{command,text}]);
}
