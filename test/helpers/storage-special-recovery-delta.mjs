import assert from 'node:assert/strict';
import { withoutExpectedAdvice } from './recovery-delta.mjs';

export function withoutSpecialStorageRecovery(messages, row, operation) {
  const tool = operation === 'storage.profession-tools';
  const book = operation === 'storage.skill-books';
  const data = row.result.data;
  const bag = book ? data?.bag : data;
  const category = tool ? '天工' : book ? '功法' : '本命';
  let expected = [];
  const extra = [];
  if (!row.result.success) expected = [{ command: '/储物袋', text: '无法据此判断物品数量或是否丢失' }];
  else if (tool && !bag.activeType) expected = [{ command: '/我的职业', text: '当前没有可显示的工具类型' }];
  else if (book && /\s+操作(?:\s|$)/.test(row.text)) {
    if (!bag.capabilities.length) { expected = [{ command: '/我的功法', text: '背包只展示当前筛选下可见的存储实例' }]; extra.push('当前没有可用批量入口'); }
  } else if (bag.total === 0 || bag.items.some(item => tool ? !item.capabilities.includes('replace') : book ? !item.capabilities.some(cap => cap.kind === 'learn') : !item.canRefine)) {
    expected = tool ? [{ command: '/我的职业', text: '背包这里只展示当前分类未启用、未上架的工具' }]
      : book ? [{ command: '/我的功法', text: '背包只展示当前筛选下可见的存储实例' }]
      : [{ command: '/我的本命物', text: '背包只展示未炼化且未上架的实例' }, { command: '/我的上架', text: '上架中的实例不在此背包显示' }];
    if (bag.total > 0) for (const item of bag.items) {
      if (tool && !item.capabilities.includes('replace')) extra.push('当前未提供替换入口，请核对工具详情与职业状态');
      if (book && !item.capabilities.some(cap => cap.kind === 'learn')) extra.push('当前未提供学习入口，请核对实例详情与保护状态');
      if (!tool && !book && !item.canRefine) extra.push('当前未提供炼化入口，请核对实例详情与当前本命物');
    }
  } else if (!bag.items.length) {
    expected = [{ command: `/储物袋 ${category}`, text: '本页为空不等于全部用完' }];
    extra.push(tool ? `本页暂无天工工具，当前分类共 ${bag.total} 件` : book ? `本页暂无功法，当前分类共 ${bag.total} 本` : `本页暂无本命物，当前背包共 ${bag.total} 件`);
  }
  const copy = withoutExpectedAdvice(messages, expected);
  for (const text of new Set(extra)) {
    let removed = 0;
    for (const nodes of copy) for (const node of nodes) if (node.type === 'Markdown') {
      for (let index = node.value.length - 1; index >= 0; index--) {
        const child = node.value[index];
        if (child.type === 'MD.text' && child.value === text) {
          const count = text === '当前未提供学习入口，请核对实例详情与保护状态' ? 2 : 1;
          if (count === 2) assert.equal(node.value[index + 1].type, 'MD.newline');
          node.value.splice(index, count); removed++;
        }
      }
    }
    assert.equal(removed, extra.filter(value => value === text).length, 'expected explanation: ' + text);
  }
  return copy;
}
