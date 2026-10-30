import { boolean, fields, integer, list, object, page, text } from "./schema.js";
import { intentIdSchema, mutation, observation, validateIntentId } from "./mutation.js";
import { parseRobotGlossaryView } from "../api/bot/glossary-robot-query.js";
import { parseRobotGlossaryApply, parseRobotGlossaryDelete, parseRobotGlossaryUpsert } from "../api/bot/glossary-actions-robot.js";
import { ExposeError } from "alemonjs";

//#region src/expose/glossary-actions.ts
const entry = object({
	...fields(integer, "id editCount"),
	...fields(text, "keyword content category authorName lastEditorName")
});
const policy = object({
	categories: list(text),
	defaultCategory: text,
	...fields(integer, "keywordMaxLength contentMaxLength"),
	categoryValid: boolean
});
const result = object({
	exact: entry,
	page: object({
		entries: list(entry),
		...fields(integer, "total totalPages currentPage")
	}),
	policy
}, [
	"exact",
	"page",
	"policy"
]);
const keyword = {
	type: "string",
	minLength: 1,
	maxLength: 100
};
const glossaryActions = {
	search_glossary: observation("浏览词典或按关键词搜索；精确命中返回 exact，否则返回分页结果。词典内容由玩家编辑，不代表服务端游戏规则。", "glossary.query", object({
		keyword,
		page
	}, ["keyword", "page"]), result, (input) => `/词典${input.keyword ? ` ${input.keyword}` : ""} p${input.page ?? 1}`, (data, input) => parseRobotGlossaryView(data, input.keyword ? "search" : "browse"), (input) => ({
		keyword: input.keyword ?? "",
		category: "",
		page: input.page ?? 1
	})),
	browse_glossary_category: observation("查询词典分类或浏览分类条目；policy.categoryValid 表示服务端是否认可分类。", "glossary.category", object({
		category: keyword,
		page
	}, ["category", "page"]), result, (input) => `/词典分类${input.category ? ` ${input.category}` : ""} p${input.page ?? 1}`, (data) => parseRobotGlossaryView(data, "category"), (input) => ({
		keyword: "",
		category: input.category ?? "",
		page: input.page ?? 1
	})),
	apply_glossary_editor: mutation("申请词典编辑权限；服务端检查资格和申请状态，提交不代表已获授权。", "glossary.apply", object({
		reason: {
			type: "string",
			maxLength: 100
		},
		intentId: intentIdSchema
	}, ["reason", "intentId"]), object({ success: boolean }), (input) => `/申请词典编辑权限${input.reason ? ` ${input.reason}` : ""}`, parseRobotGlossaryApply, (input) => ({ reason: input.reason ?? "" }), (input) => validateIntentId(input.intentId), { intentId: (input) => input.intentId }),
	upsert_glossary_entry: mutation("创建或更新词典条目，content 按现有指令语法可含分类前缀；服务端检查编辑权限、配额和敏感内容。失败时检查回复中的已完成阶段，再查询词条，避免重复写入。新操作使用新 intentId，同次重试沿用原编号。", "glossary.upsert", object({
		keyword,
		content: {
			type: "string",
			minLength: 1,
			maxLength: 1e3
		},
		intentId: intentIdSchema
	}, ["intentId"]), object({
		outcome: text,
		category: text,
		entryId: integer,
		isNew: boolean,
		dailyLimit: integer,
		used: integer,
		completedStage: text
	}), (input) => `/录入词典 ${input.keyword} ${input.content}`, (data) => {
		const parsed = parseRobotGlossaryUpsert(data);
		if (parsed.mode !== "write" || !parsed.result) throw new Error("词典录入回执不完整");
		return parsed.result;
	}, (input) => ({
		mode: "write",
		keyword: input.keyword,
		content: input.content
	}), (input) => {
		validateIntentId(input.intentId);
		if (/\s/u.test(input.keyword) || !input.content.trim() || input.content !== input.content.trim() || /[\r\n]/u.test(input.content)) throw new ExposeError("INVALID_INPUT", "词条名不能含空白；内容必须为去除首尾空格的单行文本");
	}, { intentId: (input) => input.intentId }),
	delete_glossary_entry: mutation("删除指定词典条目，服务端校验权限和奖励状态；若提示日志未确认，词条可能已删除，应先查询。新操作使用新 intentId，同次重试沿用原编号。", "glossary.delete", object({
		keyword,
		intentId: intentIdSchema
	}, ["intentId"]), object({
		success: boolean,
		forbidden: boolean,
		reason: text
	}), (input) => `/删除词典 ${input.keyword}`, parseRobotGlossaryDelete, (input) => ({ keyword: input.keyword }), (input) => {
		validateIntentId(input.intentId);
		if (input.keyword !== input.keyword.trim() || /[\r\n]/u.test(input.keyword)) throw new ExposeError("INVALID_INPUT", "词条名必须为去除首尾空格的单行文本");
	}, { intentId: (input) => input.intentId })
};

//#endregion
export { glossaryActions };