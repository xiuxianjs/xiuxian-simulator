import { parsePositiveIssuedRewards } from "../schemas/issued-reward.js";

//#region src/api/bot/first-recharge-claim.ts
function parseRobotFirstRechargeClaim(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("首充领取响应不完整");
	const row = value;
	if (typeof row.tierYuan !== "number" || !Number.isFinite(row.tierYuan) || row.tierYuan <= 0) throw new Error("首充领取响应不完整");
	return {
		tierYuan: row.tierYuan,
		issued: parsePositiveIssuedRewards(row.issued === null ? [] : row.issued, "首充领取响应不完整")
	};
}

//#endregion
export { parseRobotFirstRechargeClaim };