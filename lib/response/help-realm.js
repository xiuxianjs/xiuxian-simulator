import { buildBubble } from "./presentation/bubble.js";
import "./presentation/index.js";

//#region src/response/help-realm.ts
const stages = [
	"凡人",
	"炼气",
	"筑基",
	"金丹",
	"元婴",
	"化神",
	"洞虚",
	"合体",
	"大乘",
	"仙",
	"金仙",
	"道祖"
];
function helpRealmName(value) {
	const name = value.replace(/^「|」$/gu, "").trim().replace(/^练气/u, "炼气");
	return /^(?:凡人|炼气(?:(?:[一二三四五六七八九]|十[一二]?)层)?|(?:筑基|金丹|元婴|化神|洞虚|合体|大乘)(?:期|初期|中期|后期|圆满)?|仙|地仙|天仙|真仙|金仙|大罗金仙|道祖)$/u.test(name) ? name : void 0;
}
function helpRealmStage(name) {
	if (name === "大罗金仙") return "金仙";
	return stages.find((stage) => name.startsWith(stage)) ?? "仙";
}
function realmHelpBubble(context, realm, next) {
	const stage = helpRealmStage(realm);
	const tier = stages.indexOf(stage);
	const layer = [
		"一",
		"二",
		"三",
		"四",
		"五",
		"六",
		"七",
		"八",
		"九",
		"十",
		"十一",
		"十二"
	].indexOf(realm.slice(2, -1)) + 1;
	const unlocked = (minLayer) => tier > 1 || tier === 1 && layer >= minLayer;
	const earlyStage = tier === 1 && layer === 2 ? {
		command: "我的师门",
		question: "师门今天还能做什么",
		step: "打开我的师门。还没拜师时先找境界高于自己的道友，已有师父时查看能用的传功和赐丹。",
		resource: "先领主线宝箱。单人打不过秘境时，到队伍列表找符合该秘境条件的队伍。"
	} : tier === 1 && layer === 3 ? {
		command: "交易所",
		question: "缺的材料哪里能买",
		step: "先在我的境界核对缺哪种材料、缺几个，再到交易所按物品搜索并比较单价。",
		resource: "通关主线后先查宝箱。材料也可先查秘境掉落，确定缺口后再买。"
	} : void 0;
	const artifactAdvice = tier >= 8 ? "如果已炼化本命物，先看仙器升品所缺材料。" : tier >= 6 ? "如果背包已有灵宝，先比较当前本命物和灵宝，再决定是否切换。" : "";
	const power = artifactAdvice || (tier >= 4 ? "先查神魂、道途与当前炼化的本命物，按材料缺口推进。主线卡关时仍可检查装备与功法。" : tier === 3 ? "查看本命物升级和升品条件，材料不足时可继续培养经络、功法和装备。" : tier === 2 ? "先看真气和冲脉次数，有合适的本命物再查看炼化条件。主线与功法仍可继续推进。" : tier === 1 ? "主线积累修为，秘境补功法和材料。卡关时先检查突破条件与装备功法。" : "创建角色后按引导走，打开「我的境界」查看进入炼气所需修为。");
	const resources = earlyStage?.resource ?? (tier >= 2 ? "先看能领的主线宝箱，再按所缺材料选秘境或灵田。妖塔积分可用于对应商店兑换。" : unlocked(9) ? "按目标丹方核对材料与工具，缺料时先看灵田、秘境或交易所。" : unlocked(7) ? "检查灵田是否成熟，按当前缺料选种。主线宝箱和秘境材料也可继续获取。" : unlocked(5) ? "查通天塔资格，所得声望可用于兑换装备。主线宝箱和签到奖励仍可领取。" : unlocked(4) ? "加入宗门后可查看日常和贡献兑换，也可继续领取主线宝箱和签到奖励。" : tier === 1 ? "优先查看签到、新人目标和主线宝箱，再按秘境资格补材料。" : "注册后可从签到和新人目标获取起步资源。");
	const materialTopic = tier >= 4 ? "神魂和道途怎么提升" : tier === 3 ? "本命物怎么提升" : tier === 2 ? "今天还能冲几次脉" : unlocked(9) ? "这炉丹还缺什么" : unlocked(7) ? "灵田该收还是该种" : unlocked(5) ? "通天塔和声望怎么用" : unlocked(4) ? "宗门今天还能做什么" : tier === 1 ? "主线接下来打哪关" : "今天有什么奖励能领";
	const prepare = tier >= 4 ? "元婴神魂" : tier === 3 ? "我的本命物" : tier === 2 ? "经络" : unlocked(9) ? "炼丹 丹方" : unlocked(7) ? "我的灵田" : unlocked(5) ? "查看通天塔" : unlocked(4) ? "宗门列表" : tier === 1 ? "查看主线" : "踏入仙途";
	const firstStep = tier >= 4 ? "打开元婴神魂，先看温养与补给条件，再决定是否推进道途。" : tier === 3 ? "打开我的本命物，先看已炼化的本命物，再查升级或升品缺料。" : tier === 2 ? "打开经络，先核对真气和剩余次数，再选当前可冲的经络。" : unlocked(9) ? "打开炼丹丹方，选要炼的丹药，按缺料清单准备后再预览炼制。" : unlocked(7) ? "先完成灵药师引导。打开我的灵田，空地选种播种，成熟后收获。" : unlocked(5) ? "打开通天塔，核对开放状态、次数和消耗。拿到声望后到声望商店看可换装备。" : unlocked(4) ? "先查看宗门列表并申请加入，入宗后从我的宗门查看日常和贡献用途。" : tier === 1 ? "打开查看主线，先选当前可挑战的关卡。通关后看章节宝箱是否可领。" : "先用踏入仙途创建角色，按引导完成起步任务。";
	return buildBubble({
		...context,
		title: "修仙帮助 · " + realm,
		bar: false,
		sections: [...next ? [{
			title: "当前下一步",
			lines: ["说明：" + next.text],
			actions: [next.action]
		}] : [], {
			title: "本境界怎么玩",
			lines: [
				"说明：" + (earlyStage?.step ?? firstStep),
				"战力：" + power,
				"奖励：" + resources
			],
			actions: [
				...artifactAdvice ? [{
					label: "我的本命物",
					command: "/我的本命物"
				}] : [],
				...prepare === "我的灵田" ? [{
					label: "灵药师引导",
					command: "/加入灵药师"
				}] : [],
				{
					label: (earlyStage?.command ?? prepare).replace(/^查看/u, ""),
					command: "/" + (earlyStage?.command ?? prepare)
				}
			]
		}],
		footer: [[{
			label: "我的进度",
			command: "/帮助"
		}, {
			label: "查看天书",
			command: tier === 0 ? "/天书" : "/天书 " + stage
		}], [{
			label: earlyStage?.question ?? materialTopic,
			command: "/帮助 " + (earlyStage?.question ?? materialTopic)
		}, {
			label: "我离突破还有多远",
			command: "/帮助 我离突破还有多远"
		}]]
	});
}

//#endregion
export { helpRealmName, helpRealmStage, realmHelpBubble };