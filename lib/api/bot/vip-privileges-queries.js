import { requestBackend } from "./client.js";

//#region src/api/bot/vip-privileges-queries.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("特权接口格式不完整");
	return value;
}
function number(value) {
	if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new Error("特权接口缺少数值");
	return value;
}
function boolean(value) {
	if (typeof value !== "boolean") throw new Error("特权接口缺少状态");
	return value;
}
function privilegeRows(value) {
	if (!Array.isArray(value)) throw new Error("特权接口列表不完整");
	return value.map((item) => {
		const row = record(item);
		if (typeof row.text !== "string" || row.needText !== void 0 && typeof row.needText !== "string") throw new Error("特权接口列表不完整");
		return {
			minLevel: row.minLevel === void 0 ? void 0 : number(row.minLevel),
			text: row.text,
			unlocked: boolean(row.unlocked),
			needText: row.needText
		};
	});
}
async function getBackendVipPrivileges(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseBackendVipPrivileges(await requestBackend(bid, "get_players_id_vip_privileges", { path: { id: uid } }));
}
function parseBackendVipPrivileges(value) {
	const data = record(value);
	if (typeof data.name !== "string" || !Array.isArray(data.levelEligibility) || data.activeThemeConfig !== null && typeof data.activeThemeConfig !== "string") throw new Error("特权接口资料不完整");
	const checkinDoubleDays = Object.fromEntries(Object.entries(record(data.checkinDoubleDays)).map(([key, value]) => {
		if (!Array.isArray(value)) throw new Error("特权接口签到日不完整");
		return [key, value.map(number)];
	}));
	const levelEligibility = data.levelEligibility.map((value) => {
		const row = record(value);
		return {
			minLevel: number(row.minLevel),
			unlocked: boolean(row.unlocked),
			needAmount: number(row.needAmount)
		};
	});
	const found = boolean(data.found);
	const vipPrivileges = privilegeRows(data.vipPrivileges);
	const monthCardPrivileges = privilegeRows(data.monthCardPrivileges);
	if (found && (levelEligibility.length !== 10 || levelEligibility.some((row, level) => row.minLevel !== level))) throw new Error("特权接口等级或配置不完整");
	return {
		found,
		name: data.name,
		vipLevel: number(data.vipLevel),
		totalRechargeAmount: number(data.totalRechargeAmount),
		hasMonthCard: boolean(data.hasMonthCard),
		pillDailyLimit: number(data.pillDailyLimit),
		levelEligibility,
		checkinDoubleDays,
		canUseMeridian: boolean(data.canUseMeridian),
		canUseSoulPath: boolean(data.canUseSoulPath),
		activeThemeConfig: data.activeThemeConfig,
		vipPrivileges,
		monthCardPrivileges
	};
}

//#endregion
export { getBackendVipPrivileges, parseBackendVipPrivileges };