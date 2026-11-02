//#region src/response/retiredFeatures.ts
/** 过滤机器人展示中的已下架功能。 */
const retiredGift = /回归礼包|测试礼包|凡人修仙礼包码|回归兑换码|测试兑换码|老玩家签发回归码/;
const retiredOther = /黑盒|拍卖会|宗门大比|挑战宗门|可挑战宗门列表|查看晋级赛队伍|查看押注记录|小店|逛店|命名店铺|店铺简介|玩家店铺|赞助|活动(?:商城|商店|购买|充值)|海外仙岛|海岛|(?:限时活动\s*|任务|特惠)商店|限时活动\s+(?:商店|任务|特惠)/;
const retiredAppearance = /主题|墨色模式/;
const mentionsRetiredFeature = (text) => retiredGift.test(text) || retiredOther.test(text) || retiredAppearance.test(text);
const activeFeatureText = (text) => text.replaceAll("活动充值相关信息", "充值相关信息").split("\n").filter((line) => !mentionsRetiredFeature(line)).join("\n");
const retiredCommands = /* @__PURE__ */ new Set([
	"黑盒拍卖",
	"黑盒排期",
	"黑盒记录",
	"黑盒详情",
	"黑盒出价",
	"黑盒入场",
	"黑盒提醒",
	"黑盒预约",
	"黑盒确认",
	"黑盒取消",
	"黑盒鉴宝",
	"确认黑盒出价",
	"黑盒撤标",
	"宗门大比",
	"宗门大比报名",
	"宗门大比战斗记录",
	"宗门大比战斗详情",
	"可挑战宗门列表",
	"查看晋级赛队伍",
	"查看押注记录",
	"添加宗门大比成员",
	"移除宗门大比成员",
	"调整宗门大比位置",
	"清空宗门大比队伍",
	"押注宗门大比",
	"追投宗门大比",
	"领取宗门大比奖励",
	"挑战宗门",
	"小店",
	"小店排行",
	"我的小店",
	"逛店",
	"命名店铺",
	"店铺简介",
	"我的主题",
	"切换主题",
	"关闭主题",
	"切换墨色模式",
	"领取回归礼包",
	"领取测试礼包",
	"凡人修仙礼包码",
	"赞助",
	"赞助购买",
	"活动商城",
	"活动商店",
	"活动购买",
	"活动充值",
	"活动充值购买",
	"活动充值领取",
	"海岛",
	"海外仙岛",
	"限时活动 商店",
	"限时活动 任务",
	"限时活动 特惠"
]);
function isRetiredCommand(text) {
	const command = text.trim().replace(/^[!！/#＃]\s*/u, "").trim().replace(/\s+/gu, " ");
	return [...retiredCommands].some((name) => command === name || command.startsWith(name + " "));
}

//#endregion
export { activeFeatureText, isRetiredCommand, mentionsRetiredFeature };