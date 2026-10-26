import { parseSoulChooseResult } from "./soul-path-choose.js";
import { parseSoulActionResult } from "./soul-path-action.js";

//#region src/api/bot/soul-confirm-business.ts
function parseSoulConfirm(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("神魂确认响应不完整");
	const data = value;
	if (data.mode === "choose") return {
		mode: "choose",
		result: parseSoulChooseResult(data.result)
	};
	if (data.mode === "action") return {
		mode: "action",
		result: parseSoulActionResult(data.result)
	};
	throw new Error("神魂确认响应不完整");
}

//#endregion
export { parseSoulConfirm };