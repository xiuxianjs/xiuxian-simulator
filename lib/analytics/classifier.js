//#region src/analytics/classifier.ts
/**
* 分类规则表，按优先级从高到低排列
* 每条规则包含一个正则表达式和对应的功能名称/分类
*/
const classificationRules = [
	{
		pattern: /^(!|！|\/|#|＃)?登仙台签到/,
		feature_name: "登仙台签到",
		feature_category: "日常系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?日常签到/,
		feature_name: "日常签到",
		feature_category: "日常系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?新人签到/,
		feature_name: "新人签到",
		feature_category: "日常系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(初入仙途|新人狂欢)签到/,
		feature_name: "初入仙途签到",
		feature_category: "日常系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(初入仙途|新人狂欢)/,
		feature_name: "初入仙途",
		feature_category: "日常系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?新人任务领取/,
		feature_name: "新人任务领取",
		feature_category: "日常系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?新人任务/,
		feature_name: "新人任务",
		feature_category: "日常系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?商店\s+签到/,
		feature_name: "签到商店",
		feature_category: "经济系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?活动签到/,
		feature_name: "活动签到",
		feature_category: "日常系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?签到/,
		feature_name: "签到",
		feature_category: "日常系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(领取全部|一键领取)日常活跃奖励/,
		feature_name: "领取全部日常活跃奖励",
		feature_category: "日常系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?领取日常活跃奖励/,
		feature_name: "领取日常活跃奖励",
		feature_category: "日常系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(领取全部|一键领取)周常活跃奖励/,
		feature_name: "领取全部周常活跃奖励",
		feature_category: "日常系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?领取周常活跃奖励/,
		feature_name: "领取周常活跃奖励",
		feature_category: "日常系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?日常活跃/,
		feature_name: "日常活跃",
		feature_category: "日常系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?周常活跃/,
		feature_name: "周常活跃",
		feature_category: "日常系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?成就\s+战力\s+领取/,
		feature_name: "领取战力成就",
		feature_category: "日常系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?成就\s+战力/,
		feature_name: "战力成就",
		feature_category: "日常系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(我的)?成就$/,
		feature_name: "成就",
		feature_category: "日常系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?我的邮件/,
		feature_name: "我的邮件",
		feature_category: "日常系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?查看邮件/,
		feature_name: "查看邮件",
		feature_category: "日常系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?领取邮件/,
		feature_name: "领取邮件",
		feature_category: "日常系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?删除邮件/,
		feature_name: "删除邮件",
		feature_category: "日常系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(收取邮件|一键读取)/,
		feature_name: "收取邮件",
		feature_category: "日常系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?查看反馈/,
		feature_name: "查看反馈",
		feature_category: "日常系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?我的反馈/,
		feature_name: "我的反馈",
		feature_category: "日常系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?反馈/,
		feature_name: "反馈",
		feature_category: "日常系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(兑换码|礼包码|礼品码)/,
		feature_name: "兑换码",
		feature_category: "日常系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?领取回归礼包/,
		feature_name: "领取回归礼包",
		feature_category: "日常系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?领取测试礼包/,
		feature_name: "领取测试礼包",
		feature_category: "日常系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?回归奖励/,
		feature_name: "回归奖励",
		feature_category: "日常系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?领取回归奖励/,
		feature_name: "领取回归奖励",
		feature_category: "日常系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?回归签到/,
		feature_name: "回归签到",
		feature_category: "日常系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?凡人修仙礼包码/,
		feature_name: "凡人修仙礼包码",
		feature_category: "日常系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?打坐结束/,
		feature_name: "打坐结束",
		feature_category: "修炼系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?打坐/,
		feature_name: "打坐",
		feature_category: "修炼系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?经络/,
		feature_name: "经络",
		feature_category: "修炼系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?出关/,
		feature_name: "出关",
		feature_category: "修炼系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?闭关/,
		feature_name: "闭关",
		feature_category: "修炼系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?冲脉/,
		feature_name: "冲脉",
		feature_category: "修炼系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?突破/,
		feature_name: "突破",
		feature_category: "修炼系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?晋级/,
		feature_name: "晋级",
		feature_category: "修炼系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?悟道/,
		feature_name: "悟道",
		feature_category: "修炼系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?创建宗门/,
		feature_name: "创建宗门",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?解散宗门/,
		feature_name: "解散宗门",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?加入宗门/,
		feature_name: "加入宗门",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?取消宗门申请/,
		feature_name: "取消宗门申请",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?我的申请/,
		feature_name: "我的宗门申请",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?退出宗门/,
		feature_name: "退出宗门",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?我的宗门/,
		feature_name: "我的宗门",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?宗门签到/,
		feature_name: "宗门签到",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?宗门(日常|任务)/,
		feature_name: "宗门日常",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?领取宗门俸禄/,
		feature_name: "领取宗门俸禄",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(领取|领取全部|一键领取)宗门(日|周)活奖励/,
		feature_name: "领取宗门活跃奖励",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?宗门红包/,
		feature_name: "宗门红包",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?发红包/,
		feature_name: "发红包",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?领红包/,
		feature_name: "领红包",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?我发的红包/,
		feature_name: "我发的红包",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?回收红包/,
		feature_name: "回收红包",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?宗门审核同意/,
		feature_name: "宗门审核同意",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?宗门审核拒绝/,
		feature_name: "宗门审核拒绝",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?宗门审核/,
		feature_name: "宗门审核",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?设置身份为/,
		feature_name: "设置宗门身份",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?卸任/,
		feature_name: "卸任",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?弹劾宗主/,
		feature_name: "弹劾宗主",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?宗主请假/,
		feature_name: "宗主请假",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?宗主转让/,
		feature_name: "宗主转让",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?设置宗门简介/,
		feature_name: "设置宗门简介",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?设置宗门公告/,
		feature_name: "设置宗门公告",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?宗门简介$/,
		feature_name: "宗门简介",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?宗门公告/,
		feature_name: "宗门公告",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?添加精华/,
		feature_name: "添加精华",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?移除精华/,
		feature_name: "移除精华",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?宗门精华/,
		feature_name: "宗门精华",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?宗门日志/,
		feature_name: "宗门日志",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?设置申请宗门最低境界/,
		feature_name: "设置宗门最低境界",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?提升宗门等级/,
		feature_name: "提升宗门等级",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?提升宗门灵脉/,
		feature_name: "提升宗门灵脉",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?提升宗门商店/,
		feature_name: "提升宗门商店",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?宗门商店\s+刷新/,
		feature_name: "宗门刷新商店",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?宗门商店兑换/,
		feature_name: "宗门商店兑换",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?宗门商店/,
		feature_name: "宗门商店",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?宗门列表/,
		feature_name: "宗门列表",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?宗门成员列表/,
		feature_name: "宗门成员列表",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?踢出成员/,
		feature_name: "踢出成员",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(宗门挖矿|宗门采矿)/,
		feature_name: "宗门采矿",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?祭祀祖师/,
		feature_name: "祭祀祖师",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?宗门周常/,
		feature_name: "宗门周常",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?宗门主线挑战/,
		feature_name: "宗门主线挑战",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?宗门主线记录/,
		feature_name: "宗门主线记录",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?领取宗门主线奖励/,
		feature_name: "领取宗门主线奖励",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?宗门主线/,
		feature_name: "宗门主线",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?宗门采矿/,
		feature_name: "宗门采矿",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?宗门大比报名/,
		feature_name: "宗门大比报名",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?添加宗门大比成员/,
		feature_name: "添加宗门大比成员",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?移除宗门大比成员/,
		feature_name: "移除宗门大比成员",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?调整宗门大比位置/,
		feature_name: "调整宗门大比位置",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?清空宗门大比队伍/,
		feature_name: "清空宗门大比队伍",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?可挑战宗门列表/,
		feature_name: "可挑战宗门列表",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?查看晋级赛队伍/,
		feature_name: "查看晋级赛队伍",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?押注宗门大比/,
		feature_name: "押注宗门大比",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?追投宗门大比/,
		feature_name: "追投宗门大比",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?查看押注记录/,
		feature_name: "查看押注记录",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?领取宗门大比奖励/,
		feature_name: "领取宗门大比奖励",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?宗门大比战斗详情/,
		feature_name: "宗门大比战斗详情",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?宗门大比战斗记录/,
		feature_name: "宗门大比战斗记录",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?挑战宗门/,
		feature_name: "挑战宗门",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?宗门大比/,
		feature_name: "宗门大比",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(?:灵脉攻防战|秘境攻防)挑战/,
		feature_name: "灵脉攻防战挑战",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(?:灵脉攻防战|秘境攻防)列表/,
		feature_name: "灵脉攻防战列表",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(?:灵脉攻防战|秘境攻防)查看/,
		feature_name: "灵脉攻防战查看",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(?:灵脉攻防战|秘境攻防)领取奖励/,
		feature_name: "灵脉攻防战领取奖励",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(灵脉攻防战|秘境攻防|秘境争霸)/,
		feature_name: "灵脉攻防战",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?宗门/,
		feature_name: "宗门信息",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?结交/,
		feature_name: "结交好友",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?我的好友/,
		feature_name: "我的好友",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?删除好友/,
		feature_name: "删除好友",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?好友申请/,
		feature_name: "好友申请",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?同意结交/,
		feature_name: "同意结交",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?拒绝结交/,
		feature_name: "拒绝结交",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?取消拉黑/,
		feature_name: "取消拉黑",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?拉黑/,
		feature_name: "拉黑",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?黑名单/,
		feature_name: "黑名单",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?发飞信/,
		feature_name: "好友飞信",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?发师门飞信/,
		feature_name: "师门飞信",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?发宗门飞信/,
		feature_name: "宗门飞信",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?发队伍飞信/,
		feature_name: "队伍飞信",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?发道侣飞信/,
		feature_name: "道侣飞信",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?飞信禁言/,
		feature_name: "飞信禁言",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?飞信解除/,
		feature_name: "飞信解除",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?飞信(?:\s+(师门|宗门|道侣|队伍))?/,
		feature_name: "飞信",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?好友设置/,
		feature_name: "好友设置",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?结为道侣/,
		feature_name: "结为道侣",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?同意道侣/,
		feature_name: "同意道侣",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?拒绝道侣/,
		feature_name: "拒绝道侣",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?解除道侣/,
		feature_name: "解除道侣",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?升级誓约/,
		feature_name: "升级誓约",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?道侣任务/,
		feature_name: "道侣任务",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(我的道侣|道侣)$/,
		feature_name: "我的道侣",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?赠送/,
		feature_name: "赠送礼物",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?双修/,
		feature_name: "双修",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?拜师/,
		feature_name: "拜师",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?同意拜师/,
		feature_name: "同意拜师",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?申请出师/,
		feature_name: "申请出师",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?同意出师/,
		feature_name: "同意出师",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?叛离师门/,
		feature_name: "叛离师门",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?逐出师门/,
		feature_name: "逐出师门",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?传功/,
		feature_name: "传功",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?一键传功/,
		feature_name: "一键传功",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?一键赐福/,
		feature_name: "一键赐福",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?一键赐丹/,
		feature_name: "一键赐丹",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?一键打理灵田/,
		feature_name: "一键打理灵田",
		feature_category: "洞府系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?一键照料道侣灵田/,
		feature_name: "一键照料道侣灵田",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?赐福/,
		feature_name: "赐福",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?赐丹/,
		feature_name: "赐丹",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?领取师门称号/,
		feature_name: "领取师门称号",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(我的师门|师门)$/,
		feature_name: "我的师门",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?师谱$/,
		feature_name: "师谱",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?圣人(?:排行榜|榜)?$/,
		feature_name: "圣人榜",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?创建队伍/,
		feature_name: "创建队伍",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?解散队伍/,
		feature_name: "解散队伍",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?加入队伍/,
		feature_name: "加入队伍",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(离开|退出)队伍/,
		feature_name: "离开队伍",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?我的队伍申请/,
		feature_name: "我的队伍申请",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?我的队伍邀请/,
		feature_name: "我的队伍邀请",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?取消队伍申请/,
		feature_name: "取消队伍申请",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?取消队伍邀请/,
		feature_name: "取消队伍邀请",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?转让队长/,
		feature_name: "转让队长",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?邀请入队/,
		feature_name: "邀请入队",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?队伍位置设置/,
		feature_name: "队伍位置设置",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?队伍同意/,
		feature_name: "队伍同意",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?队伍拒绝/,
		feature_name: "队伍拒绝",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?队伍邀请同意/,
		feature_name: "队伍邀请同意",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?队伍邀请拒绝/,
		feature_name: "队伍邀请拒绝",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?队伍踢出/,
		feature_name: "队伍踢出",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?设置队伍境界门槛/,
		feature_name: "设置队伍门槛",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?队伍列表/,
		feature_name: "队伍列表",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(处理)?队伍申请/,
		feature_name: "队伍申请",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(队伍信息|我的队伍)/,
		feature_name: "队伍信息",
		feature_category: "社交系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?探索秘境(?:\s|$)/,
		feature_name: "探索秘境",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(返程|结束探索)(?:\s|$)/,
		feature_name: "返程",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(三连)?打劫/,
		feature_name: "打劫",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?回击/,
		feature_name: "回击",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?打劫记录/,
		feature_name: "打劫记录",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?仇人$/,
		feature_name: "仇人",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?悬赏榜/,
		feature_name: "悬赏榜",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?悬赏/,
		feature_name: "悬赏",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?接赏/,
		feature_name: "接赏",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?领赏/,
		feature_name: "领赏",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?挑战凶兽/,
		feature_name: "挑战凶兽",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?领取凶兽奖励/,
		feature_name: "领取凶兽奖励",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?秘境挑战/,
		feature_name: "秘境挑战",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?扫荡秘境/,
		feature_name: "扫荡秘境",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(查看秘境|秘境列表)/,
		feature_name: "秘境列表",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?秘境详情/,
		feature_name: "秘境详情",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?秘境/,
		feature_name: "秘境信息",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?主线挑战/,
		feature_name: "主线挑战",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?主线扫荡/,
		feature_name: "主线扫荡",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?主线达成奖励/,
		feature_name: "主线达成奖励",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?领取宝箱/,
		feature_name: "领取宝箱",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?成就\s+主线/,
		feature_name: "主线成就",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?主线排行榜/,
		feature_name: "主线排行榜",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(查看主线|副本列表|主线列表)/,
		feature_name: "主线信息",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?主线/,
		feature_name: "主线信息",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?妖塔挑战/,
		feature_name: "妖塔挑战",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?妖塔选buff/i,
		feature_name: "妖塔选buff",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?妖塔扫荡/,
		feature_name: "妖塔扫荡",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?妖塔重置/,
		feature_name: "妖塔重置",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?妖塔/,
		feature_name: "妖塔信息",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?挑战排名/,
		feature_name: "挑战排名",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(一键挑战|连续爬塔)/,
		feature_name: "一键挑战",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?扫荡排名/,
		feature_name: "扫荡排名",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?比试/,
		feature_name: "比试",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?查看战斗过程/,
		feature_name: "查看战斗过程",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?首通排名奖励/,
		feature_name: "首通排名奖励",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?月度排名奖励/,
		feature_name: "月度排名奖励",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?领取首通奖励/,
		feature_name: "领取首通奖励",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?领取月度奖励/,
		feature_name: "领取月度奖励",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?凶兽排行$/,
		feature_name: "凶兽排行",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?凶兽奖励$/,
		feature_name: "凶兽奖励",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?凶兽$/,
		feature_name: "凶兽信息",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?杀神榜$/,
		feature_name: "杀神榜",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?领取杀神称号$/,
		feature_name: "领取杀神称号",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?购买\s+\d+/,
		feature_name: "商店购买",
		feature_category: "经济系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?商店\s+神奇/,
		feature_name: "神奇商店",
		feature_category: "经济系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?商店\s+声望/,
		feature_name: "声望商店",
		feature_category: "经济系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?商店\s+积分/,
		feature_name: "积分商店",
		feature_category: "经济系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?商店\s+道侣/,
		feature_name: "道侣商店",
		feature_category: "经济系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?商店\s+万宝楼/,
		feature_name: "万宝楼",
		feature_category: "经济系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?商店$/,
		feature_name: "商店",
		feature_category: "经济系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(交易所|珍宝楼)\s*搜索/,
		feature_name: "交易搜索",
		feature_category: "经济系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?交易上架/,
		feature_name: "交易上架",
		feature_category: "经济系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?交易下架/,
		feature_name: "交易下架",
		feature_category: "经济系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?选购/,
		feature_name: "选购",
		feature_category: "经济系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?逛店/,
		feature_name: "逛店",
		feature_category: "经济系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?我的上架/,
		feature_name: "我的上架",
		feature_category: "经济系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?我的记录/,
		feature_name: "我的交易记录",
		feature_category: "经济系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?我的交易记录/,
		feature_name: "我的交易记录",
		feature_category: "经济系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(交易所|珍宝楼|出售)/,
		feature_name: "交易所",
		feature_category: "经济系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(我的小店|小店)/,
		feature_name: "小店",
		feature_category: "经济系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?命名店铺/,
		feature_name: "命名店铺",
		feature_category: "经济系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?店铺简介/,
		feature_name: "店铺简介",
		feature_category: "经济系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(我的)?(储物袋|背包)/,
		feature_name: "背包",
		feature_category: "经济系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?锁定/,
		feature_name: "锁定物品",
		feature_category: "经济系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?解锁/,
		feature_name: "解锁物品",
		feature_category: "经济系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?物品详情/,
		feature_name: "物品详情",
		feature_category: "经济系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?确认培元丹/,
		feature_name: "确认培元丹",
		feature_category: "经济系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?取消培元丹/,
		feature_name: "取消培元丹",
		feature_category: "经济系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?小绿瓶存储/,
		feature_name: "小绿瓶存储",
		feature_category: "经济系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?开启礼盒/,
		feature_name: "开启礼盒",
		feature_category: "经济系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?活动道具$/,
		feature_name: "活动道具",
		feature_category: "经济系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?一键装备/,
		feature_name: "一键装备",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?我的装备/,
		feature_name: "我的装备",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?我的(武器|饰品|法袍|鞋子|羽翼)/,
		feature_name: "装备详情",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?分解装备/,
		feature_name: "分解装备",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?一键分解装备/,
		feature_name: "一键分解装备",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?我的职业/,
		feature_name: "我的职业",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?替换/,
		feature_name: "替换装备",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?分离/,
		feature_name: "分离本命物",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?本命物升级/,
		feature_name: "本命物升级",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?本命物升品/,
		feature_name: "本命物升品",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?确认本命物洗涤/,
		feature_name: "确认本命物洗涤",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?取消本命物洗涤/,
		feature_name: "取消本命物洗涤",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?本命物洗涤/,
		feature_name: "本命物洗涤",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?本命物/,
		feature_name: "本命物信息",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?卸下/,
		feature_name: "卸下装备",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?装备/,
		feature_name: "装备",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?一键学习功法/,
		feature_name: "一键学习功法",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?一键分解功法/,
		feature_name: "一键分解功法",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?学习功法/,
		feature_name: "学习功法",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?升级功法/,
		feature_name: "升级功法",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?分解功法/,
		feature_name: "分解功法",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?查看功法/,
		feature_name: "查看功法",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?切换战技/,
		feature_name: "切换战技",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?切换被动技/,
		feature_name: "切换被动技",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?切换神通/,
		feature_name: "切换神通",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?换下战技/,
		feature_name: "换下战技",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?换下被动技/,
		feature_name: "换下被动技",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?换下神通/,
		feature_name: "换下神通",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?功法/,
		feature_name: "功法信息",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(加入炼丹师|成为炼丹师|继续炼丹指引)/,
		feature_name: "加入炼丹师",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(炼丹师进阶|炼丹进阶)/,
		feature_name: "炼丹进阶",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?我的职业$/,
		feature_name: "我的职业",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?丹方详情/,
		feature_name: "丹方详情",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(丹方|查看丹方|丹方列表)/,
		feature_name: "丹方",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(我的)?(灵田|洞府)/,
		feature_name: "灵田洞府",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?查看灵田/,
		feature_name: "查看灵田",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?开垦/,
		feature_name: "开垦",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?播种/,
		feature_name: "播种",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?协作灵田/,
		feature_name: "协作灵田",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?偷药/,
		feature_name: "偷药",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(一键)?(浇灌|除虫|除草|收割|灵田加速|升级灵田)/,
		feature_name: "灵田操作",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(洞府阵法|我的阵法)/,
		feature_name: "洞府阵法",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?激活阵盘/,
		feature_name: "激活阵盘",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?移除阵法/,
		feature_name: "移除阵法",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?一键炼丹/,
		feature_name: "一键炼丹",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?炼制/,
		feature_name: "炼制",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?融臣结束/,
		feature_name: "融臣结束",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?融臣/,
		feature_name: "融臣",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?凝丹/,
		feature_name: "凝丹",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?换词/,
		feature_name: "换词",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?确认换词/,
		feature_name: "确认换词",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?取消换词/,
		feature_name: "取消换词",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?炼丹/,
		feature_name: "炼丹信息",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?我的功法/,
		feature_name: "我的功法",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(改名|改性|改签名)/,
		feature_name: "修改信息",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?我的权益/,
		feature_name: "我的权益",
		feature_category: "充值系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?我的特权/,
		feature_name: "我的特权",
		feature_category: "充值系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?一键领取宝箱$/,
		feature_name: "一键领取宝箱",
		feature_category: "战斗系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(月卡领取|月卡签到|一键领取|一键领取月卡)$/,
		feature_name: "月卡领取",
		feature_category: "充值系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?月卡/,
		feature_name: "月卡",
		feature_category: "充值系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?新人返利领取/,
		feature_name: "新人返利",
		feature_category: "充值系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?周周返利领取/,
		feature_name: "周周返利领取",
		feature_category: "充值系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?充值/,
		feature_name: "充值",
		feature_category: "充值系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(里程碑|世界里程碑)/,
		feature_name: "里程碑",
		feature_category: "充值系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?我的活动/,
		feature_name: "活动",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?新人返利$/,
		feature_name: "新人返利",
		feature_category: "充值系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?周周返利$/,
		feature_name: "周周返利",
		feature_category: "充值系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?活动任务领取/,
		feature_name: "活动任务领取",
		feature_category: "日常系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?活动任务$/,
		feature_name: "活动任务",
		feature_category: "日常系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(限时活动|查看特殊活动)$/,
		feature_name: "限时活动",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?学习丹方/,
		feature_name: "学习丹方",
		feature_category: "成长系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(消耗|服用|炼化)/,
		feature_name: "消耗",
		feature_category: "经济系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(修仙)?(帮助|help|menu|菜单)/,
		feature_name: "帮助",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(我|我的|个人)(信息|资料|编号|控制台)?$/,
		feature_name: "我的信息",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?查看信息/,
		feature_name: "查看他人",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?更多/,
		feature_name: "更多",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?折叠/,
		feature_name: "折叠",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(更新属性|属性面板|我的面板)/,
		feature_name: "属性面板",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?属性/,
		feature_name: "属性",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?命格/,
		feature_name: "命格",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?我的境界/,
		feature_name: "我的境界",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?境界/,
		feature_name: "境界信息",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?图鉴详情/,
		feature_name: "图鉴详情",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?天师宝录$/,
		feature_name: "天师宝录",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?图鉴/,
		feature_name: "图鉴",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?区战力排行榜/,
		feature_name: "区战力排行榜",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?战力排行榜/,
		feature_name: "战力排行榜",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?妖塔排行榜/,
		feature_name: "妖塔排行榜",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?区境界排行榜/,
		feature_name: "区境界排行榜",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?境界排行榜/,
		feature_name: "境界排行榜",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?人气排行榜/,
		feature_name: "人气排行榜",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?排行榜/,
		feature_name: "排行榜",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?通天塔/,
		feature_name: "通天塔",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?查看问题/,
		feature_name: "查看问题",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?配置秘境模式/,
		feature_name: "配置秘境模式",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?配置组队精力/,
		feature_name: "配置组队精力",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?配置好友自动审批进队/,
		feature_name: "配置好友自动审批进队",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?配置接受队伍邀请/,
		feature_name: "配置接受队伍邀请",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?配置自动同意队伍邀请/,
		feature_name: "配置自动同意队伍邀请",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?配置信息隐藏/,
		feature_name: "配置信息隐藏",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?我的设置/,
		feature_name: "我的设置",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?设置密码/,
		feature_name: "设置密码",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?绑定邮箱/,
		feature_name: "绑定邮箱",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?更换账号/,
		feature_name: "更换账号",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?更换邮箱/,
		feature_name: "更换邮箱",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?验证\s+\d{6}$/,
		feature_name: "邮箱验证",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?安全中心/,
		feature_name: "安全中心",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?攻略/,
		feature_name: "攻略",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?词典分类/,
		feature_name: "词典分类",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?申请词典编辑权限/,
		feature_name: "申请词典编辑权限",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?录入词典/,
		feature_name: "录入词典",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?删除词典/,
		feature_name: "删除词典",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?词典/,
		feature_name: "词典",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?天书$/,
		feature_name: "天书",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?我的称号$/,
		feature_name: "我的称号",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?佩戴称号/,
		feature_name: "佩戴称号",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?卸下称号$/,
		feature_name: "卸下称号",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?我的主题$/,
		feature_name: "我的主题",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?切换主题/,
		feature_name: "切换主题",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?关闭主题$/,
		feature_name: "关闭主题",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?切换墨色模式/,
		feature_name: "切换墨色模式",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?我的回忆$/,
		feature_name: "我的回忆",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?我的故事$/,
		feature_name: "我的故事",
		feature_category: "信息系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?绑定邀请码/,
		feature_name: "绑定邀请码",
		feature_category: "邀请系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?领取邀请奖励/,
		feature_name: "领取邀请奖励",
		feature_category: "邀请系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?邀请(人数)?奖励/,
		feature_name: "邀请奖励信息",
		feature_category: "邀请系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?邀请VIP奖励/,
		feature_name: "邀请VIP奖励",
		feature_category: "邀请系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?邀请境界奖励/,
		feature_name: "邀请境界奖励",
		feature_category: "邀请系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?邀请码/,
		feature_name: "邀请码",
		feature_category: "邀请系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?邀请$/,
		feature_name: "邀请码",
		feature_category: "邀请系统"
	},
	{
		pattern: /^(!|！|\/|#|＃)?(踏入仙途|开始游戏|开始修仙|开始降临|降临世界)/,
		feature_name: "创建角色",
		feature_category: "角色创建"
	}
];
/**
* 根据用户输入的指令文本，返回对应的功能名称和分类
* 如果没有匹配到，返回 null（不记录埋点）
*/
function classifyFeature(commandText) {
	if (!commandText) return null;
	const text = commandText.trim();
	for (const rule of classificationRules) if (rule.pattern.test(text)) return {
		feature_name: rule.feature_name,
		feature_category: rule.feature_category
	};
	return null;
}

//#endregion
export { classifyFeature };