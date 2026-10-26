import { parseCheckInHub } from "./checkin-hub.js";

//#region src/api/bot/checkin-robot-query.ts
function parseRobotNewcomerLogin(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("新人登录领奖响应不完整");
	const row = value;
	if (row.code === "ALL_CLAIMED" || row.code === "NO_CLAIMABLE") return { code: row.code };
	if (row.code !== "OK" || !row.data || typeof row.data !== "object" || Array.isArray(row.data)) throw new Error("新人登录领奖响应不完整");
	const d = row.data;
	if (typeof d.claimDay !== "number" || !Number.isSafeInteger(d.claimDay) || d.claimDay < 1 || d.claimDay > 7 || typeof d.spiritCrystal !== "number" || !Number.isSafeInteger(d.spiritCrystal) || d.spiritCrystal < 0 || !Array.isArray(d.grantedItems) || !d.grantedItems.every((v) => typeof v === "string")) throw new Error("新人登录领奖响应不完整");
	return {
		code: "OK",
		data: {
			claimDay: d.claimDay,
			spiritCrystal: d.spiritCrystal,
			grantedItems: d.grantedItems
		}
	};
}

//#endregion
export { parseCheckInHub, parseRobotNewcomerLogin };