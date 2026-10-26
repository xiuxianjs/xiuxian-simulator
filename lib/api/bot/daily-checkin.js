import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";
import { parsePositiveIssuedRewards } from "../schemas/issued-reward.js";

//#region src/api/bot/daily-checkin.ts
async function dailyBackendCheckIn(bid, uid, request, repeatCommand) {
	return parseDailyCheckIn(await requestBackend(bid, "post_players_id_check_ins_scope_with_ritual", {
		path: {
			id: uid,
			scope: "daily"
		},
		headers: repeatPresentationHeaders(repeatCommand),
		...writeContext(request)
	}));
}
function parseDailyCheckIn(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("日常签到响应不完整");
	const row = value;
	if (typeof row.accumulatedDays !== "number" || !Number.isSafeInteger(row.accumulatedDays) || row.accumulatedDays < 1 || !Array.isArray(row.issued)) throw new Error("日常签到响应不完整");
	const issued = parsePositiveIssuedRewards(row.issued, "日常签到响应不完整").map(({ name, amount }) => ({
		name,
		amount
	}));
	const title = row.titleReward;
	let titleMessage;
	if (title !== void 0 && title !== null) {
		if (typeof title !== "object" || Array.isArray(title) || typeof title.message !== "string") throw new Error("日常签到称号响应不完整");
		titleMessage = title.message;
	}
	return {
		...row.dateIssued !== void 0 && row.accumulatedIssued !== void 0 ? {
			dateIssued: parsePositiveIssuedRewards(row.dateIssued, "日期奖励响应不完整"),
			accumulatedIssued: parsePositiveIssuedRewards(row.accumulatedIssued, "累计奖励响应不完整")
		} : {},
		progressText: typeof row.progressText === "string" ? row.progressText : void 0,
		titleMessage,
		ritualText: typeof row.ritualText === "string" ? row.ritualText : "",
		accumulatedDays: Number(row.accumulatedDays),
		issued
	};
}
async function newcomerBackendCheckIn(bid, uid, request, repeatCommand) {
	return parseNewcomerCheckIn(await requestBackend(bid, "post_players_id_check_ins_scope_with_ritual", {
		path: {
			id: uid,
			scope: "newcomer"
		},
		headers: repeatPresentationHeaders(repeatCommand),
		...writeContext(request)
	}));
}
function parseNewcomerCheckIn(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("新人签到响应不完整");
	const row = value;
	if (typeof row.accumulatedDays !== "number" || !Number.isSafeInteger(row.accumulatedDays) || row.accumulatedDays < 1 || typeof row.expireDate !== "string" || !Array.isArray(row.issued)) throw new Error("新人签到响应不完整");
	const issued = parsePositiveIssuedRewards(row.issued, "新人签到响应不完整").map(({ name, amount }) => ({
		name,
		amount
	}));
	return {
		ritualText: typeof row.ritualText === "string" ? row.ritualText : "",
		accumulatedDays: Number(row.accumulatedDays),
		expireDate: row.expireDate,
		issued
	};
}

//#endregion
export { dailyBackendCheckIn, newcomerBackendCheckIn, parseDailyCheckIn, parseNewcomerCheckIn };