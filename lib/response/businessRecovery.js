import { achievementRecoveryTips } from "./achievementRecovery.js";
import { adventureRecoveryTips } from "./adventureRecovery.js";
import { bountyRecoveryTips } from "./bountyRecovery.js";
import { professionRecoveryTips } from "./professionRecovery.js";
import { cultivationRecoveryTips } from "./cultivationRecovery.js";
import { caveRecoveryTips } from "./caveRecovery.js";
import { guildRecoveryTips } from "./guildRecovery.js";
import { marketRecoveryTips } from "./marketRecovery.js";
import { teamRecoveryTips } from "./teamRecovery.js";
import { teamMatchRecoveryTips } from "./teamMatchRecovery.js";
import { friendRecoveryTips } from "./friendRecovery.js";
import { masterRecoveryTips } from "./masterRecovery.js";
import { titleRecoveryTips } from "./titleRecovery.js";
import { giftCodeRecoveryTips } from "./giftCodeRecovery.js";
import { emailRecoveryTips } from "./emailRecovery.js";
import { referralRecoveryTips } from "./referralRecovery.js";
import { lootboxRecoveryTips } from "./lootboxRecovery.js";
import { equipmentRecoveryTips } from "./equipmentRecovery.js";
import { storageLockRecoveryTips } from "./storageLockRecovery.js";
import { storageBagRecoveryTips } from "./storageBagRecovery.js";
import { detailRecoveryTips } from "./detailRecovery.js";
import { leaderboardRecoveryTips } from "./leaderboardRecovery.js";
import { popularityRecoveryTips } from "./popularityRecovery.js";
import { skillResetRecoveryTips } from "./skillResetRecovery.js";
import { skillRerollRecoveryTips } from "./skillRerollRecovery.js";
import { soulWashRecoveryTips } from "./soulWashRecovery.js";
import { soulCultivationRecoveryTips } from "./soulCultivationRecovery.js";
import { skillSwitchRecoveryTips } from "./skillSwitchRecovery.js";
import { consumeRecoveryTips } from "./consumeRecovery.js";
import { pillConfirmationRecoveryTips } from "./pillConfirmationRecovery.js";
import { skillInventoryRecoveryTips } from "./skillInventoryRecovery.js";
import { soulPathRecoveryTips } from "./soulPathRecovery.js";

