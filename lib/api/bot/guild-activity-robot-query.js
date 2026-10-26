import { parseGuildMining } from "./guild-mining.js";
import { parseGuildWorship } from "./guild-worship-stipend.js";

//#region src/api/bot/guild-activity-robot-query.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("宗门活动响应不完整");
	return value;
}
function parseGuildWorshipGuide(value) {
	const row = record(value);
	if (typeof row.dailyWorshipDone !== "boolean" || typeof row.canWorship !== "boolean" || typeof row.introText !== "string" || typeof row.noticeText !== "string" || !Array.isArray(row.offers)) throw new Error("祭祀祖师引导响应不完整");
	const offers = row.offers.map((value) => {
		const offer = record(value);
		if (![
			"灵石",
			"灵晶",
			"道晶"
		].includes(offer.name) || ![
			offer.cost,
			offer.activity,
			offer.contribution
		].every((value) => typeof value === "number" && Number.isFinite(value)) || typeof offer.line !== "string" || typeof offer.canWorship !== "boolean") throw new Error("祭祀祖师引导响应不完整");
		return {
			name: offer.name,
			cost: offer.cost,
			activity: offer.activity,
			contribution: offer.contribution,
			line: offer.line,
			canWorship: offer.canWorship
		};
	});
	return {
		dailyWorshipDone: row.dailyWorshipDone,
		canWorship: row.canWorship,
		introText: row.introText,
		noticeText: row.noticeText,
		offers
	};
}
function parseRobotGuildWorship(value) {
	const row = record(value);
	if (row.code === "GUIDE") return {
		code: "GUIDE",
		data: parseGuildWorshipGuide(row.data)
	};
	if (row.code !== "OK") throw new Error("祭祀祖师响应不完整");
	return {
		code: "OK",
		data: parseGuildWorship(row.data)
	};
}
function parseRobotGuildMining(value) {
	const row = record(value);
	const receipt = parseGuildMining(row.receipt);
	if (typeof row.message !== "string" || !row.message) throw new Error("宗门采矿响应不完整");
	return {
		message: row.message,
		outcome: receipt.outcome
	};
}

//#endregion
export { parseGuildWorshipGuide, parseRobotGuildMining, parseRobotGuildWorship };