import { requestBackend } from "./client.js";
import { GLOSSARY_PAGE_SIZE } from "../../constants/glossary.js";

//#region src/api/bot/glossary-queries.ts
function identity(bid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return bid;
}
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("词典接口返回格式不完整");
	return value;
}
function number(value) {
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error("词典接口缺少数值字段");
	return value;
}
function text(value) {
	if (typeof value !== "string") throw new Error("词典接口缺少文本字段");
	return value;
}
function parseGlossaryEntry(value) {
	const row = record(value);
	return {
		id: number(row.id),
		keyword: text(row.keyword),
		content: text(row.content),
		category: text(row.category),
		authorName: text(row.authorName),
		editCount: number(row.editCount),
		lastEditorName: text(row.lastEditorName)
	};
}
async function getBackendGlossary(bid, page, filter = {}) {
	const data = record(await requestBackend(identity(bid), "get_glossary", { query: {
		...filter,
		page,
		pageSize: 5
	} }));
	if (!Array.isArray(data.items)) throw new Error("词典接口缺少列表");
	const total = number(data.total);
	const pageSize = number(data.pageSize);
	if (pageSize !== 5) throw new Error("词典接口分页大小不一致");
	return {
		entries: data.items.map(parseGlossaryEntry),
		total,
		totalPages: Math.ceil(total / pageSize),
		currentPage: number(data.page)
	};
}
async function getBackendGlossaryEntry(bid, keyword) {
	const data = await requestBackend(identity(bid), "get_glossary_entry", { query: { keyword } });
	return data === null ? null : parseGlossaryEntry(data);
}

//#endregion
export { getBackendGlossary, getBackendGlossaryEntry, parseGlossaryEntry };