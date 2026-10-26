import { requestBackend } from "./client.js";
import { PAGE_SIZE } from "../../constants/common.js";
import "../../constants/index.js";

//#region src/api/bot/bounty-queries.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("悬赏接口返回格式不完整");
	return value;
}
function number(value) {
	if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new Error("悬赏接口缺少数值字段");
	return value;
}
function name(value) {
	if (value === null) return "未知";
	if (typeof value !== "string") throw new Error("悬赏接口缺少名称字段");
	return value;
}
async function getBackendBounties(bid, page) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseBackendBounties(await requestBackend(bid, "get_bounties", { query: {
		page,
		pageSize: 5
	} }), page);
}
function parseBackendBounties(value, page) {
	const data = record(value);
	if (!Array.isArray(data.items) || number(data.pageSize) !== 5 || number(data.page) !== page) throw new Error("悬赏接口分页不完整");
	return {
		total: number(data.total),
		list: data.items.map((value) => {
			const row = record(value);
			const expiresAt = new Date(typeof row.expiresAt === "string" ? row.expiresAt : "");
			if (!Number.isFinite(expiresAt.getTime())) throw new Error("悬赏接口日期无效");
			return {
				id: number(row.id),
				publisherName: name(row.publisherName),
				targetName: name(row.targetName),
				targetUid: number(row.targetUid),
				rewardPerCompletion: number(row.rewardPerCompletion),
				maxCompletions: number(row.maxCompletions),
				completedCount: number(row.completedCount),
				remainingSlots: number(row.remainingSlots),
				hoursLeft: number(row.hoursLeft),
				expiresAt
			};
		})
	};
}
function parseRobotBountyList(value) {
	const page = number(record(value).page);
	const data = parseBackendBounties(value, page);
	return {
		...data,
		page,
		totalPages: Math.ceil(data.total / 5)
	};
}

//#endregion
export { getBackendBounties, parseBackendBounties, parseRobotBountyList };