//#region src/response/businessRecovery.ts
const realmGrowthTips = () => [
	{
		label: "查看当前进度",
		command: "/我的信息",
		description: "核对当前境界、修为和精力，先确认阻塞发生在境界门槛还是资源消耗"
	},
	{
		label: "优先推进主线",
		command: "/查看主线",
		description: "挑战主线获取修为；已三星通关的关卡可在满足精力等条件时扫荡，先查看关卡奖励与消耗"
	},
	{
		label: "核对突破条件",
		command: "/我的境界",
		description: "核对当前修为和所需材料，满足条件后再突破；小境界到顶时按面板查看晋级条件"
	},
	{
		label: "离线前闭关",
		command: "/闭关",
		description: "暂时不打关卡时闭关积累真气与修为，回来后出关领取，再继续推进主线"
	}
];
/** Navigation only; the original refusal remains authoritative. */
function withBusinessRecovery(operation, reply) {
	if (operation === "alchemy.v2") {
		const buttons = [...reply.buttons];
		const command = /请先完成炼丹师入门/.test(reply.text) ? "/炼丹 入门" : "/炼丹";
		if (!buttons.some((button) => button.command === command)) buttons.push({
			label: command.endsWith("入门") ? "加入炼丹师" : "返回炼丹",
			command
		});
		const recovery = /材料|锁定/.test(reply.text) ? {
			label: "查看材料",
			command: "/储物袋 材料 草药"
		} : /天工|丹火|丹炉/.test(reply.text) ? {
			label: "调整天工",
			command: "/炼丹 天工"
		} : /预览|丹方|炉数|规则已更新/.test(reply.text) ? {
			label: "重新选择丹方",
			command: "/炼丹 丹方"
		} : void 0;
		if (recovery && !buttons.some((button) => button.command === recovery.command)) buttons.unshift(recovery);
		return {
			...reply,
			buttons
		};
	}
	if (operation.startsWith("membership.") || operation.startsWith("recharge.") || operation.startsWith("normal.payment-") || operation.startsWith("world-milestones.")) {
		const buttons = [...reply.buttons];
		for (const button of [{
			label: "返回权益",
			command: "/我的权益"
		}, {
			label: "我的订单",
			command: "/我的订单"
		}]) if (!buttons.some((existing) => existing.command === button.command)) buttons.push(button);
		return {
			...reply,
			buttons
		};
	}
	if ([
		"soul-artifacts.upgrade",
		"soul-artifacts.grade-upgrade",
		"soul-artifacts.unequip",
		"skill-books.switch"
	].includes(operation)) {
		const text = reply.rawLines?.join("\n") ?? reply.text;
		const advice = [...reply.advice];
		const tips = /金丹及以上方可|需达到.+后开放|境界不足|等级.*已达.*上限/.test(text) ? realmGrowthTips() : operation === "skill-books.switch" ? skillSwitchRecoveryTips(text) : soulCultivationRecoveryTips(operation, text);
		for (const tip of tips) if (!advice.some((existing) => existing.command === tip.command)) advice.push({
			command: tip.command,
			description: `${tip.label}：${tip.description}`
		});
		return {
			...reply,
			...reply.rawLines ? {
				rawLines: void 0,
				blocks: void 0,
				text
			} : {},
			advice
		};
	}
	if (operation === "skill-books.reset" || operation === "skill-books.reroll" || /^soul-artifacts\.wash(?:-confirm|-cancel)?$/.test(operation)) {
		const text = reply.rawLines?.join("\n") ?? reply.text;
		const advice = [...reply.advice];
		const tips = operation === "skill-books.reset" ? skillResetRecoveryTips(text) : operation === "skill-books.reroll" ? skillRerollRecoveryTips(text) : /金丹及以上方可洗涤|需达到.+后开放|境界不足/.test(text) ? realmGrowthTips() : soulWashRecoveryTips(text);
		for (const tip of tips) if (!advice.some((existing) => existing.command === tip.command)) advice.push({
			command: tip.command,
			description: `${tip.label}：${tip.description}`
		});
		return {
			...reply,
			...reply.rawLines ? {
				rawLines: void 0,
				blocks: void 0,
				text
			} : {},
			advice
		};
	}
	if (reply.rawLines || reply.advice.length) return reply;
	const text = reply.text;
	if (operation === "dungeon.sweep-free" && text.includes("\n")) {
		const advice = text.split("\n").filter(Boolean).flatMap((line) => withBusinessRecovery("dungeon.sweep", {
			...reply,
			text: line,
			advice: []
		}).advice.map((tip) => ({
			...tip,
			description: `${line}；${tip.description}`
		})));
		return advice.length ? {
			...reply,
			advice
		} : reply;
	}
	const adventureTips = adventureRecoveryTips(operation, text);
	const professionTips = professionRecoveryTips(operation, text);
	const cultivationTips = cultivationRecoveryTips(operation, text);
	const detailTips = detailRecoveryTips(operation, text);
	const leaderboardTips = leaderboardRecoveryTips(operation, text);
	const popularityTips = popularityRecoveryTips(operation, text);
	const achievementTips = achievementRecoveryTips(operation, text);
	const bountyTips = bountyRecoveryTips(operation, text);
	const caveTips = caveRecoveryTips(operation, text);
	const guildTips = guildRecoveryTips(operation, text);
	const marketTips = marketRecoveryTips(operation, text);
	const teamTips = teamRecoveryTips(operation, text);
	const teamMatchTips = teamMatchRecoveryTips(operation, text);
	const friendTips = friendRecoveryTips(operation, text);
	const masterTips = masterRecoveryTips(operation, text);
	const titleTips = titleRecoveryTips(operation, text);
	const giftCodeTips = giftCodeRecoveryTips(operation, text);
	const emailTips = emailRecoveryTips(operation, text);
	const referralTips = referralRecoveryTips(operation, text);
	const lootboxTips = lootboxRecoveryTips(operation, text);
	const equipmentTips = equipmentRecoveryTips(operation, text);
	const storageLockTips = storageLockRecoveryTips(operation, text);
	const storageBagTips = storageBagRecoveryTips(operation, text);
	let tips = [];
	if (operation.startsWith("black-box.")) tips = [{
		label: "查看本人记录",
		command: "/黑盒记录",
		description: "私聊核对预约、报价与结算结果"
	}, {
		label: "查看今日排期",
		command: "/黑盒排期",
		description: "查看场次与拍品线索"
	}];
	else if (/更高境界尚未开放|当前最高开放境界|境界已达版本上限/.test(text)) tips = [{
		label: "查看当前境界",
		command: "/我的境界",
		description: "当前为版本开放上限，继续积累修为不能开放更高境界；按当前已开放内容安排修行"
	}];
	else if (adventureTips.length) tips = adventureTips;
	else if (/^cave\.(?:view|visit|nearby|logs)$/.test(operation) && /尚未开始灵药师指引|灵药师尚未入门/.test(text)) tips = [...professionTips, ...caveTips];
	else if (professionTips.length) tips = professionTips;
	else if (bountyTips.length) tips = bountyTips;
	else if (achievementTips.length) tips = achievementTips;
	else if (popularityTips.length) tips = popularityTips;
	else if (leaderboardTips.length) tips = leaderboardTips;
	else if (detailTips.length) tips = detailTips;
	else if (cultivationTips.length) tips = cultivationTips;
	else if (caveTips.length) tips = caveTips;
	else if (guildTips.length) tips = guildTips;
	else if (marketTips.length) tips = marketTips;
	else if (teamTips.length) tips = teamTips;
	else if (teamMatchTips.length) tips = teamMatchTips;
	else if (friendTips.length) tips = friendTips;
	else if (masterTips.length) tips = masterTips;
	else if (titleTips.length) tips = titleTips;
	else if (giftCodeTips.length) tips = giftCodeTips;
	else if (emailTips.length) tips = emailTips;
	else if (referralTips.length) tips = referralTips;
	else if (lootboxTips.length) tips = lootboxTips;
	else if (equipmentTips.length) tips = equipmentTips;
	else if (storageLockTips.length) tips = storageLockTips;
	else if (storageBagTips.length) tips = storageBagTips;
	else if (/你的境界过低，需达到筑基期|炼气五层及以上方可开启|炼气二层及以上方可拜师|境界不足|境界未达到|境界尚未达到|境界条件未满足|需达到.+后开放|需达到炼气|(?:金丹|筑基|元婴(?:期)?)及以上方可|需要达到炼气|晋升需要达到|委托需要达到|及以上方可查看职业系统/.test(text) || /炼气.+及以上方可使用(?:洞府|灵田)/.test(text) || operation.startsWith("forge.") && /^需要达到/.test(text) || operation === "guild.apply" && /宗门要求最低境界为/.test(text)) tips = realmGrowthTips();
	else if (operation === "items.consume" || operation === "mingwu.confirm") {
		if (/储物袋中没有|储物袋中未找到|数量不足|培元丹不足|明悟丹不足/.test(text)) tips = [
			{
				label: "查看储物袋",
				command: "/储物袋 道具",
				description: "核对持有数量；数量不足时可减少本次用量"
			},
			{
				label: "前往商店",
				command: "/商店 万宝楼",
				description: "查询当前是否出售需要的道具"
			},
			{
				label: "前往珍宝楼",
				command: "/珍宝楼",
				description: "查询其他道友是否上架了需要的道具"
			}
		];
		else if (/未找到.*对应的道具|不是可消耗的道具/.test(text)) tips = [{
			label: "查看储物袋",
			command: "/储物袋 道具",
			description: "核对可用道具的完整名称，再按名称使用"
		}];
		else if (/筑基丹.*炼气/.test(text)) tips = [{
			label: "查看境界",
			command: "/我的信息",
			description: "核对当前境界，满足提示中的服用条件后再使用"
		}];
		else if (/没有装备中的功法|未找到该功法，请确认功法已装备/.test(text)) tips = [{
			label: "前往我的功法",
			command: "/我的功法",
			description: "先查看并装备要参悟的功法，再使用明悟丹"
		}];
		else if (/熟练度.*(60|上限)/.test(text)) tips = [{
			label: "前往我的功法",
			command: "/我的功法",
			description: "查看已装备功法的熟练度；超过明悟丹上限的部分需通过比试提升"
		}];
		else if (/今日明悟丹剩余|还可服用\d+次/.test(text)) tips = [{
			label: "查看丹药",
			command: "/储物袋 道具 丹药",
			description: "按提示中的剩余次数减少本次服用数量"
		}];
		else if (/今日明悟丹使用次数已达上限/.test(text)) tips = [{
			label: "前往我的功法",
			command: "/我的功法",
			description: "今日明悟丹次数已用完，可先查看功法，待次数恢复后再服用"
		}];
		else if (/该丹药最多只能服用/.test(text)) tips = [{
			label: "查看丹药",
			command: "/储物袋 道具 丹药",
			description: "该丹药服用次数已达上限，可查看其他丹药，避免继续购买同种丹药用于服用"
		}];
		else if (/丹方已改为图鉴/.test(text)) tips = [{
			label: "前往丹方",
			command: "/丹方",
			description: "查看当前可用丹方及解锁条件"
		}];
		else if (/本命物已改为直接存储/.test(text)) tips = [{
			label: "查看本命物",
			command: "/储物袋 本命",
			description: "选择本命物后查看和炼化"
		}];
	} else if (operation.startsWith("soul-artifacts.") && /请先炼化本命物/.test(text)) tips = [{
		label: "前往本命物背包",
		command: "/储物袋 本命",
		description: "先选择并炼化本命物，再进行培养"
	}];
	else if (operation.startsWith("soul-artifacts.") && /筑灵石不足/.test(text)) tips = [{
		label: "查看材料",
		command: "/储物袋 材料 其它",
		description: "核对筑灵石持有数量，再选择可负担的升级次数"
	}, {
		label: "前往珍宝楼",
		command: "/珍宝楼",
		description: "查询是否有道友出售筑灵石"
	}];
	else if (operation.startsWith("soul-artifacts.") && /上架中.*请先下架|上架中的本命物/.test(text)) tips = [{
		label: "查看我的上架",
		command: "/我的上架",
		description: "先查看并下架对应本命物，再进行培养"
	}];
	else if (operation.startsWith("soul-artifacts.") && /等级.*已达.*上限/.test(text)) tips = realmGrowthTips();
	else if (operation.startsWith("skill-books.") && /功法经验道具不足/.test(text)) tips = [{
		label: "查看经验材料",
		command: "/储物袋 材料 经验材料",
		description: "核对可用于功法升级的经验道具"
	}, {
		label: "前往珍宝楼",
		command: "/珍宝楼",
		description: "查询是否有需要的经验材料出售"
	}];
	else if (operation.startsWith("skill-books.") && /所有属性已达到上限|使用中的功法不能重制|没有已学习的功法/.test(text)) tips = [{
		label: "前往我的功法",
		command: "/我的功法",
		description: "查看当前功法状态，选择符合操作条件的功法"
	}];
	else if (/尚未加入宗门|还未加入.*宗门/.test(text)) tips = [{
		label: "前往宗门列表",
		command: "/宗门列表",
		description: "查看宗门要求，选择合适的宗门申请加入"
	}];
	else if (operation.startsWith("realm.") && /修为不足/.test(text)) tips = realmGrowthTips();
	else if (operation.startsWith("realm.") && /小境界已达上限|请尝试晋级/.test(text)) tips = [{
		label: "查看晋级条件",
		command: "/我的境界",
		description: "已到当前大境界的小境界上限；先查看晋级材料、修为和渡劫要求，满足后再晋级"
	}];
	else if (operation.startsWith("realm.") && /材料不足/.test(text)) tips = [
		{
			label: "核对境界材料",
			command: "/我的境界",
			description: "先确认缺少的材料名称、需要数量与持有数量"
		},
		{
			label: "查看储物袋",
			command: "/储物袋",
			description: "核对材料所在分类；补足后再查看突破或晋级条件"
		},
		{
			label: "查询珍宝楼",
			command: "/珍宝楼",
			description: "查询其他道友是否出售缺少的材料，不保证当前有货"
		}
	];
	else if (operation.startsWith("alchemy.") && /材料不足/.test(text)) tips = [{
		label: "查看草药",
		command: "/储物袋 材料 草药",
		description: "对照提示核对缺失的炼丹材料"
	}, {
		label: "查看丹方",
		command: "/丹方",
		description: "查看丹方所需材料和当前炼制条件"
	}];
	else if (operation.startsWith("cave.") && /灵种数量不足|灵肥不足/.test(text)) tips = [{
		label: "前往洞府",
		command: "/洞府",
		description: "查看灵田与资源状态，补足提示中的灵种或灵肥后再操作"
	}];
	else if (/^(?:❌\s*)?灵石不足/.test(text)) tips = [{
		label: "查看资产",
		command: "/我的信息",
		description: "核对可用灵石，补足消耗或减少本次操作数量后再尝试"
	}];
	else if (/精力不足/.test(text)) tips = [{
		label: "查看精力丹",
		command: "/储物袋 道具 丹药",
		description: "查看是否持有精力丹，再选择需要的服用数量"
	}];
	else if (/元力不足/.test(text)) tips = [{
		label: "查看元力丹",
		command: "/储物袋 道具 丹药",
		description: "查看是否持有元力丹，再选择需要的服用数量"
	}];
	if (operation === "mingwu.confirm" && /未找到该功法|没有装备中的功法/.test(text)) {
		for (const tip of pillConfirmationRecoveryTips(operation, text)) if (!tips.some((existing) => existing.command === tip.command)) tips.push(tip);
	}
	if (!tips.length) tips = skillInventoryRecoveryTips(operation, text);
	if (!tips.length) tips = soulPathRecoveryTips(operation, text);
	if (!tips.length) tips = pillConfirmationRecoveryTips(operation, text);
	if (!tips.length) tips = consumeRecoveryTips(operation, text);
	if (!tips.length && /^cave\.(?:cultivate|plant|water|worm|weed|harvest|upgrade|accelerate)$/.test(operation)) tips = caveRecoveryTips(operation, "结果未获完整确认");
	if (!tips.length && /^cave\.(?:view|visit|nearby|logs)$/.test(operation)) tips = caveRecoveryTips(operation, "查询结果未获完整确认");
	if (!tips.length) return reply;
	return {
		...reply,
		...(operation.startsWith("storyline.") || operation.startsWith("dungeon.")) && /精力不足/.test(text) ? { buttons: reply.buttons.filter((button) => !/^\/服用 精力丹\s+\d+$/.test(button.command)) } : {},
		advice: tips.map(({ label, command, description }) => ({
			command,
			description: `${label}：${description}`
		}))
	};
}

//#endregion
export { realmGrowthTips, withBusinessRecovery };