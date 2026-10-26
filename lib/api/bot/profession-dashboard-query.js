import { requestBackend } from "./client.js";
import { parseFeatureAccess } from "./tianshu-content.js";

//#region src/api/bot/profession-dashboard-query.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("职业面板接口资料不完整");
	return value;
}
function boolean(value) {
	if (typeof value !== "boolean") throw new Error("职业面板接口缺少状态");
	return value;
}
function number(value) {
	if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("职业面板接口缺少数值");
	return value;
}
function integer(value) {
	const result = number(value);
	if (!Number.isSafeInteger(result)) throw new Error("职业面板接口数值无效");
	return result;
}
function text(value) {
	if (typeof value !== "string") throw new Error("职业面板接口缺少文本");
	return value;
}
function nullableText(value) {
	return value === null ? null : text(value);
}
function nullableInteger(value) {
	return value === null ? null : integer(value);
}
function array(value) {
	if (!Array.isArray(value)) throw new Error("职业面板接口缺少列表");
	return value;
}
function alchemyAction(value) {
	if (value === "recipes" || value === "continueGuide" || value === "joinGuide" || value === "none") return value;
	throw new Error("职业面板接口缺少炼丹操作");
}
function lingzhiAction(value) {
	if (value === "plots" || value === "joinGuide") return value;
	throw new Error("职业面板接口缺少灵药操作");
}
function equipment(value) {
	const row = record(value);
	return {
		typeName: text(row.typeName),
		equipped: boolean(row.equipped),
		equipmentName: nullableText(row.equipped === false && row.equipmentName === void 0 ? null : row.equipmentName),
		gradeName: nullableText(row.equipped === false && row.gradeName === void 0 ? null : row.gradeName)
	};
}
async function getBackendProfessionDashboard(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseProfessionDashboard(await requestBackend(bid, "get_players_id_professions_dashboard", { path: { id: uid } }));
}
function parseProfessionDashboard(value) {
	const data = record(value);
	const access = record(data.access);
	const alchemy = record(data.alchemy);
	const guide = record(alchemy.guide);
	const lingzhi = record(data.lingzhi);
	return {
		access: {
			features: parseFeatureAccess(access.features),
			canUseProfessionAndCave: boolean(access.canUseProfessionAndCave),
			canJoinAlchemyGuide: boolean(access.canJoinAlchemyGuide)
		},
		alchemy: {
			unlocked: boolean(alchemy.unlocked),
			title: text(alchemy.title),
			level: integer(alchemy.level),
			exp: integer(alchemy.exp),
			nextExpRequired: nullableInteger(alchemy.nextExpRequired),
			totalCrafts: integer(alchemy.totalCrafts),
			learnedRecipeCount: integer(alchemy.learnedRecipeCount),
			equipments: array(alchemy.equipments).map(equipment),
			canAdvance: boolean(alchemy.canAdvance),
			showSection: boolean(alchemy.showSection),
			primaryAction: alchemyAction(alchemy.primaryAction),
			guide: {
				active: boolean(guide.active),
				step: nullableInteger(guide.step),
				expiresAt: nullableInteger(guide.expiresAt),
				stepLabel: text(guide.stepLabel)
			}
		},
		lingzhi: {
			cultivatedCount: lingzhi.cultivatedCount === void 0 ? void 0 : integer(lingzhi.cultivatedCount),
			cultivatableCount: lingzhi.cultivatableCount === void 0 ? void 0 : integer(lingzhi.cultivatableCount),
			cultivationCostText: lingzhi.cultivationCostText === void 0 ? void 0 : text(lingzhi.cultivationCostText),
			unlocked: boolean(lingzhi.unlocked),
			title: text(lingzhi.title),
			level: integer(lingzhi.level),
			exp: integer(lingzhi.exp),
			nextExpRequired: nullableInteger(lingzhi.nextExpRequired),
			dailyExpGained: integer(lingzhi.dailyExpGained),
			dailyExpCap: integer(lingzhi.dailyExpCap),
			maxPlots: integer(lingzhi.maxPlots),
			maxFieldGrade: integer(lingzhi.maxFieldGrade),
			maxFieldGradeLabel: text(lingzhi.maxFieldGradeLabel),
			yieldBonus: integer(lingzhi.yieldBonus),
			primaryAction: lingzhiAction(lingzhi.primaryAction)
		}
	};
}

//#endregion
export { getBackendProfessionDashboard, parseProfessionDashboard };