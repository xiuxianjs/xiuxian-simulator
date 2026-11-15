//#region src/api/bot/pk-pursuit.ts
function object(value) {
	if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("追击回执不完整");
	return value;
}
function integer(value, minimum = 0) {
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) throw new Error("追击回执数量无效");
	return value;
}
function date(value) {
	if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new Error("追击截止无效");
	return value;
}
function parsePursuitReference(value, kind) {
	return typeof value === "string" && (kind === "pp" ? /^r1_[0-9a-z]{1,13}_pp_[0-9a-z]{1,13}_[0-9a-f]{24}$/ : /^r1_[0-9a-z]{1,13}_pf_[0-9a-z]{1,13}_[0-9a-f]{24}$/).test(value) ? value : null;
}
function readReference(value, kind) {
	const confirmation = parsePursuitReference(value, kind);
	if (!confirmation) throw new Error("追击确认编号无效");
	return confirmation;
}
function offer(value) {
	const row = object(value);
	if (typeof row.defenderName !== "string" || typeof row.fighting !== "boolean") throw new Error("追击目标无效");
	return {
		reportId: integer(row.reportId, 1),
		defenderName: row.defenderName,
		bounty: integer(row.bounty, 200),
		loss: integer(row.loss, 10),
		deadline: date(row.deadline),
		fighting: row.fighting
	};
}
function parsePursuitBoard(value) {
	const row = object(value);
	if (!Array.isArray(row.items)) throw new Error("追击榜回执无效");
	return {
		items: row.items.map(offer),
		page: integer(row.page, 1),
		count: integer(row.count)
	};
}
function parsePursuitPublish(value) {
	const row = object(value);
	return {
		reportId: integer(row.reportId, 1),
		bounty: integer(row.bounty, 200),
		deadline: date(row.deadline),
		confirmation: readReference(row.confirmation, "pp")
	};
}
function parsePursuitFight(value) {
	const row = object(value);
	const share = integer(row.defenderShare);
	const recycled = integer(row.recycled);
	const target = offer(row);
	if (share + recycled !== target.loss) throw new Error("追击分配无效");
	return {
		...target,
		share,
		recycled,
		confirmation: readReference(row.confirmation, "pf")
	};
}
function parsePursuitReceipt(value) {
	const row = object(value);
	if (row.state !== "won" && row.state !== "lost" && row.state !== "voided") throw new Error("追击结算状态无效");
	return {
		state: row.state,
		reportId: integer(row.reportId, 1),
		bounty: integer(row.bounty),
		battleId: typeof row.battleId === "string" && /^pk1_[0-9a-f]{32}$/.test(row.battleId) ? row.battleId : void 0,
		loss: integer(row.loss),
		share: integer(row.defenderShare),
		recycled: integer(row.recycled)
	};
}

//#endregion
export { parsePursuitBoard, parsePursuitFight, parsePursuitPublish, parsePursuitReceipt, parsePursuitReference };