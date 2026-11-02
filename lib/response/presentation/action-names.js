//#region src/response/presentation/action-names.ts
/**
* 业务 operation 前缀 → 玩家可读动作名。
*
* 只用于错误气泡标题（`<动作> · 未完成`）；未登记前缀回退为「操作」，
* 不猜测业务含义。
*/
const ACTION_NAMES = {
	"skill-books": "功法",
	"soul-artifacts": "本命物",
	"soul-path": "神魂",
	attributes: "属性",
	equipment: "装备",
	inventory: "背包",
	storage: "储物袋",
	guild: "宗门",
	team: "队伍",
	"team-match": "队伍匹配",
	companion: "道侣",
	master: "师门",
	friend: "好友",
	market: "交易",
	shop: "商店",
	cave: "洞府",
	"cave-formation": "阵法",
	caveplot: "灵田",
	alchemy: "炼丹",
	forge: "锻造",
	profession: "职业",
	email: "邮件",
	flymail: "飞信",
	bounty: "悬赏",
	robbery: "打劫",
	pvp: "争夺",
	tower: "通天塔",
	"tongtian-tower": "通天塔",
	"world-boss": "凶兽",
	"demon-tower": "妖塔",
	dungeon: "秘境",
	storyline: "主线",
	tribulation: "渡劫",
	achievements: "成就",
	ranking: "排行榜",
	leaderboard: "排行榜",
	activity: "活动",
	"activity-points": "活跃",
	recharge: "充值",
	payments: "支付",
	referral: "邀请",
	title: "称号",
	tasks: "任务",
	notification: "通知",
	"newcomer-guide": "新人引导",
	"spirit-root": "灵根",
	talents: "天赋",
	meditation: "闭关",
	seclusion: "闭关",
	meridian: "经络",
	realms: "境界",
	breakthrough: "突破",
	promotion: "晋级",
	"green-bottle": "小绿瓶",
	consume: "服用",
	peiyuan: "培元丹",
	mingwu: "明悟丹",
	gacha: "抽奖",
	lootbox: "礼盒",
	"redeem-code": "礼包码",
	"black-box": "黑盒拍卖",
	"guild-competition": "宗门大比",
	"secret-realms": "灵脉攻防战",
	tianjiao: "天骄",
	scarecrow: "稻草人",
	feedback: "反馈",
	glossary: "词典",
	encyclopedia: "图鉴",
	tianshu: "天书",
	navigation: "导航",
	account: "账号",
	checkin: "签到"
};
/** 取 operation 前缀对应的动作名；未登记回退「操作」。 */
const operationActionName = (operation) => ACTION_NAMES[operation.split(".")[0] ?? ""] ?? "操作";
/** 错误气泡标题：`<动作> · 未完成`；无 operation 时用「操作」。 */
const errorTitle = (operation) => `${operation ? operationActionName(operation) : "操作"} · 未完成`;

//#endregion
export { errorTitle, operationActionName };