import { parseBackendNormalCheckout, parseBackendNormalPaymentSettlement, parseRobotSponsorPaymentState } from "./sponsor-payment.js";
import { parseBackendRechargeNormalPackages } from "./recharge-normal-package-queries.js";

//#region src/api/bot/normal-payment.ts
var NormalPackageListDecodeError = class extends Error {};
function parseRobotNormalPaymentCreate(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("充值购买响应不完整");
	const row = value;
	if (row.kind === "packages") try {
		return {
			kind: "packages",
			packages: parseBackendRechargeNormalPackages(row).packages
		};
	} catch (error) {
		throw new NormalPackageListDecodeError(error instanceof Error ? error.message : "普通充值套餐响应不完整");
	}
	if (row.kind === "checkout") return {
		kind: "checkout",
		checkout: parseBackendNormalCheckout(row.checkout)
	};
	throw new Error("充值购买响应不完整");
}
function parseRobotNormalPaymentState(value) {
	const data = parseRobotSponsorPaymentState(value);
	const row = value;
	return {
		...data,
		cancelled: row.cancelled === true,
		receipt: data.order.status === "SUCCESS" ? parseBackendNormalPaymentSettlement(row.receipt) : void 0
	};
}

//#endregion
export { NormalPackageListDecodeError, parseRobotNormalPaymentCreate, parseRobotNormalPaymentState };