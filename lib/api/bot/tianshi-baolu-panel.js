import { requestBackend } from "./client.js";

//#region src/api/bot/tianshi-baolu-panel.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("天师宝录响应不完整");
	return value;
}
function integer(value, field, minimum = 0) {
	if (typeof value !== "number" || !Number.isInteger(value) || value < minimum) throw new Error(`天师宝录${field}不完整`);
	return value;
}
function text(value, field) {
	if (typeof value !== "string") throw new Error(`天师宝录${field}不完整`);
	return value;
}
function row(value) {
	const data = record(value);
	if (typeof data.unlocked !== "boolean") throw new Error("天师宝录解锁状态不完整");
	return {
		id: integer(data.id, "条目ID", 1),
		name: text(data.name, "条目名称"),
		entryType: text(data.entryType, "条目类型"),
		typeName: text(data.typeName, "条目类型名称"),
		condition: text(data.condition, "解锁条件"),
		description: text(data.description, "说明"),
		bonusText: text(data.bonusText, "加成"),
		unlocked: data.unlocked
	};
}
/**
* Preserve the Node panel order without allowing a GET to write state:
* reconcile durable unlocks first, then read the pure paginated panel.
*/
async function getBackendTianshiBaoluPanel(bid, uid, category, page) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseBackendTianshiBaoluPanel(await requestBackend(bid, "post_players_id_tianshi_baolu_panel_query", {
		path: { id: uid },
		query: {
			type: category,
			page
		}
	}));
}
function parseBackendTianshiBaoluPanel(value) {
	const data = record(value);
	const newUnlockCount = integer(data.newUnlockCount, "新点亮数量");
	if (!Array.isArray(data.rows) || data.rows.length > 5) throw new Error("天师宝录条目列表不完整");
	const totalCount = integer(data.totalCount, "总条目数");
	const unlockedCount = integer(data.unlockedCount, "已点亮数");
	const filteredCount = integer(data.filteredCount, "分类条目数");
	const safePage = integer(data.page, "页码", 1);
	const totalPages = integer(data.totalPages, "总页数", 1);
	if (unlockedCount > totalCount || filteredCount > totalCount || filteredCount === 0 && totalPages !== 1 || filteredCount > 0 && safePage > totalPages) throw new Error("天师宝录分页状态不一致");
	return {
		newUnlockCount,
		totalCount,
		unlockedCount,
		filteredCount,
		totalBonusText: text(data.totalBonusText, "累计加成"),
		page: safePage,
		totalPages,
		rows: data.rows.map(row)
	};
}

//#endregion
export { getBackendTianshiBaoluPanel, parseBackendTianshiBaoluPanel };