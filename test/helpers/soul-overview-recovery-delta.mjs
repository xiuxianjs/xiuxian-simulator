export function soulOverviewBlockedAdvice(row) {
 const data=row.result.data;if(!row.result.success||data.mode==='empty')return [];
 const overview=data.overview;const artifact=data.mode==='detail'?overview.items[0]:data.mode==='equipped'?overview.items.find(item=>item.instanceId===overview.equippedInstanceId):null;
 const labels={refine:'炼化',gradeUpgrade:'升品',upgradeLevel:'升级',wash:'洗涤',unequip:'分离',lock:'锁定',unlock:'解锁',soulPath:'元婴道途'};
 const caps=[...(artifact?.capabilities??[]),...(data.mode==='detail'?[]:overview.capabilities)];
 const tips=caps.filter(cap=>!cap.available).map(cap=>{
  const expectations={realmTooLow:['/查看主线','推进主线积累修为'],realmStageTooLow:['/查看主线','推进主线积累修为'],listed:['/我的上架','目标正在上架'],alreadyUpgraded:['/储物袋 本命','此实例已升品'],maxGrade:['/储物袋 本命','已达当前品级上限'],maxLevel:['/我的境界','未开放更多可升等级'],materialsInsufficient:['/储物袋 本命','未装备未锁定且排除目标自身'],itemsInsufficient:['/储物袋 材料 其它',cap.kind==='wash'?'洗涤石':'筑灵石'],pendingConfirmation:['/本命物信息','放弃不返还已用洗涤石'],serviceUnavailable:['/本命物信息','补充材料不能解决服务未配置']};
  const [command,text]=expectations[cap.reasonCode]??['/本命物信息','不把未知原因当作缺材料或境界不足'];return {command,text,label:labels[cap.kind],reason:cap.reasonCode};
 });
 return tips.filter((tip,index)=>tips.findIndex(other=>other.label===tip.label&&other.reason===tip.reason&&other.command===tip.command)===index);
}
