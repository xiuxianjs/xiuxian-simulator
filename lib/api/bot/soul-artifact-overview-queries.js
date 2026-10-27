import { requestBackend } from "./client.js";
import { parseRecoveryEffects } from "../schemas/resource-recovery.js";

//#region src/api/bot/soul-artifact-overview-queries.ts
function fixedPanels(value) {
	return rows(value).map((panel) => {
		const stat = key(panel.key);
		if (![
			"patk",
			"matk",
			"pdef",
			"mdef",
			"hp",
			"speed"
		].includes(stat)) throw new Error("本命物基础属性无效");
		return {
			key: stat,
			name: text(panel.name),
			value: number(panel.value)
		};
	});
}
const capabilityKinds = /* @__PURE__ */ new Set([
	"refine",
	"gradeUpgrade",
	"upgradeLevel",
	"wash",
	"unequip",
	"lock",
	"unlock"
]);
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("本命物查询返回格式不完整");
	return value;
}
function number(value) {
	if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("本命物查询缺少数值字段");
	return value;
}
function integer(value) {
	const result = number(value);
	if (!Number.isSafeInteger(result)) throw new Error("本命物查询整数字段无效");
	return result;
}
function text(value) {
	if (typeof value !== "string") throw new Error("本命物查询缺少文本字段");
	return value;
}
function boolean(value) {
	if (typeof value !== "boolean") throw new Error("本命物查询缺少状态字段");
	return value;
}
function rows(value) {
	if (!Array.isArray(value)) throw new Error("本命物查询缺少列表");
	return value.map(record);
}
function optionalText(value) {
	if (value === void 0 || value === null) return;
	return text(value);
}
function optionalNonNegativeInteger(value, field) {
	if (value === void 0 || value === null) return;
	const result = number(value);
	if (!Number.isSafeInteger(result) || result < 0) throw new Error(`本命物能力字段 ${field} 无效`);
	return result;
}
function capability(value) {
	const source = record(value);
	const kind = text(source.kind);
	if (!capabilityKinds.has(kind)) throw new Error("本命物操作能力无效");
	const instanceId = number(source.instanceId);
	if (!Number.isSafeInteger(instanceId) || instanceId <= 0) throw new Error("本命物操作能力缺少实例");
	const reasonCode = optionalText(source.reasonCode);
	const result = {
		kind,
		available: boolean(source.available),
		instanceId,
		...reasonCode === void 0 ? {} : { reasonCode }
	};
	for (const [field, value] of Object.entries({
		maxLevels: source.maxLevels,
		requiredItemId: source.requiredItemId,
		requiredQuantity: source.requiredQuantity,
		availableQuantity: source.availableQuantity
	})) {
		const parsed = optionalNonNegativeInteger(value, field);
		if (parsed !== void 0) result[field] = parsed;
	}
	const needsLevelParameters = result.available && (result.kind === "upgradeLevel" || result.kind === "wash");
	const missingLevelParameters = result.maxLevels === void 0 || result.requiredItemId === void 0 || result.requiredQuantity === void 0 || result.availableQuantity === void 0;
	if (needsLevelParameters && missingLevelParameters) throw new Error(`本命物${result.kind === "upgradeLevel" ? "升级" : "洗涤"}能力字段不完整`);
	if (result.available && result.kind === "gradeUpgrade" && (result.requiredQuantity === void 0 || result.availableQuantity === void 0)) throw new Error("本命物升品能力字段不完整");
	return result;
}
function pageCapability(value) {
	const source = record(value);
	if (text(source.kind) !== "soulPath") throw new Error("本命物页面能力无效");
	const reasonCode = optionalText(source.reasonCode);
	return {
		kind: "soulPath",
		available: boolean(source.available),
		...reasonCode === void 0 ? {} : { reasonCode }
	};
}
function key(value) {
	const result = text(value);
	if (!(/* @__PURE__ */ new Set([
		"patk",
		"matk",
		"pdef",
		"mdef",
		"hp",
		"speed",
		"critRate",
		"hitRate",
		"dodgeRate",
		"antiCritRate",
		"critDmgRate"
	])).has(result)) throw new Error("本命物属性无效");
	return result;
}
async function getBackendSoulArtifactOverview(bid, uid, view) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseSoulArtifactOverview(await requestBackend(bid, "get_players_id_soul_artifacts_overview", {
		path: { id: uid },
		...view ? { query: { view } } : {}
	}), view);
}
function parseSoulArtifactOverview(value, view) {
	const data = record(value);
	const items = rows(data.items).map((row) => {
		const panels = rows(row.panels).map((panel) => {
			const stat = key(panel.key);
			const relation = text(panel.affixType);
			if (![
				"main",
				"sub",
				"off"
			].includes(relation)) throw new Error("本命物词条关系无效");
			return {
				key: stat,
				name: text(panel.name),
				washBonus: number(panel.washBonus),
				washCap: number(panel.washCap),
				affixType: relation,
				affixTypeName: text(panel.affixTypeName),
				isPercent: boolean(panel.isPercent)
			};
		});
		const quality = text(row.washQuality);
		if (![
			"normal",
			"good",
			"fine",
			"excellent"
		].includes(quality)) throw new Error("本命物洗涤品质无效");
		const gradeId = integer(row.gradeId);
		const lockStatus = integer(row.lockStatus);
		return {
			recoveryEffects: parseRecoveryEffects(row.recoveryEffects),
			instanceId: integer(row.instanceId),
			artifactId: integer(row.artifactId),
			name: text(row.name),
			category: text(row.category),
			positioning: text(row.positioning),
			gradeId,
			gradeName: text(row.gradeName),
			level: integer(row.level),
			washCount: integer(row.washCount),
			hasUpgraded: boolean(row.hasUpgraded),
			isEquipped: boolean(row.isEquipped),
			lockStatus,
			statusText: text(row.statusText),
			isListed: lockStatus === 2,
			washQuality: text(row.washQualityText),
			revealedAffixCount: panels.length,
			maxAffixCount: integer(row.maxAffixCount),
			capabilities: rows(row.capabilities).map(capability),
			panels,
			basePanels: fixedPanels(row.basePanels),
			...row.combatPanels === void 0 ? {} : { combatPanels: fixedPanels(row.combatPanels) }
		};
	});
	const equippedInstanceId = data.equippedInstanceId === null ? null : number(data.equippedInstanceId);
	if (equippedInstanceId !== null && (!Number.isSafeInteger(equippedInstanceId) || equippedInstanceId <= 0)) throw new Error("本命物当前炼化实例无效");
	const hasDisplayItems = view === "equipped" && data.hasDisplayItems !== void 0 ? boolean(data.hasDisplayItems) : void 0;
	return {
		items,
		...view === "equipped" ? { hasDisplayItems: hasDisplayItems ?? items.length > 0 } : {},
		maxLevel: data.realmLevel === null ? 36 : integer(data.realmLevel),
		equippedInstanceId,
		capabilities: rows(data.capabilities).map(pageCapability)
	};
}
function parseRobotSoulDetail(value) {
	const out = record(value);
	if (out.mode !== "detail") throw new Error("本命物查询返回格式不完整");
	const facts = parseSoulArtifactOverview(out.overview);
	if (facts.items.length !== 1) throw new Error("本命物查询返回格式不完整");
	return {
		...facts.items[0],
		maxLevel: facts.maxLevel
	};
}
function parseRobotSoulInfo(value) {
	const out = record(value);
	const facts = parseSoulArtifactOverview(out.overview, "equipped");
	if (out.mode === "empty" && !facts.hasDisplayItems) return {
		code: "EMPTY",
		data: { message: "你还没有本命物，可在 积分商店 或 珍宝楼 购买" }
	};
	const artifact = facts.items.find((item) => item.instanceId === facts.equippedInstanceId);
	if (out.mode === "not_equipped" && facts.hasDisplayItems && !artifact) return {
		code: "NOT_EQUIPPED",
		capabilities: facts.capabilities,
		data: { message: "当前未炼化本命物" }
	};
	if (out.mode === "equipped" && artifact) return {
		code: "EQUIPPED",
		capabilities: facts.capabilities,
		data: {
			artifact,
			maxLevel: facts.maxLevel
		}
	};
	throw new Error("本命物查询返回格式不完整");
}

//#endregion
export { getBackendSoulArtifactOverview, parseRobotSoulDetail, parseRobotSoulInfo, parseSoulArtifactOverview };