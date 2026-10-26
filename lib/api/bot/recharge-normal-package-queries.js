import { requestBackend } from "./client.js";

//#region src/api/bot/recharge-normal-package-queries.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("普通充值套餐响应不完整");
	return value;
}
function number(value) {
	if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("普通充值套餐数值字段不完整");
	return value;
}
function text(value) {
	if (typeof value !== "string") throw new Error("普通充值套餐文本字段不完整");
	return value;
}
function boolean(value) {
	if (typeof value !== "boolean") throw new Error("普通充值套餐状态字段不完整");
	return value;
}
function packageItem(value) {
	const item = record(value);
	return {
		id: number(item.id),
		name: text(item.name),
		yuan: number(item.yuan),
		priceAmount: number(item.priceAmount),
		grantSpiritMilk: number(item.grantSpiritMilk),
		doubleAvailable: boolean(item.doubleAvailable),
		doubleClaimed: boolean(item.doubleClaimed)
	};
}
async function getBackendRechargeNormalPackages(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseBackendRechargeNormalPackages(await requestBackend(bid, "get_players_id_recharge_normal_packages", { path: { id: uid } }));
}
function parseBackendRechargeNormalPackages(value) {
	const data = record(value);
	if (!Array.isArray(data.packages)) throw new Error("普通充值套餐列表不完整");
	return { packages: data.packages.map(packageItem) };
}

//#endregion
export { getBackendRechargeNormalPackages, parseBackendRechargeNormalPackages };