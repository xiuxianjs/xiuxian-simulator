import assert from 'node:assert/strict';
import { withoutExpectedAdvice } from './recovery-delta.mjs';
export function withoutSoulWashRecovery(messages, text) {
  const tips = /金丹及以上方可洗涤|需达到.+后开放|境界不足/.test(text) ? []
    : /洗涤石不足/.test(text) ? [{command:'/储物袋',text:'持有数量'}, {command:'/珍宝楼',text:'不保证当前有货'}]
    : /请先炼化本命物/.test(text) ? [{command:'/储物袋 本命',text:'不自动炼化'}]
    : /仅支持单次/.test(text) ? [{command:'/本命物信息',text:'不附数量'}]
    : /洗涤结果待确认|所有可用词条已达洗涤上限|当前没有可(?:新增|替换|升级)的词条|没有待(?:确认|取消)的本命物洗涤结果|待确认的本命物已不存在|当前没有可洗涤的成长结果/.test(text) ? [{command:'/本命物信息',text:'核对'}]
    : [{command:'/本命物信息',text:'失败提示不证明'}, {command:'/储物袋',text:'取消不返还'}];
  return withoutExpectedAdvice(messages, tips);
}
export function removeExpectedWashNode(messages, kind) {
  const copy = structuredClone(messages);
  let count = 0;
  const visit = nodes => {
    if (!Array.isArray(nodes)) return;
    for (let index = nodes.length - 1; index >= 0; index--) {
      const node = nodes[index];
      if (kind === 'expiry' && node.type === 'MD.text' && node.value === '原预览有效期60秒，生成预览已消耗洗涤石') {
        assert.equal(nodes[index + 1].type, 'MD.newline'); nodes.splice(index, 2); count++;
      } else if (kind === 'restart' && node.type === 'MD.button' && node.options?.data === '/本命物洗涤') {
        assert.equal(nodes[index - 1].value, ' '); nodes.splice(index - 1, 2); count++; index--;
      } else if (Array.isArray(node.value)) visit(node.value);
    }
  };
  for (const nodes of copy) visit(nodes);
  assert.equal(count, 1, 'expected reviewed wash node '+kind);
  return copy;
}
