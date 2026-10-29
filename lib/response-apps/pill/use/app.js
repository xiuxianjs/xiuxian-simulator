import { EMPTY_STRING, FIRST_ARG_INDEX } from "../../../constants/common.js";
import "../../../constants/index.js";
import { consumeBackendItem, parsePeiyuanPending } from "../../../api/bot/consume.js";

//#region src/response-apps/pill/use/app.ts
function parseUsePillParams(messageText) {
	const trimmed = (messageText || "").replace(/^(!|！|\/|#|＃)?服用\s*/, "").trim();
	const args = trimmed ? trimmed.split(/\s+/) : [];
	const quantityArg = args[1] ? Number.parseInt(args[1], 10) : 1;
	return {
		itemIdOrName: args[0],
		quantity: Number.isSafeInteger(quantityArg) && quantityArg > 0 ? quantityArg : 1
	};
}
/** The bot parses command tokens only; Go resolves the pill template, stock and settlement. */
async function App(params) {
	const { itemIdOrName, quantity } = parseUsePillParams(params.messageText);
	if (!itemIdOrName) return { code: "PARAM_ERROR" };
	try {
		const itemID = /^\d+$/.test(itemIdOrName) ? Number(itemIdOrName) : 0;
		const result = await consumeBackendItem(params.bid, params.uid, itemID > 0 ? {
			itemId: itemID,
			pillOnly: true,
			quantity
		} : {
			itemName: itemIdOrName,
			pillOnly: true,
			quantity
		}, params.request);
		if (result.outcome === "peiyuan_pending") return {
			code: "PEIYUAN_PENDING",
			data: parsePeiyuanPending(result.pending)
		};
		if (result.outcome === "consumed") return {
			code: "SUCCESS",
			data: {
				effectMessage: result.message,
				remainingQuantity: result.remainingQuantity
			}
		};
		return {
			code: "FAILED",
			message: result.message
		};
	} catch (error) {
		return {
			code: "FAILED",
			message: error instanceof Error ? error.message : "服用丹药失败"
		};
	}
}

//#endregion
export { App as default };