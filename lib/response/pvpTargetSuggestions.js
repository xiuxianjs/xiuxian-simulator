import { isPrivateEvent } from "../utils/privateEvent.js";
import { listBubble } from "./presentation/presets.js";
import "./presentation/index.js";

//#region src/response/pvpTargetSuggestions.ts
function parsePVPTargetSuggestions(value, parseBattle) {
	if (typeof value !== "object" || value === null || !("targetSuggestions" in value)) return {
		mode: "battle",
		battle: parseBattle(value)
	};
	const ids = value.targetSuggestions;
	const reason = "reason" in value ? value.reason : void 0;
	if (!Array.isArray(ids) || ids.length > 5 || !ids.every((uid) => typeof uid === "number" && Number.isSafeInteger(uid) && uid > 0) || new Set(ids).size !== ids.length || reason !== void 0 && typeof reason !== "string") throw new Error("同境界道友列表响应无效");
	return {
		mode: "suggestions",
		ids,
		reason
	};
}
function pvpTargetSuggestionsBubble(event, command, ids, reason) {
	return listBubble({
		title: "同境界道友",
		bid: event.UserId,
		isPrivate: isPrivateEvent(event),
		items: ids.length ? ids.map((uid) => ({
			title: "道友",
			id: uid,
			lines: [],
			actions: [{
				label: command,
				command: `/${command} ${uid}`
			}]
		})) : [{ lines: [reason ? `状态：${reason}` : "结果：暂无可选的同境界道友。"] }]
	});
}

//#endregion
export { parsePVPTargetSuggestions, pvpTargetSuggestionsBubble };