import { markdownButtonLabel } from "../../../utils/buttonLabel.js";
import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { parseQueryParams, parseRobotGlossaryView } from "../../../api/bot/glossary-robot-query.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/glossary/query/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const { keyword, page } = parseQueryParams(e.MessageText ?? "");
	const loaded = await runRobotBusiness(e, "glossary.query", {
		keyword: keyword ?? "",
		category: "",
		page
	}, (value) => parseRobotGlossaryView(value, keyword ? "search" : "browse"), next);
	if (loaded.handled) return;
	const view = loaded.data;
	if (!keyword) {
		const result = view.page;
		const policy = view.policy;
		const md = Format.createMarkdown();
		if (result.entries.length === 0) {
			md.addText("词典暂无内容，等待有缘人来编撰~");
			md.addNewline();
		} else for (const entry of result.entries) {
			const e = entry;
			md.addBlockquote(createQuoteMarkdown([`【${e.keyword}】【${e.category}】`, `${e.content.slice(0, 30)}${e.content.length > 30 ? "..." : ""}`], [{
				label: "查看",
				command: `/词典 ${e.keyword}`
			}]));
		}
		md.addText("📂 按分类浏览：");
		md.addNewline();
		for (const cat of policy.categories) {
			md.addButton(markdownButtonLabel(`${cat}`), { data: `/词典分类 ${cat}` });
			md.addText(" ");
		}
		md.addNewline();
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "词典",
			header: [{
				label: "返回",
				command: "/更多"
			}],
			content: md,
			footer: [
				{
					label: "申请编辑",
					command: "/申请词典编辑权限"
				},
				{
					label: "录入词典",
					command: "/录入词典"
				},
				{
					label: "更多",
					command: "/更多"
				}
			],
			nav: {
				current: result.currentPage,
				total: result.totalPages,
				count: result.total,
				command: "/词典 p{page}"
			}
		}));
		return;
	}
	const exact = view.exact;
	if (exact) {
		const entry = exact;
		const md = Format.createMarkdown();
		md.addText(`【${entry.keyword}】【${entry.category}】`);
		md.addNewline();
		md.addNewline();
		md.addText(entry.content);
		md.addNewline();
		md.addNewline();
		md.addBlockquote(Format.createMarkdown().addText(`作者：${entry.authorName}`));
		if (entry.editCount > 0) {
			md.addText(` | 编辑${entry.editCount}次`);
			if (entry.lastEditorName) md.addText(` | 最后编辑：${entry.lastEditorName}`);
		}
		md.addNewline();
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "词典",
			header: [{
				label: "返回词典",
				command: "/词典"
			}],
			content: md,
			footer: [
				{
					label: "返回词典",
					command: "/词典"
				},
				{
					label: `${entry.category}分类`,
					command: `/词典分类 ${entry.category}`
				},
				{
					label: "申请编辑",
					command: "/申请词典编辑权限"
				},
				{
					label: "录入词典",
					command: "/录入词典"
				}
			]
		}));
		return;
	}
	const result = view.page;
	if (result.entries.length === 0) {
		const md = Format.createMarkdown();
		md.addText(`未找到「${keyword}」相关词条`);
		md.addNewline();
		md.addNewline();
		md.addText("💡 你可以录入该词条，贡献你的修仙知识~");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "词典",
			content: md,
			footer: [
				{
					label: "返回词典",
					command: "/词典"
				},
				{
					label: "申请编辑",
					command: "/申请词典编辑权限"
				},
				{
					label: "录入词典",
					command: "/录入词典"
				}
			]
		}));
		return;
	}
	const md = Format.createMarkdown();
	md.addText(`🔍 搜索「${keyword}」：`);
	md.addNewline();
	md.addNewline();
	for (const entry of result.entries) {
		const e = entry;
		md.addBlockquote(createQuoteMarkdown([`【${e.keyword}】【${e.category}】`, `${e.content.slice(0, 30)}${e.content.length > 30 ? "..." : ""}`], [{
			label: "查看",
			command: `/词典 ${e.keyword}`
		}]));
	}
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "词典",
		header: [{
			label: "返回词典",
			command: "/词典"
		}],
		content: md,
		footer: [
			{
				label: "返回词典",
				command: "/词典"
			},
			{
				label: "申请编辑",
				command: "/申请词典编辑权限"
			},
			{
				label: "录入词典",
				command: "/录入词典"
			}
		],
		nav: {
			current: result.currentPage,
			total: result.totalPages,
			count: result.total,
			command: `/词典 ${keyword} p{page}`
		}
	}));
});

//#endregion
export { res_default as default };