export function formationAdvice(operation, text) {
 if(operation==='cave-formations.list')return [{command:'/灵田',text:'空列表不证明阵盘丢失'},{command:'/储物袋 道具 其它 洞府阵法',text:'背包阵盘与已生效阵法分别核对'}];
 if(operation==='cave-formations.activate'&&/用法：|关键词不能为空|未找到可激活|不是可激活|不是有效的洞府阵盘/.test(text))return [{command:'/储物袋 道具 其它 洞府阵法',text:'不代选默认阵盘'},{command:'/洞府阵法',text:'同类操作可能影响该类别当前阵法'}];
 if(/你当前没有【/.test(text))return [{command:'/储物袋 道具 其它 洞府阵法',text:'持续时间不与旧阵叠加'},{command:'/商店 万宝楼',text:'不保证有货或自动补充'}];
 if(/用法：|关键词不能为空|未找到可移除|没有生效中的/.test(text))return [{command:'/洞府阵法',text:'移除不会返还已用阵盘'}];
 return [{command:'/洞府阵法',text:'结果未知不证明未消耗或未生效'},{command:'/储物袋 道具 其它 洞府阵法',text:'服务或配置异常不靠继续购买解决'}];
}
