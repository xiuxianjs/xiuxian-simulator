import { caveSnapshotAdvice } from './cave-snapshot-recovery-delta.mjs';
const stock = reason => reason==='小绿瓶不足'?[{command:'/我的信息',text:'小绿瓶是个人资源'},{command:'/灵田',text:'补充资源不能绕过本轮上限'}]:[{command:'/灵田',text:'批量操作先确认总消耗'},{command:'/储物袋',text:'购买前查看具体来源及是否有货'}];
export function accelerationAdvice(message,args){
 const partial=/（(.+)，实际消耗 \d+ 次）$/.exec(message);
 if(partial){const reason=partial[1],tips=[];
  if(reason.includes('已达加速次数上限'))tips.push({command:'/灵田',text:'普通加速已到本轮上限'});
  for(const stockReason of ['灵肥不足','小绿瓶不足'])if(reason.includes(stockReason))tips.push(...stock(stockReason));
  if(reason.includes('作物即将成熟'))tips.push({command:'/灵田',text:'不为凑满原请求继续购买或重复加速'});
  return tips.length?tips:caveSnapshotAdvice();
 }
 if(/^当前没有可加速/.test(message))return [{command:'/灵田',text:'无需再购买加速物资'}];
 if(/^该灵植数据异常/.test(message))return caveSnapshotAdvice();
 if(/^该灵种本轮最多可使用|^本轮普通加速次数已用完/.test(message))return [{command:'/灵田',text:'其他方式能否使用以当前预览能力为准'}];
 if(/^灵肥不足/.test(message))return stock('灵肥不足');
 if(/^小绿瓶不足/.test(message))return stock('小绿瓶不足');
 if(/^灵石不足/.test(message))return [{command:'/我的信息',text:'减少数量不能绕过'}];
 if(/^冻结阵法生效中/.test(message))return [{command:'/洞府阵法',text:'不自动移除阵法'}];
 if(/^该地块24小时内已使用立即催熟/.test(message))return [{command:'/灵田',text:'等待冷却恢复'}];
 if(/^请选择使用【/.test(message))return [{command:'/灵田',text:'先查看该地块预览'}];
 if(Number(args.count)>1&&['spiritStone','ripen'].includes(args.accelerator)&&/^第\d+块灵田(?:缩短\d+分钟|已成熟，可前往收获)/.test(message))return [{command:'/灵田',text:'不能把请求次数当作全部已完成'}];
 return [];
}
export function accelerationCommandAdvice(row){
 const result=row.result.data?.result;if(!result||row.op!=='cave.accelerate')return [];
 const tips=[...(!result.overview||result.snapshotError?caveSnapshotAdvice():[]),...accelerationAdvice(result.message,row.args)];
 return tips.filter((tip,index)=>tips.findIndex(other=>other.command===tip.command&&other.text===tip.text)===index);
}
