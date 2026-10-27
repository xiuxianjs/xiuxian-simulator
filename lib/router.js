import { measureTransportStage } from "./utils/transportTiming.js";
import { withCommandCatalog } from "./api/bot/catalog-query-reuse.js";
import { withAccessFacts } from "./api/bot/access-facts.js";
import { alchemyRoutes } from "./response/alchemy/v2/commands.js";
import { forgeReadEntries, forgeReadRoutes } from "./response/profession/forge/commands.js";
import { Router } from "alemonjs";

//#region src/router.ts
/**
* 把感叹号的消息，让给旧版本代码，当前项目代码用 / 或 # 开头的消息。
*/
const app = Router.create();
const commandEvents = [
	"message.create",
	"private.message.create",
	"interaction.create",
	"private.interaction.create"
];
app.res({ events: ["notice.create", "private.notice.create"] }, () => import("./response/notification/permission/res.js"));
app.res({ events: ["private.friend.add", "guild.join"] }, () => import("./response/notification/welcome/res.js"));
app.res({ events: ["member.add"] }, () => import("./response/notification/member/res.js"));
app.res({ events: [
	"private.friend.remove",
	"guild.exit",
	"member.remove"
] }, () => import("./response/notification/lifecycle/res.js"));
app.res({
	events: commandEvents,
	regular: /^[!！]/
}, () => import("./response/commandError/ignore/res.js"));
app.res({
	events: commandEvents,
	regular: /^\s*[/#＃]?(?:领取回归礼包|领取测试礼包|凡人修仙礼包码|赞助|活动(?:商城|商店|购买|充值)|海外仙岛|海岛|限时活动\s+(?:商店|任务|特惠))(?:\s|$|购买|领取)/
}, () => import("./response/commandError/ignore/res.js"));
app.res({ events: ["interaction.create", "private.interaction.create"] }, () => import("./response/onboarding/res.js"));
app.res({
	events: commandEvents,
	regular: /^[/#＃]?(?:宗门群订阅|取消宗门群订阅|师门群订阅|取消师门群订阅)$/
}, () => import("./response/flyMail/guildSubscription/res.js"));
app.res({
	events: commandEvents,
	regular: /^[/#＃]?(?:开启每日机缘|关闭每日机缘)$/
}, () => import("./response/dailyFortune/res.js"));
app.res({
	events: commandEvents,
	regular: /^[/#＃]?(?:群通知管理|配置群欢迎(?:\s|$)|配置加群提醒(?:\s|$)|加群申请记录(?:\s|$))/
}, () => import("./response/notification/community/res.js"));
app.res({
	events: commandEvents,
	regular: /^\s*[/#＃]?\s*(?:继续引导|退出引导)\s*$/
}, () => import("./response/onboarding/res.js"));
app.res({
	events: commandEvents,
	regular: /^(\/|#|＃)?(任务面板|修仙面板|我的任务)/
}, () => import("./response/taskPanel/res.js"));
app.res({
	events: commandEvents,
	regular: /^(\/|#|＃)?任务\s+/
}, () => import("./response/task/continue/res.js"));
{
	const publicXiuxian = app.group({
		events: commandEvents,
		routeText: {
			prefixes: [
				"/",
				"#",
				"＃"
			],
			stripPrefix: true,
			allowBare: true
		}
	});
	/**
	* 无需身份、不用担心被用户知晓的，公共入口
	*/
	publicXiuxian.use(["更多"], withAccessFacts(["realm"], () => import("./response/more/res.js")));
	publicXiuxian.use(["折叠", "扩展"], withAccessFacts(["realm"], () => import("./response/more/res.js")));
	publicXiuxian.use({
		path: "图鉴详情",
		description: "免登录打开指定图鉴条目：/图鉴详情 <分类> <编号>。"
	}, () => import("./response/encyclopedia/detail/res.js"));
	publicXiuxian.use({
		path: "图鉴",
		description: "免登录查阅图鉴：/图鉴 [分类] [子分类]。"
	}, () => import("./response/encyclopedia/res.js"));
	publicXiuxian.use("天书", () => import("./response/tianshu/res.js"));
	publicXiuxian.use("词典分类", () => import("./response/glossary/category/res.js"));
	publicXiuxian.use("词典", () => import("./response/glossary/query/res.js"));
	publicXiuxian.use("攻略", () => import("./response/strategy.js"));
	publicXiuxian.use(["继承", "前世"], () => import("./response/legacyArchive/res.js"));
	publicXiuxian.use([
		"帮助",
		"修仙帮助",
		"help",
		"menu",
		"菜单"
	], withAccessFacts(["realm"], () => import("./response/help.js")));
	publicXiuxian.use([
		"踏入仙途",
		"开始游戏",
		"开始修仙",
		"开始降临",
		"降临世界",
		"我是"
	], () => import("./response/start/res.js"));
	const xiuxian = publicXiuxian.group({});
	xiuxian.use([
		"继续",
		"跳过剧情",
		"跳过引导",
		"跳过"
	], () => import("./response/guide/action/res.js"));
	xiuxian.use({
		path: "任务设置",
		schema: {
			args: [
				{
					name: "slot",
					rules: [{ type: "string" }]
				},
				{
					name: "step",
					rules: [{ type: "string" }]
				},
				{
					name: "content",
					rules: [{ type: "rest" }]
				}
			],
			usage: "/任务设置 <槽位> <步骤> <内容>",
			messages: { tooManyArgs: "任务设置参数过多，请使用：/任务设置 <槽位> <步骤> <内容>" }
		},
		description: "设置任务槽位中某一步的执行内容。"
	}, () => import("./response/task/settings/res.js"));
	xiuxian.use({
		path: "任务别名",
		schema: {
			args: [{
				name: "slot",
				rules: [{ type: "string" }]
			}, {
				name: "alias",
				rules: [{ type: "rest" }]
			}],
			usage: "/任务别名 <槽位> <名称>"
		},
		description: "为任务槽位设置一个更易识别的别名。"
	}, () => import("./response/task/alias/res.js"));
	xiuxian.use({
		path: "任务清空",
		schema: {
			args: [{
				name: "slot",
				rules: [{ type: "rest" }]
			}],
			usage: "/任务清空 <槽位>"
		},
		description: "清空指定任务槽位中的内容。"
	}, () => import("./response/task/clear/res.js"));
	xiuxian.use({
		path: "任务执行",
		schema: {
			args: [{
				name: "slot",
				rules: [{ type: "rest" }]
			}],
			usage: "/任务执行 <槽位>"
		},
		description: "执行指定任务槽位中已保存的任务链。"
	}, () => import("./response/task/execute/res.js"));
	xiuxian.use("任务取消", () => import("./response/task/cancel/res.js"));
	xiuxian.use("任务跳过", () => import("./response/task/skip/res.js"));
	xiuxian.use(["开启群订阅", "关闭群订阅"], () => import("./response/groupSubscription/res.js"));
	xiuxian.use(["通知设置"], () => import("./response/notification/settings/res.js"));
	xiuxian.use(["我的通知", "通知记录"], () => import("./response/notification/history/res.js"));
	xiuxian.use({
		path: "任务",
		schema: {
			args: [{
				name: "content",
				rules: [{ type: "rest" }]
			}],
			usage: "/任务"
		},
		description: "查看任务系统概览，或继续当前任务流程。"
	}, () => import("./response/task/overview/res.js"));
	xiuxian.use([
		"我",
		"我的信息",
		"我的资料",
		"我的编号",
		"我的控制台",
		"个人信息",
		"个人资料",
		"个人编号",
		"个人控制台"
	], withAccessFacts(["resourceSettlement", "homeOverview"], () => measureTransportStage("home.route.import", () => import("./response/message/me/res.js"))));
	xiuxian.use(["我的天赋", "天赋"], () => import("./response/talents/res.js"));
	xiuxian.use([
		"我的灵根",
		"灵根",
		"灵根材料",
		"灵根培养",
		"灵根确认培养",
		"灵根晋品"
	], () => import("./response/spiritRoot/res.js"));
	xiuxian.use("排行榜", () => import("./response/leaderboard/res.js"));
	xiuxian.use("所有成就", () => import("./response/achievements/allAchievements/res.js"));
	xiuxian.use("我的称号", () => import("./response/title/myTitles/res.js"));
	xiuxian.use("佩戴称号", () => import("./response/title/activateTitle/res.js"));
	xiuxian.use("卸下称号", () => import("./response/title/deactivateTitle/res.js"));
	xiuxian.use(["我的回忆"], () => import("./response/memory/res.js"));
	xiuxian.use(["我的故事"], () => import("./response/story/res.js"));
	xiuxian.use(["我的主题"], () => import("./response/theme/myThemes/res.js"));
	xiuxian.use("切换主题", () => import("./response/theme/activateTheme/res.js"));
	xiuxian.use("关闭主题", () => import("./response/theme/deactivateTheme/res.js"));
	xiuxian.use("切换墨色模式", () => import("./response/theme/switchInkMode/res.js"));
	xiuxian.use(["切换", "替换"], () => import("./response/profession/replaceEquip/res.js"));
	xiuxian.use("商店", withCommandCatalog("shop", () => measureTransportStage("route.import", () => import("./response/shop/hub/res.js"))));
	xiuxian.use([
		"储物袋",
		"背包",
		"纳戒",
		"我的储物袋",
		"我的背包",
		"我的纳戒"
	], () => import("./response/storage/newBag/main/res.js"));
	xiuxian.use([
		"储物袋 道具",
		"背包 道具",
		"我的储物袋 道具",
		"我的背包 道具"
	], () => import("./response/storage/newBag/props/res.js"));
	xiuxian.use([
		"储物袋 材料",
		"背包 材料",
		"我的储物袋 材料",
		"我的背包 材料"
	], () => import("./response/storage/newBag/materials/res.js"));
	xiuxian.use([
		"储物袋 装备",
		"背包 装备",
		"我的储物袋 装备",
		"我的背包 装备"
	], () => import("./response/storage/newBag/equipments/res.js"));
	xiuxian.use([
		"储物袋 天工",
		"背包 天工",
		"我的储物袋 天工",
		"我的背包 天工"
	], () => import("./response/storage/newBag/tiangong/res.js"));
	xiuxian.use([
		"储物袋 功法",
		"背包 功法",
		"我的储物袋 功法",
		"我的背包 功法"
	], () => import("./response/storage/newBag/skillBooks/res.js"));
	xiuxian.use([
		"储物袋 本命",
		"背包 本命",
		"我的储物袋 本命",
		"我的背包 本命"
	], () => import("./response/storage/newBag/soulArtifacts/res.js"));
	xiuxian.use([
		"储物袋 礼盒",
		"背包 礼盒",
		"我的储物袋 礼盒",
		"我的背包 礼盒"
	], () => import("./response/storage/newBag/lootboxes/res.js"));
	xiuxian.use([
		"查看通天塔",
		"通天塔",
		"查看通天塔 我的"
	], () => import("./response/ranking/viewRankings/res.js"));
	xiuxian.use([
		"更新属性",
		"属性面板",
		"我的面板"
	], () => import("./response/attributes/update/res.js"));
	xiuxian.use(["元婴神魂", "元婴面板"], () => import("./response/soulPath/panel/res.js"));
	xiuxian.use(["元婴道途", "道途详情"], () => import("./response/soulPath/path/res.js"));
	xiuxian.use("道途印证", withAccessFacts(["realm"], () => import("./response/soulPath/compare/res.js")));
	xiuxian.use({
		path: "确认神魂",
		schema: {
			args: [{
				name: "token",
				rules: [{ type: "rest" }]
			}],
			usage: "/确认神魂 <凭证>"
		}
	}, () => import("./response/soulPath/confirm/res.js"));
	xiuxian.use(["神魂材料来源", "神魂材料"], () => import("./response/soulPath/source/res.js"));
	xiuxian.use({
		path: "神魂补给",
		schema: {
			args: [{
				name: "direction",
				rules: [{ type: "rest" }]
			}],
			usage: "/神魂补给 <自动|定魂|养魄|悟道|出窍>"
		}
	}, () => import("./response/soulPath/supply/res.js"));
	xiuxian.use({
		path: "神魂温养",
		schema: {
			args: [{
				name: "direction",
				rules: [{ type: "rest" }]
			}],
			usage: "/神魂温养 <定魂|养魄|悟道|出窍>"
		},
		description: "消耗神魂材料温养当前元婴道途。"
	}, () => import("./response/soulPath/nurture/res.js"));
	xiuxian.use("神魂重选", () => import("./response/soulPath/reroll/res.js"));
	xiuxian.use({
		path: "选择道途",
		schema: {
			args: [{
				name: "path",
				rules: [{ type: "rest" }]
			}],
			usage: "/选择道途 <玄法|炼体|御器>"
		},
		description: "首次免费选择元婴道途。"
	}, () => import("./response/soulPath/choose/res.js"));
	xiuxian.use("道途突破", () => import("./response/soulPath/advance/res.js"));
	xiuxian.use({
		path: "切换道途",
		schema: {
			args: [{
				name: "path",
				rules: [{ type: "rest" }]
			}],
			usage: "/切换道途 <玄法|炼体|御器>"
		},
		description: "消耗道痕结晶切换元婴道途，已获得进度会保留。"
	}, () => import("./response/soulPath/switch/res.js"));
	xiuxian.use([
		"个人活动",
		"我的活动",
		"活动大厅",
		"宗门活动"
	], () => import("./response/activity/res.js"));
	xiuxian.use(["查看秘境", "秘境列表"], () => import("./response/dungeon/list/res.js"));
	xiuxian.use("秘境详情", () => import("./response/dungeon/detail/res.js"));
	xiuxian.use("队伍信息", () => import("./response/team/teamInfo/res.js"));
	xiuxian.use("匹配状态", () => import("./response/teamMatch/status/res.js"));
	xiuxian.use([
		"副本列表",
		"查看主线",
		"主线列表"
	], withCommandCatalog("storyline", () => measureTransportStage("route.import", () => import("./response/storyline/list/res.js"))));
	xiuxian.use("天师宝录", () => import("./response/tianshiBaolu/res.js"));
	xiuxian.use("申请词典编辑权限", () => import("./response/glossary/apply/res.js"));
	xiuxian.use("录入词典", () => import("./response/glossary/create/res.js"));
	xiuxian.use("删除词典", () => import("./response/glossary/delete/res.js"));
	xiuxian.use("妖塔", () => import("./response/demonTower/info/res.js"));
	xiuxian.use("凶兽", () => import("./response/worldBoss/info/res.js"));
	xiuxian.use(["我的宗门", "查看势力"], () => import("./response/guild/myGuild/res.js"));
	xiuxian.use([
		"充值",
		"充值说明",
		"充值信息"
	], () => import("./response/recharge/info/res.js"));
	xiuxian.use("充值购买", () => import("./response/recharge/pay/res.js"));
	xiuxian.use([
		"我的订单",
		"查询充值订单",
		"继续支付"
	], () => import("./response/recharge/orders/res.js"));
	xiuxian.use("礼包奖励", () => import("./response/recharge/firstRechargeInfo/res.js"));
	xiuxian.use("领取礼包奖励", () => import("./response/recharge/firstRechargeClaim/res.js"));
	xiuxian.use({
		path: "查看信息",
		schema: {
			args: [{
				name: "target",
				rules: [{ type: "rest" }]
			}],
			usage: "/查看信息 <UID|@道友>"
		},
		description: "查看指定玩家的信息，支持直接输入 UID，或通过 @ 自动识别对方。"
	}, () => import("./response/message/viewInfo/res.js"));
	xiuxian.use("我的好友", withAccessFacts(["social"], () => import("./response/friend/friendList/res.js")));
	xiuxian.use("随机好友", () => import("./response/friend/randomFriend/res.js"));
	xiuxian.use("赠礼记录", withAccessFacts(["social"], () => import("./response/companion/giftRecords/res.js")));
	xiuxian.use(["我的洞府", "洞府"], () => import("./response/profession/myProfession/res.js"));
	xiuxian.use(["我的灵田", "灵田"], () => import("./response/cavePlot/info/res.js"));
	xiuxian.use({
		path: "查看灵田",
		schema: {
			args: [{
				name: "target",
				rules: [{ type: "rest" }]
			}],
			usage: "/查看灵田 <UID|@道友>"
		},
		description: "查看指定玩家的灵田，支持直接输入 UID，或通过 @ 自动识别对方。"
	}, () => import("./response/cavePlot/visit/res.js"));
	xiuxian.use(["灵田记录", "洞府记录"], () => import("./response/cavePlot/logs/res.js"));
	xiuxian.use("附近灵田", () => import("./response/cavePlot/nearby/res.js"));
	xiuxian.use([
		"开垦",
		"开垦所有",
		"一键开垦"
	], () => import("./response/cavePlot/cultivate/res.js"));
	xiuxian.use("一键播种", () => import("./response/cavePlot/plant/res.js"));
	xiuxian.use("播种", () => import("./response/cavePlot/plant/res.js"));
	xiuxian.use(["一键打理灵田", "一键照料道侣灵田"], () => import("./response/cavePlot/tendAll/res.js"));
	xiuxian.use([
		"浇灌",
		"除虫",
		"除草",
		"收割",
		"灵田加速",
		"升级灵田",
		"一键浇灌",
		"一键除虫",
		"一键除草",
		"一键收割",
		"一键加速",
		"一键催熟",
		"一键灵田加速",
		"一键灵田催熟"
	], () => import("./response/cavePlot/action/res.js"));
	xiuxian.use({
		path: "协作灵田",
		schema: {
			args: [{
				name: "content",
				rules: [{ type: "rest" }]
			}],
			usage: "/协作灵田 <UID|@道友> <浇灌|除虫|除草|收割> [灵田序号]"
		},
		description: "对指定玩家的灵田执行协作操作，支持直接输入 UID，或通过 @ 自动识别对方。"
	}, () => import("./response/cavePlot/social/res.js"));
	xiuxian.use({
		path: "偷药",
		schema: {
			args: [{
				name: "content",
				rules: [{ type: "rest" }]
			}],
			usage: "/偷药 <UID|@道友> [灵田序号]"
		},
		description: "对指定玩家的灵田执行偷药操作，支持直接输入 UID，或通过 @ 自动识别对方。"
	}, () => import("./response/cavePlot/social/res.js"));
	xiuxian.use(["洞府阵法", "我的阵法"], () => import("./response/caveFormation/info/res.js"));
	xiuxian.use("邀请码", () => import("./response/referral/viewCode/res.js"));
	xiuxian.use("我的邀请", () => import("./response/referral/invitees/res.js"));
	xiuxian.use(["交易所", "珍宝楼"], () => import("./response/market/list/res.js"));
	xiuxian.use("小店", () => import("./response/shop/playerShop/list/res.js"));
	xiuxian.use("小店排行", () => import("./response/shop/playerShop/ranking/res.js"));
	xiuxian.use("煞气", () => import("./response/shaQi/res.js"));
	xiuxian.use("杀神榜", () => import("./response/killGodList/res.js"));
	xiuxian.use("领取杀神称号", () => import("./response/killGodList/claimTitle/res.js"));
	xiuxian.use("悬赏榜", () => import("./response/bounty/list/res.js"));
	xiuxian.use({
		path: "悬赏",
		schema: {
			args: [{
				name: "content",
				rules: [{ type: "rest" }]
			}],
			usage: "/悬赏 <UID|@道友> <金额> [人数]"
		}
	}, () => import("./response/bounty/publish/res.js"));
	xiuxian.use("领赏", () => import("./response/bounty/claim/res.js"));
	xiuxian.use("仇人", () => import("./response/enemy/res.js"));
	xiuxian.use("宗门商店", () => import("./response/guild/shop/res.js"));
	xiuxian.use("宗门商店自动刷新", () => import("./response/guild/autoRefreshShop/res.js"));
	xiuxian.use("宗门日常", () => import("./response/guild/daily/res.js"));
	xiuxian.use("宗门任务", () => import("./response/guild/daily/res.js"));
	xiuxian.use("祭祀祖师", () => import("./response/guild/worship/res.js"));
	xiuxian.use("宗门战备", () => import("./response/guild/battleTraining/res.js"));
	xiuxian.use("宗门周常", () => import("./response/guild/weekly/res.js"));
	xiuxian.use("宗门主线", () => import("./response/guild/storyline/res.js"));
	xiuxian.use("宗门主线挑战", () => import("./response/guild/storyline/challengeRes.js"));
	xiuxian.use("宗门主线记录", () => import("./response/guild/storyline/recordsRes.js"));
	xiuxian.use("领取宗门主线奖励", () => import("./response/guild/storyline/claimRes.js"));
	xiuxian.use(["我的道侣", "道侣"], () => import("./response/companion/info/res.js"));
	xiuxian.use(["我的师门", "师门"], () => import("./response/master/info/res.js"));
	xiuxian.use("领取师门称号", () => import("./response/master/claimTitle/res.js"));
	xiuxian.use("师谱", () => import("./response/master/lineage/res.js"));
	xiuxian.use(["圣人排行榜", "圣人榜"], withAccessFacts(["social"], () => import("./response/master/rank/res.js")));
	xiuxian.use("宗门大比", () => import("./response/guildCompetition/home/res.js"));
	xiuxian.use("邀请境界奖励", () => import("./response/referral/rewardRules/realm/res.js"));
	xiuxian.use(["初入仙途", "新人狂欢"], () => import("./response/activity/newcomerLogin/res.js"));
	xiuxian.use("物品详情", () => import("./response/itemDetail/res.js"));
	xiuxian.use("本命物详情", () => import("./response/soulArtifact/detail/res.js"));
	xiuxian.use("战斗回忆翻页", () => import("./response/battle/memoryPage/res.js"));
	xiuxian.use("查看战斗过程", () => import("./response/battle/viewLog/res.js"));
	xiuxian.use(["我的设置", "群订阅"], () => import("./response/message/settings/res.js"));
	xiuxian.use(["成就"], withAccessFacts(["social"], () => import("./response/achievements/route/res.js")));
	xiuxian.use("我的成就", withAccessFacts(["social"], () => import("./response/achievements/myAchievements/res.js")));
	xiuxian.use("成就 战力", withAccessFacts(["social"], () => import("./response/achievements/combatPower/res.js")));
	xiuxian.use("我的权益", () => import("./response/monthCard/rights/res.js"));
	xiuxian.use("我的职业", () => import("./response/profession/myProfession/res.js"));
	xiuxian.use([...forgeReadEntries], () => import("./response/profession/forge/res.js"));
	for (const config of forgeReadRoutes) xiuxian.use(config, () => import("./response/profession/forge/res.js"));
	xiuxian.use(["邀请奖励", "邀请人数奖励"], () => import("./response/referral/rewardRules/count/res.js"));
	xiuxian.use([
		"灵脉攻防战",
		"秘境攻防",
		"秘境争霸"
	], () => import("./response/guildSecretRealmWar/home/res.js"));
	xiuxian.use("宗门公告", () => import("./response/guild/viewNotice/res.js"));
	xiuxian.use("宗门简介", () => import("./response/guild/viewIntro/res.js"));
	xiuxian.use("我的境界", () => import("./response/realms/myRealm/res.js"));
	xiuxian.use(["我的渡劫", "渡劫结算"], () => import("./response/tribulation/res.js"));
	xiuxian.use([
		"劫云榜",
		"搜索劫云",
		"观望渡劫"
	], () => import("./response/tribulation/publicRes.js"));
	xiuxian.use("日常活跃", () => import("./response/activityPoints/daily/res.js"));
	xiuxian.use(["任务面板", "修仙面板"], () => import("./response/taskPanel/res.js"));
	xiuxian.use("战力排行榜", () => import("./response/battle/leaderboard/res.js"));
	xiuxian.use("邀请VIP奖励", () => import("./response/referral/rewardRules/vip/res.js"));
	xiuxian.use("宗门精华", () => import("./response/guild/viewEssences/res.js"));
	xiuxian.use("宗门红包", () => import("./response/guild/redPacketList/res.js"));
	xiuxian.use(["灵脉攻防战查看", "秘境攻防查看"], () => import("./response/guildSecretRealmWar/view/res.js"));
	xiuxian.use(["灵脉攻防战列表", "秘境攻防列表"], () => import("./response/guildSecretRealmWar/list/res.js"));
	xiuxian.use("我的装备", () => import("./response/equipment/myEquipments/res.js"));
	xiuxian.use("首通排名奖励", () => import("./response/ranking/viewFirstRewards/res.js"));
	xiuxian.use([
		"提交反馈",
		"反馈",
		"提交反馈游戏",
		"反馈游戏"
	], () => import("./response/feedbacks/feedbackGame/res.js"));
	xiuxian.use("查看反馈", () => import("./response/feedbacks/feedbackInfo/res.js"));
	xiuxian.use("我的反馈", () => import("./response/feedbacks/feedbacksMe/res.js"));
	xiuxian.use("登录", () => import("./response/emailSecurity/login.js"));
	xiuxian.use("设置密码", () => import("./response/emailSecurity/setPassword.js"));
	xiuxian.use("绑定邮箱", () => import("./response/emailSecurity/bindEmail.js"));
	xiuxian.use("更换账号", () => import("./response/emailSecurity/changeAccount.js"));
	xiuxian.use("更换邮箱", () => import("./response/emailSecurity/changeEmail.js"));
	xiuxian.use("验证", () => import("./response/emailSecurity/verify.js"));
	xiuxian.use([
		"我的账号",
		"安全中心",
		"我的安全中心"
	], () => import("./response/emailSecurity/securityCenter.js"));
	xiuxian.use("我的邮件", () => import("./response/email/MyEmailList/res.js"));
	xiuxian.use("查看邮件", () => import("./response/email/findEmail/res.js"));
	xiuxian.use("周常活跃", () => import("./response/activityPoints/weekly/res.js"));
	xiuxian.use("我的特权", () => import("./response/monthCard/privileges/res.js"));
	xiuxian.use("新人返利", () => import("./response/recharge/newcomerInfo/res.js"));
	xiuxian.use("周周返利", () => import("./response/recharge/weeklyRebateInfo/res.js"));
	xiuxian.use("我的上架", () => import("./response/market/my/res.js"));
	xiuxian.use(["我的记录", "我的交易记录"], () => import("./response/market/records/res.js"));
	xiuxian.use(["信誉分", "我的信誉"], () => import("./response/market/credibility/res.js"));
	xiuxian.use("我的小店", () => import("./response/shop/playerShop/mine/res.js"));
	xiuxian.use([
		"我的武器",
		"我的饰品",
		"我的法袍",
		"我的衣服",
		"我的鞋子",
		"我的头饰",
		"我的羽翼"
	], () => import("./response/equipment/equipmentDetail/res.js"));
	xiuxian.use("我的隐藏功法", () => import("./response/skillBook/hidden/res.js"));
	xiuxian.use("我的功法", () => measureTransportStage("route.import", () => import("./response/skillBook/mySkillBooks/res.js")));
	xiuxian.use("查看功法", () => import("./response/skillBook/detail/res.js"));
	xiuxian.use("参悟", () => import("./response/skillBook/proficiency/res.js"));
	xiuxian.use("宗门列表", withAccessFacts(["social"], () => import("./response/guild/guildList/res.js")));
	xiuxian.use("我的申请", () => import("./response/guild/myApplications/res.js"));
	xiuxian.use("宗门审核", () => import("./response/guild/reviewApplications/res.js"));
	xiuxian.use("宗门日志", () => import("./response/guild/viewLogs/res.js"));
	xiuxian.use("我发的红包", () => import("./response/guild/myRedPackets/res.js"));
	xiuxian.use("宗门成员列表", () => import("./response/guild/memberList/res.js"));
	xiuxian.use("宗门改职", () => import("./response/guild/changeRole/res.js"));
	xiuxian.use("可挑战宗门列表", () => import("./response/guildCompetition/challengeList/res.js"));
	xiuxian.use("查看晋级赛队伍", () => import("./response/guildCompetition/checkPromotionTeams/res.js"));
	xiuxian.use("查看押注记录", () => import("./response/guildCompetition/checkBets/res.js"));
	xiuxian.use("宗门大比战斗记录", () => import("./response/guildCompetition/battleLog/res.js"));
	xiuxian.use("宗门大比战斗详情", () => import("./response/guildCompetition/battleDetail/res.js"));
	xiuxian.use(["我的本命物", "本命物信息"], () => import("./response/soulArtifact/info/res.js"));
	xiuxian.use(["我的队伍", "查看队伍"], () => import("./response/team/myTeam/res.js"));
	xiuxian.use("队伍战斗记录", () => import("./response/team/battleRecords/res.js"));
	xiuxian.use("队伍战斗详情", () => import("./response/team/battleDetail/res.js"));
	xiuxian.use("我的队伍申请", () => import("./response/team/myApplications/res.js"));
	xiuxian.use("我的队伍邀请", () => import("./response/team/myInvitations/res.js"));
	xiuxian.use(["队伍申请", "处理队伍申请"], () => import("./response/team/applications/res.js"));
	xiuxian.use("队伍列表", () => import("./response/team/teamList/res.js"));
	xiuxian.use("月度排名奖励", () => import("./response/ranking/viewMonthlyRewards/res.js"));
	xiuxian.use("主线排行榜", () => import("./response/storyline/leaderboard/res.js"));
	xiuxian.use("妖塔排行榜", () => import("./response/demonTower/leaderboard/res.js"));
	xiuxian.use(["丹师排行榜", "炼丹师排行榜"], () => import("./response/alchemy/leaderboard/res.js"));
	xiuxian.use("人气排行榜", () => import("./response/leaderboard/popularity/res.js"));
	xiuxian.use("凶兽排行", () => import("./response/worldBoss/leaderboard/res.js"));
	xiuxian.use("凶兽奖励", () => import("./response/worldBoss/rewards/res.js"));
	xiuxian.use("境界排行榜", () => import("./response/leaderboard/realm/res.js"));
	xiuxian.use("区境界排行榜", () => import("./response/leaderboard/realm/regionRes.js"));
	xiuxian.use([
		"登天梯",
		"查看登天梯",
		"天骄榜",
		"查看天骄榜"
	], () => import("./response/tianjiao/leaderboard/res.js"));
	xiuxian.use([
		"登天奖励",
		"登天奖励记录",
		"天骄奖励",
		"天骄奖励记录"
	], () => import("./response/tianjiao/rewards/res.js"));
	xiuxian.use("好友申请", withAccessFacts(["social"], () => import("./response/friend/friendRequest/res.js")));
	xiuxian.use("黑名单", withAccessFacts(["social"], () => import("./response/friend/blocklist/res.js")));
	xiuxian.use("飞信", () => import("./response/flyMail/home/res.js"));
	xiuxian.use([
		"黑盒拍卖",
		"限时活动",
		"查看特殊活动"
	], () => import("./response/blackBox/overview/res.js"));
	xiuxian.use("黑盒排期", () => import("./response/blackBox/schedule/res.js"));
	xiuxian.use("黑盒记录", () => import("./response/blackBox/history/res.js"));
	xiuxian.use("黑盒详情", () => import("./response/blackBox/room/res.js"));
	xiuxian.use("黑盒出价", () => import("./response/blackBox/preview/res.js"));
	xiuxian.use("活动任务", () => import("./response/limitedEvent/tasks/res.js"));
	xiuxian.use("活动道具", () => import("./response/limitedEvent/tokens/res.js"));
	{
		const captchaMatch = xiuxian.group({});
		captchaMatch.use("黑盒入场", () => import("./response/blackBox/join/res.js"));
		captchaMatch.use(["黑盒提醒", "黑盒预约"], () => import("./response/blackBox/reserve/res.js"));
		captchaMatch.use("黑盒确认", () => import("./response/blackBox/confirm/res.js"));
		captchaMatch.use("黑盒取消", () => import("./response/blackBox/cancel/res.js"));
		captchaMatch.use("黑盒鉴宝", () => import("./response/blackBox/probe/res.js"));
		captchaMatch.use("确认黑盒出价", () => import("./response/blackBox/bid/res.js"));
		captchaMatch.use("黑盒撤标", () => import("./response/blackBox/withdraw/res.js"));
		captchaMatch.use(["签到日历", "签到概览"], () => import("./response/signIn/calendar/res.js"));
		captchaMatch.use("签到", () => import("./response/signIn/hub/res.js"));
		captchaMatch.use("突破", () => import("./response/breakthrough/perform/res.js"));
		captchaMatch.use("冲脉", () => import("./response/meditation/pulse/res.js"));
		captchaMatch.use("晋级", () => import("./response/promotion/perform/res.js"));
		captchaMatch.use([
			"开启渡劫",
			"渡劫评级",
			"渡劫开劫",
			"捣乱渡劫",
			"参与观望",
			"暂避渡劫",
			"心魔选择",
			"心魔回答"
		], () => import("./response/tribulation/res.js"));
		captchaMatch.use("一键装备", () => import("./response/equipment/autoEquip/res.js"));
		captchaMatch.use("取消一键学习功法", () => import("./response/skillBook/batchLearn/res.js"));
		captchaMatch.use(["一键签到"], () => import("./response/signIn/hub/res.js"));
		captchaMatch.use(["宗门签到", "联盟签到"], () => import("./response/guild/checkin/res.js"));
		captchaMatch.use("好友设置", () => import("./response/friend/friendSettings/res.js"));
		captchaMatch.use("解除道侣", () => import("./response/companion/breakup/res.js"));
		captchaMatch.use("宗门改名", () => import("./response/guild/rename/res.js"));
		captchaMatch.use("取消宗门申请", () => import("./response/guild/cancelApplication/res.js"));
		captchaMatch.use("宗门审核同意", () => import("./response/guild/approveApplication/res.js"));
		captchaMatch.use("宗门审核拒绝", () => import("./response/guild/rejectApplication/res.js"));
		captchaMatch.use("设置身份为", () => import("./response/guild/appointRole/res.js"));
		captchaMatch.use("卸任", () => import("./response/guild/resignRole/res.js"));
		captchaMatch.use("宗主转让", () => import("./response/guild/transferLeader/res.js"));
		captchaMatch.use("设置宗门简介", () => import("./response/guild/setIntro/res.js"));
		captchaMatch.use("设置宗门公告", () => import("./response/guild/setNotice/res.js"));
		captchaMatch.use("添加精华", () => import("./response/guild/addEssence/res.js"));
		captchaMatch.use("移除精华", () => import("./response/guild/removeEssence/res.js"));
		captchaMatch.use("设置申请宗门最低境界", () => import("./response/guild/setMinRealm/res.js"));
		captchaMatch.use("取消队伍申请", () => import("./response/team/cancelApplication/res.js"));
		captchaMatch.use("取消队伍邀请", () => import("./response/team/cancelInvitation/res.js"));
		captchaMatch.use({
			path: "队伍位置设置",
			schema: {
				args: [{
					name: "content",
					rules: [{ type: "rest" }]
				}],
				usage: "/队伍位置设置 <UID|@道友> <位置序号>"
			}
		}, () => import("./response/team/setPosition/res.js"));
		captchaMatch.use("队伍同意", () => import("./response/team/approve/res.js"));
		captchaMatch.use("队伍拒绝", () => import("./response/team/reject/res.js"));
		captchaMatch.use("队伍邀请同意", () => import("./response/team/acceptInvitation/res.js"));
		captchaMatch.use("队伍邀请拒绝", () => import("./response/team/rejectInvitation/res.js"));
		captchaMatch.use({
			path: "队伍踢出",
			schema: {
				args: [{
					name: "target",
					rules: [{ type: "rest" }]
				}],
				usage: "/队伍踢出 <UID|@道友>"
			}
		}, () => import("./response/team/kick/res.js"));
		captchaMatch.use("设置队伍境界门槛", () => import("./response/team/setRealm/res.js"));
		captchaMatch.use({
			path: "转让队长",
			schema: {
				args: [{
					name: "target",
					rules: [{ type: "rest" }]
				}],
				usage: "/转让队长 <UID|@道友>"
			}
		}, () => import("./response/team/transferLeader/res.js"));
		captchaMatch.use({
			path: "邀请入队",
			schema: {
				args: [{
					name: "target",
					rules: [{ type: "rest" }]
				}],
				usage: "/邀请入队 <UID|@道友>"
			}
		}, () => import("./response/team/inviteTeam/res.js"));
		captchaMatch.use({
			path: "结交",
			schema: {
				args: [{
					name: "target",
					rules: [{ type: "rest" }]
				}],
				usage: "/结交 <UID|@道友>"
			}
		}, () => import("./response/friend/befriend/res.js"));
		captchaMatch.use({
			path: "拜师",
			schema: {
				args: [{
					name: "target",
					rules: [{ type: "rest" }]
				}],
				usage: "/拜师 <师父UID|@道友>"
			}
		}, () => import("./response/master/apply/res.js"));
		captchaMatch.use({
			path: "赐丹",
			schema: {
				args: [{
					name: "content",
					rules: [{ type: "rest" }]
				}],
				usage: "/赐丹 <徒弟UID|@道友> [培元丹|筑基丹]"
			}
		}, () => import("./response/master/gift/res.js"));
		captchaMatch.use({
			path: "删除好友",
			schema: {
				args: [{
					name: "target",
					rules: [{ type: "rest" }]
				}],
				usage: "/删除好友 <好友UID|@道友> [确认]"
			}
		}, () => import("./response/friend/deleteFriend/res.js"));
		captchaMatch.use("同意结交", withAccessFacts(["social"], () => import("./response/friend/acceptBefriend/res.js")));
		captchaMatch.use({
			path: "逐出师门",
			schema: {
				args: [{
					name: "target",
					rules: [{ type: "rest" }]
				}],
				usage: "/逐出师门 <徒弟UID|@道友>"
			}
		}, () => import("./response/master/expel/res.js"));
		captchaMatch.use("拒绝结交", withAccessFacts(["social"], () => import("./response/friend/rejectBefriend/res.js")));
		captchaMatch.use("拉黑", withAccessFacts(["social"], () => import("./response/friend/blockUser/res.js")));
		captchaMatch.use("取消拉黑", withAccessFacts(["social"], () => import("./response/friend/unblockUser/res.js")));
		captchaMatch.use({
			path: "学习功法",
			schema: {
				args: [{
					name: "content",
					rules: [{ type: "rest" }]
				}],
				usage: "/学习功法 <功法ID> [确认]"
			}
		}, () => import("./response/skillBook/learn/res.js"));
		captchaMatch.use({
			path: "隐藏功法",
			schema: { args: [{
				name: "skillBookId",
				rules: [{ type: "rest" }]
			}] }
		}, () => import("./response/skillBook/hide/res.js"));
		captchaMatch.use({
			path: "显示功法",
			schema: { args: [{
				name: "skillBookId",
				rules: [{ type: "rest" }]
			}] }
		}, () => import("./response/skillBook/show/res.js"));
		captchaMatch.use({
			path: "装备",
			schema: { args: [{
				name: "itemName",
				rules: [{ type: "rest" }]
			}] }
		}, () => import("./response/equipment/equipItem/res.js"));
		captchaMatch.use({
			path: "赠送",
			schema: {
				args: [{
					name: "content",
					rules: [{ type: "rest" }]
				}],
				usage: "/赠送 [类别 名字] [UID|@道友] [数量，默认1]"
			}
		}, withAccessFacts(["social"], () => import("./response/companion/gift/res.js")));
		captchaMatch.use({
			path: "结为道侣",
			schema: {
				args: [{
					name: "content",
					rules: [{ type: "rest" }]
				}],
				usage: "/结为道侣 [道号|UID|@道友|页码] [誓约序号]"
			}
		}, withAccessFacts(["social"], () => import("./response/companion/propose/res.js")));
		captchaMatch.use({
			path: "改名",
			schema: { args: [{
				name: "name",
				rules: [{ type: "rest" }]
			}] }
		}, () => import("./response/props/rename/res.js"));
		captchaMatch.use({
			path: "改性",
			schema: {
				args: [{
					name: "gender",
					rules: [{ type: "rest" }]
				}],
				usage: "/改性 <男|女>"
			}
		}, () => import("./response/props/rename/res.js"));
		captchaMatch.use({
			path: "改签名",
			schema: { args: [{
				name: "signature",
				rules: [{ type: "rest" }]
			}] }
		}, () => import("./response/props/rename/res.js"));
		captchaMatch.use({
			path: "加入宗门",
			schema: { args: [{
				name: "guildId",
				rules: [{ type: "rest" }]
			}] }
		}, () => import("./response/guild/joinGuild/res.js"));
		captchaMatch.use({
			path: "同意道侣",
			schema: { args: [{
				name: "content",
				rules: [{ type: "rest" }]
			}] }
		}, withAccessFacts(["social"], () => import("./response/companion/accept/res.js")));
		captchaMatch.use({
			path: "升级誓约",
			schema: {
				args: [{
					name: "confirm",
					rules: [{ type: "rest" }]
				}],
				usage: "/升级誓约 [确认]"
			}
		}, withAccessFacts(["social"], () => import("./response/companion/upgradeOath/res.js")));
		captchaMatch.use({
			path: "踢出成员",
			schema: {
				args: [{
					name: "member",
					rules: [{ type: "rest" }]
				}],
				usage: "/踢出成员 <UID|@道友>"
			}
		}, () => import("./response/guild/kickMember/res.js"));
		captchaMatch.use({
			path: "一键学习功法",
			schema: { args: [{
				name: "confirm",
				rules: [{ type: "rest" }]
			}] }
		}, () => import("./response/skillBook/batchLearn/res.js"));
		captchaMatch.use({
			path: "锁定",
			schema: { args: [{
				name: "target",
				rules: [{ type: "rest" }]
			}] }
		}, () => import("./response/storage/lock/res.js"));
		captchaMatch.use({
			path: "解锁",
			schema: { args: [{
				name: "target",
				rules: [{ type: "rest" }]
			}] }
		}, () => import("./response/storage/unlock/res.js"));
		captchaMatch.use([
			"加入灵药师",
			"灵药师指引",
			"继续灵药指引"
		], () => import("./response/profession/joinLingzhi/res.js"));
		captchaMatch.use(["加入锻造师", "学习锻造图纸"], () => import("./response/profession/forge/res.js"));
		for (const path of [
			"打造",
			"确认打造",
			"锻造进阶",
			"委托锻造",
			"确认锻造委托",
			"接取锻造委托",
			"取消锻造委托"
		]) captchaMatch.use({
			path,
			schema: { args: [{
				name: "arguments",
				rules: [{ type: "rest" }]
			}] }
		}, () => import("./response/profession/forge/res.js"));
		captchaMatch.use({
			path: "激活阵盘",
			schema: { args: [{
				name: "name",
				rules: [{
					type: "rest",
					message: "请提供阵盘名称"
				}]
			}] }
		}, () => import("./response/caveFormation/activate/res.js"));
		captchaMatch.use({
			path: "移除阵法",
			schema: { args: [{
				name: "name",
				rules: [{ type: "rest" }]
			}] }
		}, () => import("./response/caveFormation/remove/res.js"));
		captchaMatch.use(["解散宗门"], () => import("./response/guild/dissolveGuild/res.js"));
		captchaMatch.use(["退出宗门"], () => import("./response/guild/leaveGuild/res.js"));
		captchaMatch.use(["取消退出宗门"], () => import("./response/guild/cancelLeave/res.js"));
		captchaMatch.use(["弹劾宗主"], () => import("./response/guild/impeachLeader/res.js"));
		captchaMatch.use(["宗主请假"], () => import("./response/guild/leaderLeave/res.js"));
		captchaMatch.use(["解散队伍"], () => import("./response/team/disbandTeam/res.js"));
		captchaMatch.use(["离开队伍"], () => import("./response/team/leaveTeam/res.js"));
		captchaMatch.use(["取消匹配"], () => import("./response/teamMatch/cancel/res.js"));
		captchaMatch.use(["申请出师"], () => import("./response/master/graduateApply/res.js"));
		captchaMatch.use(["叛离师门"], () => import("./response/master/rebel/res.js"));
		captchaMatch.use(["登仙台签到"], () => import("./response/signIn/celestial/res.js"));
		captchaMatch.use(["活动签到"], () => import("./response/limitedEvent/checkin/res.js"));
		captchaMatch.use(["日常签到"], () => import("./response/signIn/daily/res.js"));
		captchaMatch.use({
			path: "每日机缘",
			description: "在机器人 master 开启的群内抽取每日机缘，每个角色每天一次。"
		}, () => import("./response/dailyFortune/res.js"));
		captchaMatch.use({
			path: "今日机缘",
			description: "在机器人 master 开启的群内抽取每日机缘，每个角色每天一次。"
		}, () => import("./response/dailyFortune/res.js"));
		captchaMatch.use(["新人签到"], () => import("./response/signIn/newcomer/res.js"));
		captchaMatch.use(["初入仙途签到", "新人狂欢签到"], () => import("./response/activity/newcomerLoginClaim/res.js"));
		captchaMatch.use("拒绝道侣", withAccessFacts(["social"], () => import("./response/companion/reject/res.js")));
		captchaMatch.use("同意拜师", () => import("./response/master/accept/res.js"));
		captchaMatch.use("同意出师", () => import("./response/master/graduateAccept/res.js"));
		captchaMatch.use("拒绝出师", () => import("./response/master/graduateReject/res.js"));
		captchaMatch.use("一键传功", () => import("./response/master/teachAll/res.js"));
		captchaMatch.use(["一键赐福", "一键赐丹"], () => import("./response/master/supportAll/res.js"));
		captchaMatch.use({
			path: "传功",
			schema: {
				args: [{
					name: "target",
					rules: [{ type: "rest" }]
				}],
				usage: "/传功 <徒弟UID|@道友>"
			}
		}, () => import("./response/master/teach/res.js"));
		captchaMatch.use({
			path: "赐福",
			schema: {
				args: [{
					name: "target",
					rules: [{ type: "rest" }]
				}],
				usage: "/赐福 <徒弟UID|@道友>"
			}
		}, () => import("./response/master/bless/res.js"));
		captchaMatch.use("创建队伍", () => import("./response/team/createTeam/res.js"));
		captchaMatch.use({
			path: "加入队伍",
			schema: { args: [{
				name: "teamId",
				rules: [{ type: "rest" }]
			}] }
		}, () => import("./response/team/joinTeam/res.js"));
		captchaMatch.use({
			path: "匹配主线",
			schema: {
				args: [{
					name: "章节关卡",
					rules: [{ type: "rest" }]
				}],
				usage: "/匹配主线 <章节号-关卡号>"
			}
		}, () => import("./response/teamMatch/startMainline/res.js"));
		captchaMatch.use({
			path: "匹配秘境",
			schema: { args: [{
				name: "dungeonId",
				rules: [{ type: "rest" }]
			}] }
		}, () => import("./response/teamMatch/startDungeon/res.js"));
		{
			const seclusion = captchaMatch.group({});
			seclusion.use("打劫记录", () => import("./response/robberyRecord/res.js"));
			seclusion.use("可打劫道友", () => import("./response/pkTargets/res.js"));
			seclusion.use("隐藏物品", () => import("./response/pkHiding/res.js"));
			seclusion.use("设置隐藏", () => import("./response/pkHide/res.js"));
			seclusion.use("争夺历史", () => import("./response/pkHistory/res.js"));
			seclusion.use("争夺战报", () => import("./response/pkReport/res.js"));
			seclusion.use("争夺回放", () => import("./response/pkReplay/res.js"));
			seclusion.use("购买", () => import("./response/shop/buy/res.js"));
			seclusion.use("领取凶兽奖励", () => import("./response/worldBoss/claim/res.js"));
			seclusion.use("新人任务领取", () => import("./response/activity/newcomerTaskClaim/res.js"));
			seclusion.use("挑战排名", () => import("./response/ranking/challengeRank/res.js"));
			seclusion.use(["登天挑战", "天骄挑战"], () => import("./response/tianjiao/challenge/res.js"));
			seclusion.use("领取宝箱", () => import("./response/storyline/claimChest/res.js"));
			seclusion.use("一键领取宝箱", () => import("./response/storyline/claimAllChests/res.js"));
			seclusion.use("妖塔选buff", () => import("./response/demonTower/buff/res.js"));
			seclusion.use(alchemyRoutes, () => import("./response/alchemy/v2/res.js"));
			seclusion.use({
				path: "点赞人气",
				schema: {
					args: [{
						name: "content",
						rules: [{ type: "rest" }]
					}],
					usage: "/点赞人气 <UID|@道友> <榜单标识>"
				}
			}, () => import("./response/leaderboard/popularity/like/res.js"));
			seclusion.use(["宗门挖矿", "宗门采矿"], () => import("./response/guild/mining/res.js"));
			seclusion.use("切换神通", () => import("./response/skillBook/switch/res.js").then((m) => ({ default: m.switchMysticSkill })));
			seclusion.use("切换战技", () => import("./response/skillBook/switch/res.js").then((m) => ({ default: m.switchBattleSkill })));
			seclusion.use("切换被动技", () => import("./response/skillBook/switch/res.js").then((m) => ({ default: m.switchPassiveSkill })));
			seclusion.use("兑换码", () => import("./response/redeemCode/res.js"));
			seclusion.use(["礼包码", "礼品码"], () => import("./response/redeemCode/claim/res.js"));
			seclusion.use("领取邀请奖励", () => import("./response/referral/claimReward/res.js"));
			seclusion.use(["回归奖励", "回归签到"], () => import("./response/comeback/native/res.js"));
			seclusion.use("领取回归奖励", () => import("./response/comeback/nativeClaim/res.js"));
			seclusion.use("绑定邀请码", () => import("./response/referral/bindCode/res.js"));
			seclusion.use({
				path: "探索秘境",
				schema: {
					args: [{
						name: "content",
						rules: [{ type: "rest" }]
					}],
					usage: "/探索秘境 [秘境名] [时长]"
				}
			}, () => import("./response/seclusion/info/res.js"));
			seclusion.use([
				"战斗模板",
				"保存战斗模板",
				"应用战斗模板",
				"删除战斗模板"
			], withAccessFacts(["social"], () => import("./response/battleTemplate/res.js")));
			seclusion.use("道侣签到", () => import("./response/companion/claimDaily/res.js"));
			seclusion.use("道侣月卡", () => import("./response/companion/claimMonthCard/res.js"));
			seclusion.use("道侣任务", () => import("./response/companion/dailyTask/res.js"));
			seclusion.use("道侣商店兑换", () => import("./response/companion/shopBuy/res.js"));
			seclusion.use("选购", () => import("./response/market/confirmBuy/res.js"));
			seclusion.use({
				path: "逛店",
				schema: {
					args: [{
						name: "content",
						rules: [{ type: "rest" }]
					}],
					usage: "/逛店 <UID|@道友> [页码]"
				}
			}, () => import("./response/shop/playerShop/visit/res.js"));
			seclusion.use("交易上架", () => import("./response/market/sell/res.js"));
			seclusion.use("交易下架", () => import("./response/market/cancel/res.js"));
			seclusion.use("命名店铺", () => import("./response/shop/playerShop/rename/res.js"));
			seclusion.use("店铺简介", () => import("./response/shop/playerShop/description/res.js"));
			seclusion.use([
				"消耗",
				"服用",
				"炼化"
			], () => import("./response/consume/res.js"));
			seclusion.use("小绿瓶存储", () => import("./response/greenBottle/store/res.js"));
			seclusion.use("开启礼盒", () => import("./response/lootbox/open/res.js"));
			seclusion.use("创建宗门", () => import("./response/guild/createGuild/res.js"));
			seclusion.use("分解功法", () => import("./response/skillBook/decompose/res.js"));
			seclusion.use("分解装备", () => import("./response/equipment/decompose/res.js"));
			seclusion.use("一键分解装备", () => import("./response/equipment/batchDecompose/res.js"));
			seclusion.use([
				"出关",
				"打坐结束",
				"结束打坐"
			], () => import("./response/meditation/end/res.js"));
			seclusion.use("领取日常活跃奖励", () => import("./response/activityPoints/claimDaily/res.js"));
			seclusion.use(["领取全部日常活跃奖励", "一键领取日常活跃奖励"], () => import("./response/activityPoints/claimAll/res.js"));
			seclusion.use("双修", withAccessFacts(["social"], () => import("./response/companion/dualCultivation/res.js")));
			seclusion.use([
				"月卡领取",
				"月卡签到",
				"一键领取",
				"一键领取月卡"
			], () => import("./response/monthCard/claim/res.js"));
			seclusion.use("经络", () => import("./response/meditation/meridian/res.js"));
			seclusion.use("一键分解功法", () => import("./response/skillBook/batchDecompose/res.js"));
			seclusion.use(["闭关加速", "打坐加速"], () => import("./response/meditation/start/res.js"));
			seclusion.use("打坐", () => import("./response/meditation/start/res.js"));
			seclusion.use({
				path: "闭关",
				schema: {
					args: [{
						name: "content",
						rules: [{ type: "rest" }]
					}],
					usage: "/闭关"
				}
			}, () => import("./response/meditation/start/res.js"));
			seclusion.use(["返程", "结束探索"], withAccessFacts(["realm"], () => import("./response/seclusion/end/res.js")));
			seclusion.use("确认培元丹", () => import("./response/peiyuanDan/confirm/res.js"));
			seclusion.use("取消培元丹", () => import("./response/peiyuanDan/cancel/res.js"));
			seclusion.use("确认明悟丹", () => import("./response/mingwudan/confirm/res.js"));
			seclusion.use("升级功法", () => import("./response/skillBook/batchUpgrade/res.js"));
			seclusion.use("重制功法", () => import("./response/skillBook/reset/res.js"));
			seclusion.use(["确认重制功法", "取消重制功法"], () => import("./response/skillBook/reset/res.js"));
			seclusion.use("换词", () => import("./response/skillBook/reroll/res.js"));
			seclusion.use(["确认换词"], () => import("./response/skillBook/reroll/res.js"));
			seclusion.use(["取消换词"], () => import("./response/skillBook/reroll/res.js"));
			seclusion.use("悟道", () => import("./response/skillBook/wudao/res.js"));
			seclusion.use("卸下", () => import("./response/equipment/unequipItem/res.js"));
			seclusion.use("换下战技", () => import("./response/skillBook/unequip/res.js").then((m) => ({ default: m.unequipBattleSkill })));
			seclusion.use("换下被动技", () => import("./response/skillBook/unequip/res.js").then((m) => ({ default: m.unequipPassiveSkill })));
			seclusion.use("换下神通", () => import("./response/skillBook/unequip/res.js").then((m) => ({ default: m.unequipMysticSkill })));
			seclusion.use("分离", () => import("./response/soulArtifact/unequip/res.js"));
			seclusion.use("本命物升级", () => import("./response/soulArtifact/upgrade/res.js"));
			seclusion.use("本命物升品", () => import("./response/soulArtifact/gradeUp/res.js"));
			seclusion.use("本命物洗涤", () => import("./response/soulArtifact/wash/res.js"));
			seclusion.use(["确认本命物洗涤"], () => import("./response/soulArtifact/washConfirm/res.js"));
			seclusion.use(["取消本命物洗涤"], () => import("./response/soulArtifact/washCancel/res.js"));
			seclusion.use("领取首通奖励", () => import("./response/ranking/claimFirst/res.js"));
			seclusion.use("领取月度奖励", () => import("./response/ranking/claimMonthly/res.js"));
			seclusion.use("妖塔重置", () => import("./response/demonTower/reset/res.js"));
			seclusion.use("领取周常活跃奖励", () => import("./response/activityPoints/claimWeekly/res.js"));
			seclusion.use(["领取全部周常活跃奖励", "一键领取周常活跃奖励"], () => import("./response/activityPoints/claimAll/res.js"));
			seclusion.use(["一键领取邮件"], () => import("./response/email/receiveAllEmail/res.js"));
			seclusion.use(["一键删除邮件"], () => import("./response/email/deleteAllEmail/res.js"));
			seclusion.use("领取邮件", () => import("./response/email/receiveEmail/res.js"));
			seclusion.use("删除邮件", () => import("./response/email/deleteEmail/res.js"));
			seclusion.use(["一键领取成就", "成就 一键领取"], withAccessFacts(["social"], () => import("./response/achievements/claimAll/res.js")));
			seclusion.use("新人返利领取", () => import("./response/recharge/newcomerClaim/res.js"));
			seclusion.use("周周返利领取", () => import("./response/recharge/weeklyRebateClaim/res.js"));
			seclusion.use(["里程碑", "世界里程碑"], withAccessFacts(["realm"], () => import("./response/recharge/milestone/res.js")));
			seclusion.use("配置秘境模式", () => import("./response/message/config/mode/res.js"));
			seclusion.use("配置闭关自动加速", () => import("./response/message/config/meditationAutoBoost/res.js"));
			seclusion.use("配置组队精力", () => import("./response/message/config/energy/res.js"));
			seclusion.use("配置好友自动审批进队", () => import("./response/message/config/friendAutoApprove/res.js"));
			seclusion.use("配置接受队伍邀请", () => import("./response/message/config/teamInviteEnabled/res.js"));
			seclusion.use("配置自动同意队伍邀请", () => import("./response/message/config/autoAcceptInvite/res.js"));
			seclusion.use("配置信息隐藏", () => import("./response/message/config/hideProfile/res.js"));
			seclusion.use(["配置灵晶确认", "配置道晶确认"], () => import("./response/message/config/confirmThreshold/res.js"));
			seclusion.use("领取宗门俸禄", () => import("./response/guild/stipend/res.js"));
			seclusion.use(["领取宗门日活奖励", "领取宗门周活奖励"], () => import("./response/guild/claimMilestone/res.js"));
			seclusion.use([
				"领取全部宗门日活奖励",
				"领取全部宗门周活奖励",
				"一键领取宗门日活奖励",
				"一键领取宗门周活奖励"
			], () => import("./response/guild/claimAllMilestones/res.js"));
			seclusion.use("发红包", () => import("./response/guild/sendRedPacket/res.js"));
			seclusion.use("领红包", () => import("./response/guild/claimRedPacket/res.js"));
			seclusion.use("回收红包", () => import("./response/guild/recycleRedPacket/res.js"));
			seclusion.use("提升宗门等级", () => import("./response/guild/upgradeLevel/res.js"));
			seclusion.use("提升宗门灵脉", () => import("./response/guild/upgradeVein/res.js"));
			seclusion.use("提升宗门商店", () => import("./response/guild/upgradeShop/res.js"));
			seclusion.use("宗门商店兑换", () => import("./response/guild/exchange/res.js"));
			seclusion.use(["灵脉攻防战领取奖励", "秘境攻防领取奖励"], () => import("./response/guildSecretRealmWar/claim/res.js"));
			seclusion.use("宗门大比报名", () => import("./response/guildCompetition/apply/res.js"));
			seclusion.use({
				path: "添加宗门大比成员",
				schema: {
					args: [{
						name: "content",
						rules: [{ type: "rest" }]
					}],
					usage: "/添加宗门大比成员 [UID|@道友] [位置]"
				}
			}, () => import("./response/guildCompetition/addMember/res.js"));
			seclusion.use("移除宗门大比成员", () => import("./response/guildCompetition/removeMember/res.js"));
			seclusion.use("调整宗门大比位置", () => import("./response/guildCompetition/adjustPosition/res.js"));
			seclusion.use("清空宗门大比队伍", () => import("./response/guildCompetition/clearTeam/res.js"));
			seclusion.use("押注宗门大比", () => import("./response/guildCompetition/bet/res.js"));
			seclusion.use("追投宗门大比", () => import("./response/guildCompetition/followBet/res.js"));
			seclusion.use("领取宗门大比奖励", () => import("./response/guildCompetition/claimReward/res.js"));
			seclusion.use([
				{
					path: "发飞信",
					schema: {
						args: [{
							name: "content",
							rules: [{ type: "rest" }]
						}],
						usage: "/发飞信 <好友UID|@道友> <内容>"
					}
				},
				"发师门飞信",
				"发宗门飞信",
				"发队伍飞信",
				"发道侣飞信"
			], () => import("./response/flyMail/send/res.js"));
			seclusion.use([{
				path: "飞信禁言",
				schema: {
					args: [{
						name: "target",
						rules: [{ type: "rest" }]
					}],
					usage: "/飞信禁言 <UID|@道友>"
				}
			}, {
				path: "飞信解除",
				schema: {
					args: [{
						name: "target",
						rules: [{ type: "rest" }]
					}],
					usage: "/飞信解除 <UID|@道友>"
				}
			}], () => import("./response/flyMail/mute/res.js"));
			seclusion.use("活动任务领取", () => import("./response/limitedEvent/taskClaim/res.js"));
			{
				const meditation = seclusion.group({});
				meditation.use("主线挑战", () => import("./response/storyline/challenge/res.js"));
				meditation.use("主线扫荡", () => import("./response/storyline/sweep/res.js"));
				meditation.use("妖塔挑战", () => import("./response/demonTower/challenge/res.js"));
				meditation.use("挑战凶兽", () => import("./response/worldBoss/challenge/res.js"));
				meditation.use("秘境挑战", () => import("./response/dungeon/enter/res.js"));
				meditation.use(["一键挑战", "连续爬塔"], () => import("./response/ranking/batchChallenge/res.js"));
				meditation.use(["扫荡秘境", "扫荡免费秘境"], () => import("./response/dungeon/sweep/res.js"));
				meditation.use("扫荡排名", () => import("./response/ranking/sweepLower/res.js"));
				meditation.use([
					{
						path: "比试",
						schema: {
							args: [{
								name: "target",
								rules: [{ type: "rest" }]
							}],
							usage: "/比试 <UID|@道友>"
						},
						description: "与指定目标进行比试，支持直接输入 UID，或通过 @ 自动识别对方。"
					},
					"切磋",
					"比斗",
					"十连比试"
				], () => import("./response/spar/res.js"));
				meditation.use("挑战稻草人", () => import("./response/scarecrow/res.js"));
				meditation.use(["灵脉攻防战挑战", "秘境攻防挑战"], () => import("./response/guildSecretRealmWar/challenge/res.js"));
				meditation.use("挑战宗门", () => import("./response/guildCompetition/challenge/res.js"));
				meditation.use({
					path: "打劫",
					schema: {
						args: [{
							name: "target",
							rules: [{ type: "rest" }]
						}],
						usage: "/打劫 <UID|@道友>"
					},
					description: "对指定目标发起打劫，支持直接输入 UID，或通过 @ 自动识别对方。"
				}, () => import("./response/robbery/res.js"));
				meditation.use({
					path: "三连打劫",
					schema: {
						args: [{
							name: "target",
							rules: [{ type: "rest" }]
						}],
						usage: "/三连打劫 <UID|@道友>"
					},
					description: "对指定目标连续打劫最多三次，按每次实际结算消耗元力，条件不足时停止。"
				}, () => import("./response/robbery/triple/res.js"));
				meditation.use("回击", () => import("./response/counterAttack/res.js"));
				meditation.use("接赏", () => import("./response/bounty/accept/res.js"));
				meditation.use("继续接赏", () => import("./response/bounty/challenge/res.js"));
				meditation.use("妖塔扫荡", () => import("./response/demonTower/sweep/res.js"));
			}
		}
	}
}
app.res({ events: [...commandEvents] }, () => import("./response/mwTaskContinuation.js"));
app.res({ events: [...commandEvents] }, () => import("./response/mwBusinessFallback.js"));
/** @deprecated Legacy diagnostics only; the active middleware never matches routes or sends stage flags. */
function resolveCommandTransportProfile(_event) {
	return {
		checkMute: false,
		playerEntry: false,
		trackOperation: false
	};
}
const matchesGameCommand = (event) => app.match(event).matched;
var router_default = app.define;

//#endregion
export { router_default as default, matchesGameCommand, resolveCommandTransportProfile };