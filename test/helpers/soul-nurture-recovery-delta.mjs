import assert from 'node:assert/strict';
import { bubbleSemantics } from './bubble-semantics.mjs';
import { withoutExpectedAdvice, replaceExpectedText } from './recovery-delta.mjs';

export function soulActionAdvice(text) {
 if (/元婴期及以上方可/.test(text)) return [
  { text: '核对当前境界、修为和精力', command: '/我的信息' }, { text: '挑战主线获取修为', command: '/查看主线' },
  { text: '满足条件后再突破', command: '/我的境界' }, { text: '闭关积累真气与修为', command: '/闭关' }
 ];
 if (/组队匹配|匹配副本队伍/.test(text)) return [{ text: '不自动取消或离队', command: '/匹配状态' }, { text: '结束当前流程后再核对神魂操作条件', command: '/我的队伍' }];
 if (/请先选择.*道途/.test(text)) return [{ text: '不代选或跳过确认', command: '/元婴道途' }];
 if (/维护中/.test(text)) return [{ text: '维护期间不反复温养', command: '/元婴神魂' }];
 if (/次数.*用尽|基础次数已用尽/.test(text)) return [{ text: '不根据旧按钮推断额外次数', command: '/元婴神魂' }, { text: '不自动继续消耗', command: '/神魂材料来源' }];
 return [{ text: /稳定不足/.test(text) ? '定魂也会消耗材料和次数' : '失败不证明材料未消耗或设置未生效', command: '/元婴神魂' }, { text: '不立即发材料，也不追加当天领取次数', command: '/神魂材料来源' }];
}
const directions=['/神魂温养 定魂','/神魂温养 养魄','/神魂温养 悟道','/神魂温养 出窍'];
export function compareNurture(actual, expected, data, replyText) {
 const stopped=data&&data.dailyNurtureCount>=data.dailyNurtureLimit;
 const comparable=withoutExpectedAdvice(actual,!data?soulActionAdvice(replyText):stopped?soulActionAdvice('基础次数已用尽'):[]);
 if(data&&!stopped){assert.deepEqual(comparable,expected);return;}
 const before=bubbleSemantics(!data?replaceExpectedText(expected,'❌ '+replyText,replyText):expected),after=bubbleSemantics(comparable);
 for(const command of directions)assert.ok(before.commands.includes(command),command);
 before.commands=before.commands.filter(command=>!directions.includes(command)&&(!data?command!=='/元婴神魂':true));
 if(stopped)before.commands.push('/神魂材料来源');
 before.commands=[...new Set(before.commands)].sort();
 assert.ok(!after.commands.some(command=>directions.includes(command)));
 assert.deepEqual(after,before);
}

export function soulPreviewAdvice(text) {
 if (/元婴期及以上方可|组队匹配|匹配副本队伍|请先选择.*道途|维护中/.test(text)) return soulActionAdvice(text);
 if (/凭证|确认操作类型|确认操作缺少/.test(text)) return [{ text: '凭证失效不证明操作从未执行', command: '/元婴神魂' }, { text: '不会自动确认或取消旧凭证', command: '/元婴道途' }];
 if (/切换冷却/.test(text)) return [{ text: '以原提示的可切换时刻为准', command: '/元婴道途' }];
 if (/感悟不足|道途熟练不足/.test(text)) return [{ text: '不自动温养或重复突破', command: '/元婴神魂' }, { text: '不把人物境界或购买无关材料', command: '/神魂材料来源' }];
 if (/首发节点已全部圆融/.test(text)) return [{ text: '开放节点上限', command: '/元婴道途' }];
 if (/重选|保底感悟|最近一次温养/.test(text)) return [{ text: '重选可能变差且需收回旧额外材料', command: '/元婴神魂' }, { text: '不自动退还、补领或购买权益', command: '/神魂材料来源' }];
 return [{ text: '未知结果不证明未消耗或未生效', command: '/元婴道途' }, { text: '不自动温养、切换或重选', command: '/元婴神魂' }];
}

export function withoutSoulReceiptNote(messages, text) {
 const copy=structuredClone(messages);let removed=0;
 for(const nodes of copy)for(const node of nodes){
  if(node.type!=='Markdown')continue;
  const i=node.value.findIndex(child=>child.type==='MD.blockquote'&&child.value.length===1&&child.value[0].type==='MD.text'&&child.value[0].value===text);
  if(i<0)continue;
  assert.equal(node.value[i-1].type,'MD.newline');node.value.splice(i-1,2);removed++;
 }
 assert.equal(removed,1,'one explicit receipt note');return copy;
}
