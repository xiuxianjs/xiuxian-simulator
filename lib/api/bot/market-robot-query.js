import { assertMarketPurchasePreview } from "../schemas/market-trade.js";
import { parseBackendMarketBrowse } from "./market-browse-query.js";

//#region src/api/bot/market-robot-query.ts
function parseRobotMarketBrowse(value, expected) {
	if (!value || typeof value !== "object" || Array.isArray(value) || !("view" in value) || value.view !== expected) throw new Error("珍宝楼浏览响应不完整");
	if (expected === "guide") {
		const balance = "spiritsCrystal" in value ? value.spiritsCrystal : void 0;
		if (balance !== null && (typeof balance !== "number" || !Number.isSafeInteger(balance))) throw new Error("货币余额响应不完整");
		return {
			view: "guide",
			spiritsCrystal: balance
		};
	}
	return {
		...parseBackendMarketBrowse(value),
		view: "browse"
	};
}
function parseRobotMarketMessage(value) {
	if (!value || typeof value !== "object" || Array.isArray(value) || !("message" in value) || typeof value.message !== "string") throw new Error("市场操作响应不完整");
	return { message: value.message };
}
function parseRobotMarketPurchase(value) {
	if (value && typeof value === "object" && !Array.isArray(value) && "preview" in value) {
		assertMarketPurchasePreview(value.preview, "市场购买预览响应不完整");
		return { preview: value.preview };
	}
	return parseRobotMarketMessage(value);
}

//#endregion
export { parseRobotMarketBrowse, parseRobotMarketMessage, parseRobotMarketPurchase };