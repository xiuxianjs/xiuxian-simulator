import { requestBackend } from "./client.js";
import { number as number$1 } from "../schemas/ranking-values.js";

//#region src/api/bot/learned-books-queries.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("已学功法接口格式不完整");
	return value;
}
function number(value) {
	if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("已学功法接口缺少数值字段");
	return value;
}
const integer = (value) => number$1(value, "已学功法接口缺少数值字段");
function text(value) {
	if (typeof value !== "string") throw new Error("已学功法接口缺少文本字段");
	return value;
}
function boolean(value) {
	if (typeof value !== "boolean") throw new Error("已学功法接口缺少操作资格");
	return value;
}
function mapLearnedBookFacts(value) {
	if (!Array.isArray(value)) throw new Error("已学功法接口缺少列表");
	return value.map((value) => {
		const row = record(value);
		return {
			id: integer(row.id),
			name: text(row.name),
			skillType: text(row.skillType),
			damageType: row.damageType === null ? null : text(row.damageType),
			status: integer(row.status),
			statusText: text(row.statusText),
			listText: text(row.listText),
			slotText: text(row.slotText),
			attributeSummary: text(row.attributeSummary),
			canHide: boolean(row.canHide),
			canReset: boolean(row.canReset),
			isHidden: integer(row.isHidden),
			upgradeCount: integer(row.upgradeCount),
			proficiency: integer(row.proficiency),
			physicalAttack: integer(row.physicalAttack),
			magicAttack: integer(row.magicAttack),
			physicalDefense: integer(row.physicalDefense),
			magicDefense: integer(row.magicDefense),
			hp: integer(row.hp),
			physicalAttackPercent: number(row.physicalAttackPercent),
			magicAttackPercent: number(row.magicAttackPercent),
			physicalDefensePercent: number(row.physicalDefensePercent),
			magicDefensePercent: number(row.magicDefensePercent),
			hpPercent: number(row.hpPercent),
			speed: integer(row.speed),
			critRate: number(row.critRate),
			critDamage: number(row.critDamage),
			maxPhysicalAttack: integer(row.maxPhysicalAttack),
			maxMagicAttack: integer(row.maxMagicAttack),
			maxPhysicalDefense: integer(row.maxPhysicalDefense),
			maxMagicDefense: integer(row.maxMagicDefense),
			maxHp: integer(row.maxHp),
			maxPhysicalAttackPercent: number(row.maxPhysicalAttackPercent),
			maxMagicAttackPercent: number(row.maxMagicAttackPercent),
			maxPhysicalDefensePercent: number(row.maxPhysicalDefensePercent),
			maxMagicDefensePercent: number(row.maxMagicDefensePercent),
			maxHpPercent: number(row.maxHpPercent),
			maxSpeed: integer(row.maxSpeed),
			maxCritRate: number(row.maxCritRate),
			maxCritDamage: number(row.maxCritDamage)
		};
	});
}
async function getBackendLearnedBooks(bid, uid, page, visibility) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseBackendLearnedBooks(await requestBackend(bid, "get_players_id_skill_books_learned", {
		path: { id: uid },
		query: {
			visibility,
			page,
			pageSize: 5
		}
	}));
}
function parseBackendLearnedBooks(value) {
	const data = record(value);
	if (typeof data.canUseFifthLayerFeature !== "boolean" || integer(data.pageSize) !== 5) throw new Error("已学功法接口资格或分页不完整");
	return {
		items: mapLearnedBookFacts(data.items),
		inUseBooks: mapLearnedBookFacts(data.inUseBooks),
		total: integer(data.total),
		totalPages: integer(data.totalPages),
		currentPage: integer(data.currentPage),
		proficiencyPoints: integer(data.proficiencyPoints),
		canUseFifthLayerFeature: data.canUseFifthLayerFeature
	};
}
function parseRobotLearnedBooks(value) {
	const data = record(value);
	return {
		displayPage: number(data.displayPage),
		page: parseBackendLearnedBooks(data.page)
	};
}

//#endregion
export { getBackendLearnedBooks, mapLearnedBookFacts, parseBackendLearnedBooks, parseRobotLearnedBooks };