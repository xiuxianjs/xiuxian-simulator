import { requestBackend } from "./client.js";

//#region src/api/bot/companion-oath-preview.ts
const record = (value) => {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("誓约升级预览数据不完整");
	return value;
};
const positiveInteger = (value) => typeof value === "number" && Number.isSafeInteger(value) && value > 0;
const integer = (value) => typeof value === "number" && Number.isSafeInteger(value);
/** 只读取升级前确认页所需事实；升级本身仍由独立领域操作处理。 */
async function getBackendCompanionOathUpgradePreview(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseBackendCompanionOathPreview(await requestBackend(bid, "get_players_id_companion_oath_upgrade", { path: { id: uid } }));
}
function parseBackendCompanionOathPreview(value) {
	const data = record(value);
	if (!positiveInteger(data.partnerId) || typeof data.partnerName !== "string" || !integer(data.currentBlessingPercent) || !integer(data.upgradedBlessingPercent)) throw new Error("誓约升级预览数据不完整");
	return {
		partnerId: data.partnerId,
		partnerName: data.partnerName,
		currentBlessingPercent: data.currentBlessingPercent,
		upgradedBlessingPercent: data.upgradedBlessingPercent
	};
}

//#endregion
export { getBackendCompanionOathUpgradePreview, parseBackendCompanionOathPreview };