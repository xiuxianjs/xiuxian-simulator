import { requestBackend } from "./client.js";

//#region src/api/bot/tianjiao-rewards-queries.ts
async function getBackendTianjiaoRewards(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseTianjiaoRewards(await requestBackend(bid, "get_players_id_tianjiao_rewards", { path: { id: uid } }));
}
function parseTianjiaoRewards(data) {
	const integer = (v) => typeof v === "number" && Number.isSafeInteger(v);
	const object = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
	const date = (v) => typeof v === "string" && Number.isFinite(Date.parse(v));
	const text = (v) => v === null || typeof v === "string";
	if (!object(data) || typeof data.isVisible !== "boolean" || !integer(data.stageLevel) || typeof data.stageName !== "string" || !Array.isArray(data.configs) || !Array.isArray(data.records) || !object(data.view) || typeof data.view.lockedMessage !== "string" || !Array.isArray(data.view.tiers) || !Array.isArray(data.view.records) || typeof data.view.recordTotal !== "number" || !Number.isSafeInteger(data.view.recordTotal) || data.view.recordTotal < 0) throw new Error("登天奖励接口数据不完整");
	for (const row of data.configs) if (!object(row) || !integer(row.stageLevel) || !integer(row.rank) || !text(row.description) || !Object.hasOwn(row, "rewardJson")) throw new Error("登天奖励配置不完整");
	for (const row of data.records) if (!object(row) || !integer(row.stageLevel) || !integer(row.rank) || typeof row.stageName !== "string" || !text(row.rewardText) || !date(row.claimedAt) || !Object.hasOwn(row, "rewardSnapshot")) throw new Error("登天奖励记录不完整");
	for (const tier of data.view.tiers) if (!object(tier) || !Number.isSafeInteger(tier.rank) || typeof tier.rewardText !== "string" || tier.claimedAt !== null && !date(tier.claimedAt)) throw new Error("登天奖励档位回执不完整");
	for (const record of data.view.records) if (!object(record) || !Number.isSafeInteger(record.stageLevel) || typeof record.stageName !== "string" || !Number.isSafeInteger(record.rank) || typeof record.rewardText !== "string" || !date(record.claimedAt)) throw new Error("登天奖励展示记录不完整");
	return data;
}

//#endregion
export { getBackendTianjiaoRewards, parseTianjiaoRewards };