import { getEventCatalog, reportCatalogReuse } from "./catalog-query-reuse.js";
import { requestBackend } from "./client.js";
import { getCurrentEvent } from "alemonjs";

//#region src/api/bot/storyline-catalog-queries.ts
function object(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("主线目录接口数据不完整");
	return value;
}
function numbers(row, keys) {
	if (keys.some((key) => typeof row[key] !== "number" || !Number.isFinite(row[key]))) throw new Error("主线目录接口数值不完整");
}
function texts(row, keys) {
	if (keys.some((key) => typeof row[key] !== "string")) throw new Error("主线目录接口文本不完整");
}
function bools(row, keys) {
	if (keys.some((key) => typeof row[key] !== "boolean")) throw new Error("主线目录接口状态不完整");
}
function list(value) {
	if (!Array.isArray(value)) throw new Error("主线目录接口列表不完整");
	return value.map(object);
}
async function getBackendStorylineCatalog(bid, uid, chapterNumber, page) {
	if (!bid) throw new Error("查询缺少平台身份");
	const inline = getEventCatalog(getCurrentEvent(), bid, uid, {
		kind: "storyline",
		args: {
			chapterNumber,
			page: Math.max(1, page)
		}
	});
	if (inline !== void 0) try {
		const decoded = decodeStorylineCatalog(inline, chapterNumber);
		reportCatalogReuse(getCurrentEvent(), "storyline");
		return decoded;
	} catch {
		reportCatalogReuse(getCurrentEvent(), "storyline", "invalid_inline_payload");
	}
	return decodeStorylineCatalog(await requestBackend(bid, "get_players_id_storyline_catalog", {
		path: { id: uid },
		query: {
			...chapterNumber === null ? {} : { chapterNumber },
			page: Math.max(1, page)
		}
	}), chapterNumber);
}
function decodeStorylineCatalog(value, chapterNumber) {
	const data = object(value);
	numbers(data, ["mentalValue"]);
	bools(data, [
		"canUseMeridian",
		"canUseSecondLayerFeature",
		"inTeam"
	]);
	if (chapterNumber === null) {
		if (data.detail !== null) throw new Error("主线目录模式不一致");
		const overview = object(data.overview);
		numbers(overview, [
			"totalClaimableChests",
			"currentPage",
			"totalPages",
			"totalCount",
			"milestoneTotalStars",
			"milestoneTotal",
			"milestoneClaimed",
			"milestoneClaimable"
		]);
		texts(overview, ["achievementLabel"]);
		bools(overview, ["showClaimAllChests"]);
		for (const ch of list(overview.chapters)) {
			texts(ch, [
				"name",
				"arc",
				"starsText",
				"progressText",
				"chestIcon"
			]);
			numbers(ch, [
				"chapterNumber",
				"totalStars",
				"maxStars",
				"clearedCount",
				"stageCount",
				"claimableChestCount"
			]);
		}
	} else {
		if (data.overview !== null) throw new Error("主线目录模式不一致");
		const detail = object(data.detail);
		if (typeof detail.status !== "string" || ![
			"OK",
			"NOT_FOUND",
			"LOCKED",
			"NO_STAGES"
		].includes(detail.status)) throw new Error("章节状态无效");
		texts(detail, [
			"chapterName",
			"arc",
			"statusMessage"
		]);
		numbers(detail, [
			"chapterNumber",
			"totalStars",
			"maxStars",
			"canClaimChestCount",
			"maxChapterNumber"
		]);
		bools(detail, [
			"eliteStagesCleared",
			"showPrevChapter",
			"showNextChapter"
		]);
		for (const chest of list(detail.chests)) {
			numbers(chest, [
				"index",
				"requiredStars",
				"reward"
			]);
			bools(chest, ["claimed", "unlocked"]);
		}
		for (const stage of list(detail.stages)) {
			texts(stage, [
				"stageLabel",
				"monsterDisplayName",
				"rewardText",
				"starsDisplay"
			]);
			numbers(stage, [
				"id",
				"stageNumber",
				"spiritCost",
				"expReward",
				"spiritStoneReward",
				"bestStars",
				"dailyUsed",
				"dailyLimit",
				"maxSweepTimes"
			]);
			bools(stage, [
				"isElite",
				"canSweep",
				"showBulkSweep",
				"canMatch"
			]);
			if (stage.monsterName !== null && typeof stage.monsterName !== "string") throw new Error("关卡NPC名称无效");
			for (const drop of list(stage.drops)) {
				texts(drop, ["category"]);
				numbers(drop, ["amount", "probability"]);
				if (drop.itemId !== null) numbers(drop, ["itemId"]);
				for (const key of ["currencyType", "itemName"]) if (drop[key] !== null && typeof drop[key] !== "string") throw new Error("掉落名称无效");
			}
		}
	}
	return data;
}
/** Pure projection of the original list App; no API or event cache access. */
function projectStorylineCatalog(value) {
	const raw = object(value);
	const chapterNumber = raw.detail === null ? null : object(raw.detail).chapterNumber;
	if (chapterNumber !== null && (typeof chapterNumber !== "number" || !Number.isSafeInteger(chapterNumber) || chapterNumber < 0)) throw new Error("主线目录模式不一致");
	const data = decodeStorylineCatalog(value, chapterNumber);
	const access = {
		canUseMeridian: data.canUseMeridian,
		canUseSecondLayerFeature: data.canUseSecondLayerFeature,
		inTeam: data.inTeam
	};
	if (data.overview) {
		const { chapters, ...overview } = data.overview;
		const arcOrder = [...new Set(chapters.map((chapter) => chapter.arc))];
		return {
			code: "OVERVIEW",
			access,
			data: {
				...overview,
				mentalValue: data.mentalValue,
				arcs: arcOrder.map((arc) => ({
					arc,
					chapters: chapters.filter((chapter) => chapter.arc === arc)
				}))
			}
		};
	}
	const detail = data.detail;
	if (detail.status !== "OK") throw new Error("主线目录业务分支无效");
	return {
		code: "DETAIL",
		access,
		data: {
			...detail,
			mentalValue: data.mentalValue,
			stages: detail.stages
		}
	};
}

//#endregion
export { decodeStorylineCatalog, getBackendStorylineCatalog, projectStorylineCatalog };