import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/storyline-chest-claim.ts
function row(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("主线宝箱响应不完整");
	return value;
}
function positiveInteger(value) {
	return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
function numberList(value) {
	if (!Array.isArray(value) || value.some((item) => !positiveInteger(item))) throw new Error("主线宝箱序号响应不完整");
	return value;
}
function chests(value) {
	if (!Array.isArray(value)) throw new Error("主线宝箱状态响应不完整");
	return value.map((value) => {
		const item = row(value);
		if (!positiveInteger(item.index) || !positiveInteger(item.requiredStars) || !positiveInteger(item.reward) || typeof item.claimed !== "boolean" || typeof item.unlocked !== "boolean") throw new Error("主线宝箱状态字段不完整");
		return {
			index: item.index,
			requiredStars: item.requiredStars,
			reward: item.reward,
			claimed: item.claimed,
			unlocked: item.unlocked
		};
	});
}
function parseStorylineChapterChestClaim(value) {
	const item = row(value);
	if (typeof item.success !== "boolean" || typeof item.message !== "string" || !positiveInteger(item.chapterNumber) || !positiveInteger(item.totalReward)) throw new Error("主线章节宝箱响应不完整");
	return {
		success: item.success,
		message: item.message,
		chapterNumber: item.chapterNumber,
		claimedIndexes: numberList(item.claimedIndexes),
		totalReward: item.totalReward,
		chests: chests(item.chests)
	};
}
function parseStorylineAllChestClaim(value) {
	const item = row(value);
	if (typeof item.success !== "boolean" || typeof item.message !== "string" || !positiveInteger(item.totalReward) || !positiveInteger(item.claimedCount) || !Array.isArray(item.details)) throw new Error("主线全章节宝箱响应不完整");
	const details = item.details.map((value) => {
		const detail = row(value);
		if (!positiveInteger(detail.chapterNumber) || typeof detail.chapterName !== "string" || !positiveInteger(detail.reward)) throw new Error("主线全章节宝箱明细不完整");
		return {
			chapterNumber: detail.chapterNumber,
			chapterName: detail.chapterName,
			claimed: numberList(detail.claimed),
			reward: detail.reward
		};
	});
	if (details.reduce((sum, detail) => sum + detail.claimed.length, 0) !== item.claimedCount) throw new Error("主线全章节宝箱计数不一致");
	return {
		success: item.success,
		message: item.message,
		totalReward: item.totalReward,
		claimedCount: item.claimedCount,
		details
	};
}
function requireParams(bid, uid) {
	if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0) throw new Error("主线宝箱操作参数无效");
}
async function claimBackendStorylineChest(bid, uid, chapterNumber, chestIndex, request) {
	requireParams(bid, uid);
	return parseStorylineChapterChestClaim(await requestBackend(bid, "post_players_id_storyline_chapters_chapterNumber_chests_chestIndex_claim", {
		path: {
			id: uid,
			chapterNumber,
			chestIndex
		},
		headers: repeatPresentationHeaders("领取宝箱"),
		...writeContext(request)
	}));
}
async function claimAllBackendChapterChests(bid, uid, chapterNumber, request) {
	requireParams(bid, uid);
	return parseStorylineChapterChestClaim(await requestBackend(bid, "post_players_id_storyline_chapters_chapterNumber_chests_claim_all", {
		path: {
			id: uid,
			chapterNumber
		},
		headers: repeatPresentationHeaders("领取宝箱"),
		...writeContext(request)
	}));
}
async function claimAllBackendStorylineChests(bid, uid, request) {
	requireParams(bid, uid);
	return parseStorylineAllChestClaim(await requestBackend(bid, "post_players_id_storyline_chests_claim_all", {
		path: { id: uid },
		headers: repeatPresentationHeaders("一键领取宝箱"),
		...writeContext(request)
	}));
}

//#endregion
export { claimAllBackendChapterChests, claimAllBackendStorylineChests, claimBackendStorylineChest, parseStorylineAllChestClaim, parseStorylineChapterChestClaim };