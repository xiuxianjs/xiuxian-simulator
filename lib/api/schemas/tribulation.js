import { parseDisruptionSummary } from "./public-tribulation.js";

//#region src/api/schemas/tribulation.ts
function parseTribulationEvasion(value) {
	const e = value;
	if (!e || !/^[a-f0-9]{64}$/.test(e.policyVersion) || !Number.isSafeInteger(e.level) || e.level < 0 || !Number.isFinite(e.npcAttackBonusPercent) || e.npcAttackBonusPercent < 0 || e.recoversAt !== void 0 && !Number.isFinite(Date.parse(e.recoversAt))) throw new Error("暂避档位数据不完整");
	return e;
}
function parseTribulationEvasionResult(value) {
	const e = value;
	if (e?.status !== "evaded" || !Number.isSafeInteger(e.eventId) || e.eventId < 1 || !Number.isSafeInteger(e.levelAfter) || e.levelAfter < 1 || ![e.recoversAt, e.retryAt].every((t) => typeof t === "string" && Number.isFinite(Date.parse(t)))) throw new Error("暂避结果不完整，请按原事件重试");
	return e;
}
function parseTribulationHeartDemon(value) {
	const h = value;
	if (!h || typeof h !== "object" || !/^[a-f0-9]{64}$/.test(h.policyVersion) || ![
		"failure",
		"evasion",
		"disruption",
		"general"
	].includes(h.topic) || typeof h.title !== "string" || !h.title.trim() || typeof h.prompt !== "string" || !h.prompt.trim() || !Array.isArray(h.options) || h.options.length !== 3 || new Set(h.options.map((o) => o?.id)).size !== 3 || h.sourceEventId !== void 0 && (!Number.isSafeInteger(h.sourceEventId) || h.sourceEventId < 1)) throw new Error("心魔内容不完整");
	for (const o of h.options) if (!o || typeof o.name !== "string" || !o.name.trim() || ![o.attackMultiplier, o.defenseMultiplier].every((n) => Number.isFinite(n) && n > 0) || ![
		"guard",
		"slay",
		"accept"
	].includes(o.id) || o.id === "guard" && !(o.attackMultiplier < 1 && o.defenseMultiplier > 1) || o.id === "slay" && !(o.attackMultiplier > 1 && o.defenseMultiplier < 1) || o.id === "accept" && !(o.attackMultiplier === 1 && o.defenseMultiplier === 1)) throw new Error("心魔效果不完整");
	if (h.choice !== void 0 && !h.options.some((o) => o.id === h.choice) || Boolean(h.choice) !== Boolean(h.answeredAt) || h.answeredAt !== void 0 && (typeof h.answeredAt !== "string" || !Number.isFinite(Date.parse(h.answeredAt)))) throw new Error("心魔回答状态不完整");
	return h;
}
function parseTribulationKarma(data) {
	if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("渡劫因果数据不完整");
	const value = data;
	if (!/^[a-f0-9]{64}$/.test(value.policyVersion) || typeof value.capturedAt !== "string" || !Number.isFinite(Date.parse(value.capturedAt)) || ![value.currentShaQi, value.activeDisruptions].every((n) => Number.isSafeInteger(n) && n >= 0) || ![
		value.shaQiAttackBonusPercent,
		value.disruptionAttackBonusPercent,
		value.npcAttackBonusPercent
	].every((n) => Number.isFinite(n) && n >= 0) || value.npcAttackBonusPercent > value.shaQiAttackBonusPercent + value.disruptionAttackBonusPercent) throw new Error("渡劫因果数据不完整");
	return value;
}
function parseTribulationAttackLimit(data) {
	if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("雷劫总攻击上限数据不完整");
	const value = data;
	if (!Number.isFinite(value.maxMultiplier) || value.maxMultiplier <= 0 || !Array.isArray(value.changes)) throw new Error("雷劫总攻击上限数据不完整");
	const seen = /* @__PURE__ */ new Set();
	for (const c of value.changes) {
		if (!c || ![c.layer, c.position].every((n) => Number.isSafeInteger(n) && n > 0) || !["physicalAttack", "magicAttack"].includes(c.attribute) || ![
			c.base,
			c.before,
			c.after
		].every((n) => Number.isSafeInteger(n) && n >= 0) || c.before <= c.after || c.after !== Math.floor(c.base * value.maxMultiplier)) throw new Error("雷劫总攻击上限数据不完整");
		const key = `${c.layer}:${c.position}:${c.attribute}`;
		if (seen.has(key)) throw new Error("雷劫总攻击上限数据不完整");
		seen.add(key);
	}
	return value;
}
function requireValue(valid) {
	if (!valid) throw new Error("渡劫接口返回不完整，请更新服务端后重试");
}
function record(value) {
	requireValue(Boolean(value) && typeof value === "object" && !Array.isArray(value));
	return value;
}
function numeric(value) {
	return typeof value === "number" && Number.isFinite(value);
}
function id(value) {
	return numeric(value) && Number.isSafeInteger(value) && value > 0;
}
function isTribulationGrade(value) {
	return typeof value === "string" && [
		"low",
		"standard",
		"high"
	].includes(value);
}
function progress(value) {
	const p = record(value);
	requireValue(numeric(p.successful) && Number.isInteger(p.successful) && p.successful >= 0 && id(p.requiredAttempts) && p.successful <= p.requiredAttempts && numeric(p.attackBonusPercent) && typeof p.completed === "boolean");
}
function parseTribulationPreparation(value) {
	const p = record(value);
	requireValue(id(p.eventId) && typeof p.targetRealm === "string" && typeof p.status === "string" && [
		"ready",
		"opened",
		"scheduled",
		"preparing",
		"charging",
		"succeeded",
		"failed",
		"expired",
		"cancelled",
		"evaded"
	].includes(p.status) && id(p.requiredAttempts) && typeof p.canStart === "boolean");
	for (const field of p.status === "ready" ? [] : p.status === "opened" ? ["opensAt"] : [
		"opensAt",
		"deadline",
		"retryAt"
	]) requireValue(typeof p[field] === "string" && Number.isFinite(Date.parse(p[field])));
	if (p.canOpen !== void 0) requireValue(typeof p.canOpen === "boolean" && (!p.canOpen || p.status === "ready"));
	if (p.materials !== void 0) {
		requireValue(Array.isArray(p.materials));
		for (const material of p.materials) {
			const m = record(material);
			requireValue(id(m.itemId) && typeof m.itemName === "string" && Number.isSafeInteger(m.requiredQuantity) && Number.isSafeInteger(m.currentQuantity) && typeof m.sufficient === "boolean");
		}
	}
	if (p.recoveryEndsAt !== void 0 || p.earliestRetryAt !== void 0) {
		requireValue(typeof p.recoveryEndsAt === "string" && Number.isFinite(Date.parse(p.recoveryEndsAt)));
		requireValue(typeof p.earliestRetryAt === "string" && Number.isFinite(Date.parse(p.earliestRetryAt)));
		requireValue(Date.parse(p.earliestRetryAt) === Math.max(Date.parse(p.retryAt), Date.parse(p.recoveryEndsAt)));
	}
	if (p.heartDemon !== void 0) parseTribulationHeartDemon(p.heartDemon);
	if (p.canAnswerHeartDemon !== void 0) requireValue(typeof p.canAnswerHeartDemon === "boolean");
	if (p.canAnswerHeartDemon) requireValue(p.status === "opened" && p.heartDemon !== void 0 && !record(p.heartDemon).choice);
	if (p.evasion !== void 0) parseTribulationEvasion(p.evasion);
	if (p.canEvade !== void 0) requireValue(typeof p.canEvade === "boolean");
	if (p.canEvade) {
		const next = record(p.evasionPreview);
		requireValue(p.status === "opened" && id(next.nextLevel) && numeric(next.nextAttackBonusPercent) && next.nextAttackBonusPercent >= 0 && id(next.resetAfterSeconds));
	}
	if (p.qualityProgress !== void 0) progress(p.qualityProgress);
	if (p.gradeOptions !== void 0) {
		requireValue(Array.isArray(p.gradeOptions));
		for (const option of p.gradeOptions) {
			const g = record(option);
			requireValue(isTribulationGrade(g.grade) && numeric(g.attackMultiplier) && g.attackMultiplier > 0 && numeric(g.attackBonusPercent));
		}
	}
	return p;
}
function unit(value) {
	const u = record(value);
	requireValue(typeof u.Name === "string" && [
		"HP",
		"MP",
		"PhysicalAttack",
		"MagicAttack",
		"PhysicalDefense",
		"MagicDefense",
		"Speed"
	].every((key) => numeric(u[key])));
}
function weather(value) {
	const w = record(value);
	requireValue(typeof w.id === "string" && Boolean(w.id.trim()) && typeof w.name === "string" && Boolean(w.name.trim()));
	for (const key of ["startsAt", "changesAt"]) requireValue(typeof w[key] === "string" && Number.isFinite(Date.parse(w[key])));
	requireValue(Date.parse(String(w.startsAt)) < Date.parse(String(w.changesAt)));
	const modifiers = record(w.npc);
	for (const [key, value] of Object.entries(modifiers)) {
		requireValue([
			"physicalAttackMultiplier",
			"magicAttackMultiplier",
			"physicalDefenseMultiplier",
			"magicDefenseMultiplier",
			"speedMultiplier",
			"critRatePoints"
		].includes(key) && numeric(value));
		requireValue(key === "critRatePoints" ? Number(value) >= -100 && Number(value) <= 100 : Number(value) > 0);
	}
	requireValue(Array.isArray(w.changes));
	for (const value of w.changes) {
		const change = record(value);
		requireValue(id(change.layer) && id(change.position) && typeof change.attribute === "string" && [
			"physicalAttack",
			"magicAttack",
			"physicalDefense",
			"magicDefense",
			"speed",
			"critRate"
		].includes(change.attribute) && numeric(change.before) && numeric(change.after));
	}
}
function parseTribulationConfirmation(value) {
	const c = record(value);
	requireValue(id(c.eventId) && isTribulationGrade(c.grade) && numeric(c.attackMultiplier) && c.attackMultiplier > 0 && typeof c.conditionVersion === "string" && /^[a-f0-9]{64}$/.test(c.conditionVersion));
	requireValue(typeof c.rewardScope === "string" && ["current", "cumulative"].includes(c.rewardScope) && [
		"experienceBefore",
		"successExperienceCost",
		"failureExperienceAfter"
	].every((key) => numeric(c[key])));
	progress(c.progress);
	requireValue(Array.isArray(c.materials));
	for (const value of c.materials) {
		const m = record(value);
		requireValue(id(m.itemId) && id(m.quantity));
	}
	if (c.attackLimit !== void 0) parseTribulationAttackLimit(c.attackLimit);
	if (c.heartDemon !== void 0) parseTribulationHeartDemon(c.heartDemon);
	if (c.evasion !== void 0) parseTribulationEvasion(c.evasion);
	if (c.karma !== void 0) parseTribulationKarma(c.karma);
	if (c.weather !== void 0) weather(c.weather);
	const b = record(c.battle);
	requireValue(typeof b.name === "string" && b.mode === "continuous_layers_v1" && Array.isArray(b.layers) && b.layers.length > 0);
	unit(b.player);
	for (const value of b.layers) {
		const l = record(value);
		requireValue(id(l.layer) && Array.isArray(l.enemies));
		for (const enemy of l.enemies) unit(enemy);
	}
	return c;
}
function parseTribulationReceipt(value) {
	const r = record(value);
	if (r.status !== void 0) {
		requireValue(id(r.eventId) && typeof r.status === "string" && [
			"charging",
			"cancelled",
			"succeeded",
			"failed"
		].includes(r.status) && isTribulationGrade(r.grade) && numeric(r.attackMultiplier) && r.attackMultiplier > 0 && typeof r.conditionVersion === "string" && /^[a-f0-9]{64}$/.test(r.conditionVersion) && typeof r.refunded === "boolean");
		for (const key of ["confirmedAt", "strikeAt"]) requireValue(typeof r[key] === "string" && Number.isFinite(Date.parse(r[key])));
		if (r.cancelledReason !== void 0) requireValue(typeof r.cancelledReason === "string");
		return r;
	}
	requireValue(id(r.eventId) && isTribulationGrade(r.grade) && typeof r.success === "boolean" && typeof r.promoted === "boolean" && numeric(r.experienceBefore) && numeric(r.experienceAfter));
	progress(r.progress);
	requireValue(Array.isArray(r.materials));
	for (const value of r.materials) {
		const m = record(value);
		requireValue(id(m.itemId) && typeof m.itemName === "string" && id(m.requiredQuantity));
	}
	if (r.conditions !== void 0) {
		const conditions = record(r.conditions);
		if (conditions.attackLimit !== void 0) parseTribulationAttackLimit(conditions.attackLimit);
		if (conditions.heartDemon !== void 0) parseTribulationHeartDemon(conditions.heartDemon);
		if (conditions.evasion !== void 0) parseTribulationEvasion(conditions.evasion);
		if (conditions.karma !== void 0) parseTribulationKarma(conditions.karma);
		if (conditions.disruption !== void 0) parseDisruptionSummary(conditions.disruption);
		if (conditions.weather !== void 0) weather(conditions.weather);
	}
	const b = record(r.battle);
	requireValue(typeof b.name === "string" && typeof b.summary === "string" && numeric(b.totalLayers) && numeric(b.passedLayers));
	if (r.debuff !== void 0) {
		const d = record(r.debuff);
		requireValue(typeof d.applied === "boolean" && typeof d.expiresAt === "string" && Number.isFinite(Date.parse(d.expiresAt)));
	}
	return r;
}

//#endregion
export { isTribulationGrade, parseTribulationAttackLimit, parseTribulationConfirmation, parseTribulationEvasion, parseTribulationEvasionResult, parseTribulationHeartDemon, parseTribulationKarma, parseTribulationPreparation, parseTribulationReceipt };