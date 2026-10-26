import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";
import { parseNonNegativeIssuedRewards } from "../schemas/issued-reward.js";

//#region src/api/bot/celestial-checkin.ts
async function claimBackendCelestialCheckIn(bid, uid, request, repeatCommand) {
	if (!bid) throw new Error("登仙台签到缺少平台身份");
	return parseCelestialCheckIn(await requestBackend(bid, "post_players_id_check_ins_scope_with_ritual", {
		path: {
			id: uid,
			scope: "celestial"
		},
		headers: repeatPresentationHeaders(repeatCommand),
		...writeContext(request)
	}));
}
function parseCelestialCheckIn(data) {
	if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("登仙台签到响应不完整");
	const row = data;
	if (!Array.isArray(row.signedSlots) || !row.signedSlots.every((value) => typeof value === "string") || !Array.isArray(row.issued)) throw new Error("登仙台签到响应不完整");
	return {
		ritualText: typeof row.ritualText === "string" ? row.ritualText : "",
		signedSlots: row.signedSlots,
		issued: parseNonNegativeIssuedRewards(row.issued, "登仙台签到响应不完整").map(({ name, amount }) => ({
			name,
			amount
		}))
	};
}

//#endregion
export { claimBackendCelestialCheckIn, parseCelestialCheckIn };