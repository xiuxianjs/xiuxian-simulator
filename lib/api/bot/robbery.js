import { requestBackend, writeContext } from "./client.js";
import { parsePKReceipt } from "./pk-receipt.js";

//#region src/api/bot/robbery.ts
const isSafeCount = (value) => typeof value === "number" && Number.isSafeInteger(value);
async function robBackend(bid, uid, targetUid, request) {
	if (!bid) throw new Error("打劫缺少平台身份");
	return parseBackendRobbery(await requestBackend(bid, "post_robbery_playerId_targetId", {
		path: {
			playerId: uid,
			targetId: targetUid
		},
		body: {},
		...writeContext(request)
	}));
}
function parseBackendRobbery(result) {
	if (typeof result !== "object" || result === null) throw new Error("服务端打劫回执缺少有效次数或元力信息");
	const receipt = result;
	if (!isSafeCount(receipt.qiCost) || !isSafeCount(receipt.remaining) || !isSafeCount(receipt.dailyMax) || receipt.qiCost < 0 || receipt.remaining < 0 || receipt.dailyMax <= 0 || receipt.remaining > receipt.dailyMax || typeof receipt.bonusText !== "string" || typeof receipt.losingStreakText !== "string") throw new Error("服务端打劫回执缺少有效次数或元力信息");
	parsePKReceipt(receipt);
	return result;
}

//#endregion
export { parseBackendRobbery, robBackend };