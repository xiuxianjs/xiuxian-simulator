//#region src/api/bot/competition-reward-robot-query.ts
function parseRobotCompetitionReward(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("宗门大比领奖响应不完整");
	const row = value;
	const receipt = row.receipt;
	if (typeof row.message !== "string" || !receipt || Array.isArray(receipt) || receipt.code !== "SPIRIT_CRYSTAL" || !Number.isInteger(receipt.changeAmount) || Number(receipt.changeAmount) <= 0 || !Number.isInteger(receipt.beforeAmount) || !Number.isInteger(receipt.afterAmount) || typeof receipt.detail !== "string") throw new Error("宗门大比领奖响应不完整");
	return {
		message: row.message,
		receipt
	};
}

//#endregion
export { parseRobotCompetitionReward };