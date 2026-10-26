import { BackendAPIError } from "../../../api/bot/client.js";
import "../../../api/index.js";
import { purchaseBackendCompanionShopOverview } from "../../../api/bot/interaction-overview.js";
import { previewBackendCompanionShopPurchase, purchaseBackendCompanionShop } from "../../../api/bot/companion-shop-purchase.js";

//#region src/response-apps/companion/shopBuy/app.ts
/** The robot forwards command input; product validation and confirmation facts belong to Go. */
async function checkShopBuy(params) {
	try {
		if (params.confirmed) {
			const overview = await purchaseBackendCompanionShopOverview(params.bid, params.uid, params.productId, params.count, params.request, params.messageText);
			const settledResult = overview.purchaseError || !overview.result ? {
				code: "FAIL",
				data: { message: overview.purchaseError ?? "兑换失败，请稍后再试" }
			} : {
				code: "OK",
				data: {
					name: overview.result.name,
					paid: overview.result.paid,
					granted: overview.result.granted
				}
			};
			return {
				code: "CONFIRM_NEEDED",
				data: {
					...overview.preview,
					settledResult
				}
			};
		}
		return {
			code: "CONFIRM_NEEDED",
			data: await previewBackendCompanionShopPurchase(params.bid, params.uid, params.productId, params.count, params.request)
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: { message: error instanceof BackendAPIError ? error.message : "兑换预检失败，请稍后再试" }
		};
	}
}
async function confirmShopBuy(params) {
	try {
		const result = await purchaseBackendCompanionShop(params.bid, params.uid, params.productId, params.count, params.request);
		return {
			code: "OK",
			data: {
				name: result.name,
				paid: result.paid,
				granted: result.granted
			}
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: { message: error instanceof BackendAPIError ? error.message : "兑换失败，请稍后再试" }
		};
	}
}

//#endregion
export { checkShopBuy, confirmShopBuy };