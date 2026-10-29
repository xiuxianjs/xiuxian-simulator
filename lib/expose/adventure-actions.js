import { boolean, fields, integer, list, number, object, text } from "./schema.js";
import { mutation, observation } from "./mutation.js";
import { parseBackendDungeonDetail } from "../api/bot/queries.js";
import { parseRobotDungeonChallenge } from "../api/bot/dungeon-challenge-robot-query.js";
import { parseDungeonFreeSweep, parseDungeonSweep } from "../api/bot/dungeon-sweep.js";
import { parseStorylineSweepBusiness } from "../api/bot/storyline-sweep.js";
import { parseStorylineAllChestClaim, parseStorylineChapterChestClaim } from "../api/bot/storyline-chest-claim.js";
import { ExposeError } from "alemonjs";

//#region src/expose/adventure-actions.ts
const positive = {
	type: "integer",
	minimum: 1,
	maximum: Number.MAX_SAFE_INTEGER
};
const dungeonName = {
	type: "string",
	minLength: 1
};
const reward = object({
	...fields(text, "category name"),
	amount: integer
});
const sweep = object({
	dungeonName: text,
	...fields(integer, "times totalSpiritCost totalExp"),
	currency: list(reward),
	items: list(reward)
});
const chest = object({
	...fields(integer, "index requiredStars reward"),
	claimed: boolean,
	unlocked: boolean
});
const chapterChests = object({
	success: boolean,
	message: text,
	...fields(integer, "chapterNumber totalReward"),
	claimedIndexes: list(integer),
	chests: list(chest)
});
const sweepCommand = (input) => `/主线扫荡 ${input.chapterNumber}-${input.stageNumber} ${input.times}`;
function checkedChapter(data, chapterNumber) {
	const result = parseStorylineChapterChestClaim(data);
	if (result.chapterNumber !== chapterNumber) throw new Error("主线宝箱返回章节不匹配");
	return result;
}
const adventureActions = {
	get_dungeon_detail: observation("查询指定秘境的次数、精力与宗门贡献消耗、队伍要求、掉落和首通奖励；不发起挑战。", "dungeon.detail", object({ dungeonName }), object({
		...fields(integer, "id spiritCost guildContributionCost minPlayers usedToday dailyLimit freeUsed freeLimit freeRemaining expReward"),
		...fields(text, "name typeLabel realmLimit"),
		...fields(boolean, "isSingle hasCleared inTeam"),
		currencyDrops: list(object({
			...fields(text, "code name"),
			amount: integer
		})),
		skillDrops: list(object({
			...fields(text, "category name"),
			...fields(integer, "itemId amount probability")
		})),
		materialDrops: list(object({
			...fields(text, "category name"),
			...fields(integer, "itemId amount probability")
		})),
		firstClearReward: object({ parts: list(text) }),
		outputMultiplier: number,
		outputAddPct: number
	}, [
		"firstClearReward",
		"outputMultiplier",
		"outputAddPct"
	]), (input) => `/秘境详情 ${input.dungeonName}`, (data) => {
		const row = data;
		if (row?.outcome !== "result") throw new Error("秘境详情回执不完整");
		return parseBackendDungeonDetail(row.data);
	}, (input) => ({ name: input.dungeonName })),
	challenge_dungeon: mutation("挑战指定秘境；队伍、资格、精力及各成员奖励由服务端决定。检查 won 和 rewardsByUser，胜利不代表所有队员都获得奖励。", "dungeon.challenge", object({ dungeonName }), object({
		...fields(integer, "dungeonId experienceGained spiritStoneGained"),
		won: boolean,
		logId: text,
		battle: object({
			winner: {
				type: "string",
				enum: [
					"A",
					"B",
					"draw"
				]
			},
			rounds: integer
		}),
		drops: list(object({
			category: text,
			amount: integer,
			currencyCode: text,
			itemId: integer
		}, ["currencyCode", "itemId"])),
		rewardsByUser: list(object({
			...fields(integer, "userId spiritCostPaid experienceGained"),
			eligible: boolean,
			noRewardReason: text,
			currency: list(reward),
			items: list(reward),
			firstClear: list(reward)
		}, ["noRewardReason", "firstClear"]))
	}, ["logId"]), (input) => `/秘境挑战 ${input.dungeonName}`, (data) => {
		const result = parseRobotDungeonChallenge(data);
		if (result.outcome !== "result") throw new Error("秘境挑战未返回结算回执");
		return result.data;
	}, (input) => ({
		mode: "challenge",
		dungeonName: input.dungeonName
	})),
	sweep_dungeon: mutation("扫荡指定秘境 1、5 或 10 次，服务端检查通关资格、次数和精力。返回实际消耗及奖励。", "dungeon.sweep", object({
		dungeonName,
		times: {
			type: "integer",
			minimum: 1,
			maximum: 10,
			description: "仅接受 1、5、10"
		}
	}), sweep, (input) => `/扫荡秘境 ${input.dungeonName} ${input.times}`, (data) => {
		const row = data;
		if (row?.outcome !== "result") throw new Error("秘境扫荡未返回结算回执");
		return parseDungeonSweep(row.data);
	}, (input) => ({
		mode: "sweep",
		dungeonName: input.dungeonName,
		times: input.times
	}), (input) => {
		if (![
			1,
			5,
			10
		].includes(input.times)) throw new ExposeError("INVALID_INPUT", "秘境扫荡次数仅支持 1、5、10");
	}),
	sweep_free_dungeons: mutation("扫荡服务端判定可免费扫荡的秘境，可能部分成功；核对 sweptDungeons、skippedDungeons 及实际精力消耗，不自动重试未完成项目。", "dungeon.sweep-free", object({}), object({
		sweptDungeons: list(sweep),
		skippedDungeons: list(object({
			dungeonName: text,
			message: text
		})),
		...fields(integer, "totalTimes totalExp totalSpiritCost")
	}), () => "/扫荡免费秘境", parseDungeonFreeSweep),
	sweep_storyline: mutation("扫荡指定主线章节关卡；关卡 1..4，次数 1..9999。服务端校验条件和消耗，totalBonusExp 是有符号修为调整，可能为负。", "storyline.sweep", object({
		chapterNumber: positive,
		stageNumber: {
			type: "integer",
			minimum: 1,
			maximum: 4
		},
		times: {
			type: "integer",
			minimum: 1,
			maximum: 9999
		}
	}), object({
		chapterNumber: integer,
		stageNumber: integer,
		result: object({
			stageLabel: text,
			...fields(integer, "times totalSpiritCost totalExp totalSpiritStone totalBonusExp"),
			expBonusText: text,
			allItemsGained: list(object({
				itemId: integer,
				amount: integer,
				name: text
			}))
		})
	}), sweepCommand, (data, input) => {
		const result = parseStorylineSweepBusiness(data);
		if (result.ignored || result.chapterNumber !== input.chapterNumber || result.stageNumber !== input.stageNumber) throw new Error("主线扫荡回执关卡不匹配");
		return result;
	}, (input) => ({ input: sweepCommand(input) })),
	claim_storyline_chest: mutation("领取指定主线章节的一只宝箱；编号取章节查询结果，由服务端校验星数和领取状态。", "storyline.chests-claim", object({
		chapterNumber: positive,
		chestIndex: positive
	}), chapterChests, (input) => `/领取宝箱 ${input.chapterNumber} ${input.chestIndex}`, (data, input) => checkedChapter(data, input.chapterNumber), (input) => ({ input: `/领取宝箱 ${input.chapterNumber} ${input.chestIndex}` })),
	claim_storyline_chapter_chests: mutation("领取指定章节全部可领取宝箱，返回实际领取序号、奖励及剩余宝箱状态。", "storyline.chests-claim", object({ chapterNumber: positive }), chapterChests, (input) => `/领取宝箱 ${input.chapterNumber}`, (data, input) => checkedChapter(data, input.chapterNumber), (input) => ({ input: `/领取宝箱 ${input.chapterNumber}` })),
	claim_all_storyline_chests: mutation("领取全部章节中可领取的主线宝箱，返回实际章节明细、领取数量与奖励合计。", "storyline.chests-claim-all", object({}), object({
		success: boolean,
		message: text,
		...fields(integer, "totalReward claimedCount"),
		details: list(object({
			chapterNumber: integer,
			chapterName: text,
			claimed: list(integer),
			reward: integer
		}))
	}), () => "/一键领取宝箱", parseStorylineAllChestClaim)
};

//#endregion
export { adventureActions };