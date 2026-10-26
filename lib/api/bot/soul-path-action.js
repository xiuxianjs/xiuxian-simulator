import { requestBackend, writeContext } from "./client.js";
import { parseSoulPathReceipt } from "../schemas/soul-path-receipt.js";

//#region src/api/bot/soul-path-action.ts
const row = (value, message) => {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(message);
	return value;
};
const integer = (value) => typeof value === "number" && Number.isSafeInteger(value);
async function previewBackendSoulPathAction(bid, uid, action, target, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseSoulActionPreview(await requestBackend(bid, "post_players_id_soul_path_action_preview", {
		path: { id: uid },
		body: {
			action,
			...action === "switch" ? { pathKey: target } : {}
		},
		...writeContext(request)
	}));
}
function parseSoulActionPreview(data) {
	const value = row(data, "道途操作预览响应不完整");
	if (typeof value.token !== "string" || !/^[0-9a-f-]{36}$/.test(value.token) || typeof value.message !== "string") throw new Error("道途操作预览响应不完整");
	return {
		token: value.token,
		message: value.message
	};
}
async function confirmBackendSoulPathAction(bid, uid, token, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseSoulActionResult(await requestBackend(bid, "post_players_id_soul_path_action_confirm", {
		path: { id: uid },
		body: { token },
		...writeContext(request)
	}));
}
function parseSoulActionResult(data) {
	const value = row(data, "道途操作确认响应不完整");
	if (value.action !== "switch" && value.action !== "advance" && value.action !== "reroll") throw new Error("道途操作确认响应不完整");
	if (value.action === "reroll") {
		const nurture = row(value.nurture, "神魂重选响应不完整");
		if (typeof nurture.direction !== "string" || typeof nurture.directionName !== "string" || typeof nurture.tier !== "string" || typeof nurture.tierName !== "string" || !integer(nurture.stabilityBefore) || !integer(nurture.stabilityAfter) || !integer(nurture.insightGained) || !integer(nurture.proficiencyGained) || !Array.isArray(nurture.extraItems)) throw new Error("神魂重选响应不完整");
		return {
			action: value.action,
			nurture: {
				direction: nurture.direction,
				directionName: nurture.directionName,
				tier: nurture.tier,
				tierName: nurture.tierName,
				stabilityBefore: nurture.stabilityBefore,
				stabilityAfter: nurture.stabilityAfter,
				insightGained: nurture.insightGained,
				proficiencyGained: nurture.proficiencyGained,
				extraItems: nurture.extraItems.map((item) => {
					const fact = row(item, "神魂重选响应不完整");
					const quantity = fact.quantity;
					if (typeof fact.name !== "string" || typeof quantity !== "number" || !Number.isSafeInteger(quantity)) throw new Error("神魂重选响应不完整");
					return {
						name: fact.name,
						quantity
					};
				})
			}
		};
	}
	return {
		action: value.action,
		path: parseSoulPathReceipt(value.path, "道途操作确认响应不完整")
	};
}

//#endregion
export { confirmBackendSoulPathAction, parseSoulActionPreview, parseSoulActionResult, previewBackendSoulPathAction };