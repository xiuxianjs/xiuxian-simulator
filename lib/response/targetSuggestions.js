import { isPrivateEvent } from "../utils/privateEvent.js";
import { listBubble } from "./presentation/presets.js";
import "./presentation/index.js";

//#region src/response/targetSuggestions.ts
function parseTargetSuggestions(value, parseResult) {
	if (typeof value !== "object" || value === null || !("targetSuggestions" in value)) return {
		mode: "result",
		result: parseResult(value)
	};
	const ids = value.targetSuggestions;
	const reason = "reason" in value ? value.reason : void 0;
	if (!Array.isArray(ids) || ids.length > 5 || !ids.every((uid) => typeof uid === "number" && Number.isSafeInteger(uid) && uid > 0) || new Set(ids).size !== ids.length || reason !== void 0 && typeof reason !== "string") throw new Error("修士列表响应无效");
	return {
		mode: "suggestions",
		ids,
		reason
	};
}
function targetSuggestionsBubble(event, command, ids, reason, position) {
	const team = command === "队伍踢出" || command === "转让队长" || command === "队伍位置设置";
	const friend = command === "删除好友";
	const cave = command === "查看灵田";
	const title = friend ? "当前好友" : team ? "当前队员" : cave ? "附近的灵田" : command === "邀请入队" ? "附近可邀请的修士" : command === "拜师" ? "附近可拜师的修士" : "附近的修士";
	const item = friend ? "好友" : team ? "队员" : cave ? "灵田主人" : "修士";
	return listBubble({
		title,
		bid: event.UserId,
		isPrivate: isPrivateEvent(event),
		items: ids.length ? ids.map((uid) => ({
			title: item,
			id: uid,
			lines: [],
			actions: [{
				label: command,
				command: `/${command} ${uid}${position === void 0 ? "" : ` ${position}`}`
			}]
		})) : [{ lines: [reason ? `状态：${reason}` : friend ? "结果：暂无可选好友。" : team ? "结果：暂无可选队员。" : cave ? "结果：附近暂无可访问的灵田。" : "结果：附近暂无可选的修士。"] }]
	});
}

//#endregion
export { parseTargetSuggestions, targetSuggestionsBubble };