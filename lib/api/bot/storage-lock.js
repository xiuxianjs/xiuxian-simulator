import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/storage-lock.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("锁定接口响应不完整");
	return value;
}
function count(value) {
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error("锁定接口数量无效");
	return value;
}
function choice(value, allowed) {
	if (typeof value !== "string" || !allowed.includes(value)) throw new Error("锁定接口状态无效");
	return value;
}
function nullableName(value) {
	if (value !== null && typeof value !== "string") throw new Error("锁定接口名称无效");
}
async function setBackendStorageLock(bid, uid, body, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	const context = writeContext(request);
	return parseStorageLockResult(await requestBackend(bid, "post_players_id_storage_lock_state", {
		path: { id: uid },
		body,
		...context
	}), body.selector.kind, body.selector.kind === "instance" ? body.selector.asset : void 0);
}
function parseStorageLockResult(value, kind, asset) {
	const data = record(value);
	if ([
		"instance",
		"category",
		"name"
	].some((key) => key !== data.kind && data[key] !== void 0)) throw new Error("锁定接口混合选择方式");
	if (data.kind !== kind) throw new Error("锁定接口选择方式不一致");
	const view = record(data.view);
	if (typeof view.success !== "boolean" || typeof view.message !== "string" || !view.message || view.success !== count(view.count) > 0) throw new Error("锁定接口展示结果无效");
	let expectedViewCount = 0;
	if (data.kind === "instance") {
		const row = record(data.instance);
		const state = choice(row.outcome, [
			"changed",
			"already_set",
			"equipped",
			"listed",
			"learned",
			"not_found",
			"not_changed"
		]);
		const amount = count(row.count);
		expectedViewCount = amount;
		nullableName(row.name);
		if (kind !== "instance") throw new Error("锁定接口选择方式不一致");
		if (row.group && asset !== "skillBook" || state === "equipped" && asset !== "equipment" && asset !== "professionTool" || state === "listed" && asset !== "soulArtifact" || state === "learned" && asset !== "skillBook") throw new Error("锁定接口资产状态不一致");
		if (typeof row.group !== "boolean" || state === "changed" !== amount > 0) throw new Error("锁定接口变更结果不一致");
	} else if (data.kind === "category") {
		const row = record(data.category);
		const state = choice(row.outcome, [
			"changed",
			"type_not_found",
			"no_configuration",
			"no_inventory",
			"not_changed"
		]);
		expectedViewCount = count(row.count);
		if (state === "changed" !== expectedViewCount > 0) throw new Error("锁定接口变更结果不一致");
	} else {
		const row = record(data.name);
		choice(row.completion, ["completed", "aborted"]);
		if (!Array.isArray(row.changes) || !Array.isArray(row.issues)) throw new Error("锁定接口明细不完整");
		let sum = 0;
		for (const raw of row.changes) {
			const change = record(raw);
			choice(change.asset, [
				"item",
				"equipment",
				"professionTool",
				"skillBook"
			]);
			nullableName(change.name);
			if (count(change.templateId) === 0 || count(change.count) === 0) throw new Error("锁定接口明细数量无效");
			sum = count(sum + count(change.count));
		}
		let aborted = false;
		for (const raw of row.issues) {
			const issue = record(raw);
			choice(issue.stage, [
				"itemsQuery",
				"itemTemplate",
				"equipmentQuery",
				"equipmentUpdate",
				"toolQuery",
				"toolUpdate",
				"skillBookQuery",
				"skillBookUpdate"
			]);
			choice(issue.disposition, ["continued", "aborted"]);
			choice(issue.code, ["database_error", "template_missing"]);
			choice(issue.effect, ["unknown", "no_change"]);
			if (issue.templateId !== void 0 && count(issue.templateId) === 0) throw new Error("锁定接口问题明细无效");
			aborted ||= issue.disposition === "aborted";
		}
		expectedViewCount = row.completion === "aborted" ? 0 : count(row.changedCount);
		if (sum !== count(row.changedCount) || aborted !== (row.completion === "aborted")) throw new Error("锁定接口部分变更结果不一致");
	}
	if (view.count !== expectedViewCount) throw new Error("锁定接口展示数量不一致");
	return value;
}

//#endregion
export { parseStorageLockResult, setBackendStorageLock };