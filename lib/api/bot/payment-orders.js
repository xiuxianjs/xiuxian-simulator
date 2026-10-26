import { requestBackend } from "./client.js";
import { getBackendSponsorPayment } from "./sponsor-payment.js";

//#region src/api/bot/payment-orders.ts
async function getPaymentOrders(bid, uid, page) {
	const value = await requestBackend(bid, "get_players_id_payments_orders", {
		path: { id: uid },
		query: {
			page,
			pageSize: 5
		}
	});
	if (!value || typeof value !== "object") throw new Error("订单列表响应不完整");
	const data = value;
	if (!Array.isArray(data.items) || typeof data.total !== "number" || !Number.isSafeInteger(data.total) || data.total < 0) throw new Error("订单列表响应不完整");
	return {
		items: data.items.map((value) => {
			if (!value || typeof value !== "object") throw new Error("订单列表响应不完整");
			const row = value;
			if (typeof row.orderNo !== "string" || !row.orderNo || typeof row.status !== "string" || typeof row.payAmount !== "number" || !Number.isSafeInteger(row.payAmount) || row.payAmount <= 0 || typeof row.packageId !== "number") throw new Error("订单列表响应不完整");
			return {
				orderNo: row.orderNo,
				status: row.status,
				payAmount: row.payAmount,
				packageId: row.packageId
			};
		}),
		total: data.total
	};
}

//#endregion
export { getBackendSponsorPayment as getPaymentOrder, getPaymentOrders };