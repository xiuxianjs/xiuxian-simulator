import { parseBackendCompanionShopPreview } from "./companion-shop-purchase.js";

//#region src/api/bot/companion-shop-robot.ts
function parseRobotCompanionShopPurchase(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("道侣商店结算响应不完整");
	const data = value;
	if (data.mode === "preview") return {
		mode: "preview",
		...parseBackendCompanionShopPreview(data)
	};
	if (data.mode !== "result" || typeof data.name !== "string" || typeof data.paid !== "string" || ![data.granted, data.buyCount].every((value) => typeof value === "number" && Number.isFinite(value))) throw new Error("道侣商店结算响应不完整");
	return {
		mode: "result",
		name: data.name,
		paid: data.paid,
		granted: data.granted,
		buyCount: data.buyCount
	};
}

//#endregion
export { parseRobotCompanionShopPurchase };