import { MSG_COMPANION } from "../constants/messages.js";
import "../constants/index.js";

//#region src/utils/companionQueryPresentation.ts
function presentCompanionInfo(result) {
	if (!result.access.canUseFifthLayerFeature) return {
		code: "ACCESS_DENIED",
		data: { realmName: result.access.realmName ?? "未知" }
	};
	if (!result.companion) {
		if (!result.noCompanionMessage) throw new Error("道侣接口缺少空态信息");
		return {
			code: "NO_COMPANION",
			data: { message: result.noCompanionMessage }
		};
	}
	const info = result.companion;
	return {
		code: "OK",
		data: {
			...info,
			partnerName: info.displayPartnerName,
			partnerRealm: info.displayPartnerRealm
		}
	};
}
function presentCompanionTasks(info, args) {
	if (!info.access.canUseFifthLayerFeature) return {
		code: "LOCKED",
		data: { realmName: info.access.realmName ?? "未知" }
	};
	if (!info.hasCompanion) return {
		code: "NO_COMPANION",
		data: { message: "你当前没有道侣，无法查看道侣任务" }
	};
	if (args.startsWith("领取")) return {
		code: "AUTO_CLAIM_HINT",
		data: { message: MSG_COMPANION.TASK_AUTO_CLAIM_HINT }
	};
	const tasks = info.tasks;
	const names = {
		dual_cultivation: "双修",
		dungeon: "一起秘境",
		gift: "赠送道具",
		care_farm: "照料灵田"
	};
	return {
		code: "OK",
		data: { tasks: tasks.map((t, index) => ({
			index: index + 1,
			name: names[t.taskType],
			rewardDesc: t.rewardAmounts.map((amount) => `+${amount}`).join("/"),
			completedCount: t.completedCount,
			dailyLimit: t.limit,
			earnedTongxin: t.earnedTongxin
		})) }
	};
}

//#endregion
export { presentCompanionInfo, presentCompanionTasks };