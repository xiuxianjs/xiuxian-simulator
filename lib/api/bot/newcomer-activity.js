//#region src/api/bot/newcomer-activity.ts
/** v2 success only contains the committed reward summary, including zero values. */
function parseRobotNewcomerTaskReward(value) {
	const data = value;
	if (!data || !Number.isSafeInteger(data.spiritCrystal) || !Number.isSafeInteger(data.vipExpYuan)) throw new Error("新人任务领奖响应不完整");
	return {
		spiritCrystal: data.spiritCrystal,
		vipExpYuan: data.vipExpYuan
	};
}

//#endregion
export { parseRobotNewcomerTaskReward };