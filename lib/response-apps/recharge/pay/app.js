import { BackendAPIError } from "../../../api/bot/client.js";
import { getBackendRobotIdentity } from "../../../api/bot/identity.js";
import { createBackendNormalPayment } from "../../../api/bot/sponsor-payment.js";
import { getBackendRechargeNormalPackages } from "../../../api/bot/recharge-normal-package-queries.js";
import QRCode from "qrcode";

//#region src/response-apps/recharge/pay/app.ts
const getPayData = async (messageText, isPrivate, bid, request) => {
	const uid = (await getBackendRobotIdentity(bid, request)).account.playerId;
	if (!uid || uid <= 0) return {
		code: "ORDER_FAILED",
		error: "尚未进入修仙世界"
	};
	if (!isPrivate) return { code: "PRIVATE_ONLY" };
	const match = (messageText ?? "").trim().match(/充值购买\s+(\d+)/);
	if (!match) {
		const { packages } = await getBackendRechargeNormalPackages(bid, uid);
		if (packages.length === 0) return { code: "NO_MATCH_LIST_EMPTY" };
		return {
			code: "NO_MATCH_LIST",
			packages: packages.map((pkg) => ({
				id: pkg.id,
				name: pkg.name,
				yuan: pkg.yuan,
				grantSpiritMilk: pkg.grantSpiritMilk,
				isAvailableDouble: pkg.doubleAvailable,
				isClaimedDouble: pkg.doubleClaimed
			}))
		};
	}
	const packageId = parseInt(match[1], 10);
	try {
		const checkout = await createBackendNormalPayment(bid, uid, packageId, request);
		return {
			code: "ORDER_CREATED",
			uid,
			orderNo: checkout.order.orderNo,
			qrCodeBuffer: await QRCode.toBuffer(checkout.payUrl, {
				width: 300,
				margin: 1
			}),
			packageName: checkout.packageName,
			yuan: (checkout.order.payAmount / 100).toFixed(2)
		};
	} catch (error) {
		return {
			code: "ORDER_FAILED",
			error: error instanceof BackendAPIError ? error.message : "创建订单失败"
		};
	}
};

//#endregion
export { getPayData };