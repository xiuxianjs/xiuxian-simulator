export function caveQueryAdvice(text) {
 if(/炼气九层及以上方可/.test(text))return [{command:'/我的信息',text:'核对当前境界、修为和精力'},{command:'/查看主线',text:'挑战主线获取修为'},{command:'/我的境界',text:'满足条件后再突破'},{command:'/闭关',text:'闭关积累真气与修为'}];
 if(/尚未开始灵药师指引|灵药师尚未入门/.test(text))return [...(/尚未开始灵药师指引/.test(text)?[{command:'/加入灵药师',text:'查看服务器当前步骤'}]:[]),{command:'/我的职业',text:'职业进度与人物境界分别核对'}];
 if(/请输入目标UID|未找到目标道友/.test(text))return [{command:'/我的好友',text:'不使用示例编号'}];
 return [{command:'/我的信息',text:'读取失败不证明灵田、库存或职业进度已清空'},{command:'/我的职业',text:'不将配置或服务异常归因于材料不足'}];
}
export const emptyCaveLogAdvice = [{command:'/灵田',text:'当前页未返回记录不证明之前操作未发生'}];
export const restrictedCaveAdvice = [{command:'/我的好友',text:'隐息导致灵气不可见也不等于零产出'},{command:'/灵田',text:'不把目标的可见范围当成本人的境界'}];
export const emptyNearbyAdvice = [{command:'/我的好友',text:'附近为空仅表示本次列表未返回目标'}];
