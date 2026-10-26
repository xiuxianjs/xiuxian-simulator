import { parseBackendDungeonCatalog, parseBackendDungeonDetail } from "./queries.js";
import { dungeonDetailView } from "../../response/dungeon/detail/view.js";

//#region src/api/bot/dungeon-robot-query.ts
function dungeonCatalogArguments(text) {
	const match = text.trim().match(/^(!|！|\/|#|＃)?(查看秘境|秘境列表)\s*(\d+)?$/);
	const page = match?.[3] ? Math.max(1, Number(match[3])) : 1;
	return { pageText: String(page) };
}
function dungeonDetailArguments(text) {
	const match = text.trim().match(/^(!|！|\/|#|＃)?秘境详情\s+(.+)$/);
	return { name: match?.[2] ? match[2].trim() : null };
}
function parseRobotDungeonCatalog(value) {
	const data = parseBackendDungeonCatalog(value);
	return {
		code: data.pagination.total === 0 ? "EMPTY" : "OK",
		data
	};
}
function parseRobotDungeonDetail(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("秘境详情响应不完整");
	const row = value;
	if (row.outcome === "usage") return { outcome: "usage" };
	if (row.outcome !== "result") throw new Error("秘境详情响应不完整");
	return {
		outcome: "result",
		data: dungeonDetailView(parseBackendDungeonDetail(row.data))
	};
}

//#endregion
export { dungeonCatalogArguments, dungeonDetailArguments, parseRobotDungeonCatalog, parseRobotDungeonDetail };