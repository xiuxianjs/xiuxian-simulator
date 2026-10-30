import { markdownButtonLabel } from "../../../utils/buttonLabel.js";
import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { parseCategoryParams, parseRobotGlossaryView } from "../../../api/bot/glossary-robot-query.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/glossary/category/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const { category, page } = parseCategoryParams(e.MessageText ?? "");
	const loaded = await runRobotBusiness(e, "glossary.category", {
		keyword: "",
		category: category ?? "",
		page
	}, (value) => parseRobotGlossaryView(value, "category"), next);
	if (loaded.handled) return;
	const view = loaded.data;
	const policy = view.policy;
	if (!category) {
		const md = Format.createMarkdown();
		md.addText("📂 选择要浏览的词典分类：");
		md.addNewline();
		md.addNewline();
		for (const cat of policy.categories) {
			md.addButton(markdownButtonLabel(`${cat}`), { data: `/词典分类 ${cat}` });
			md.addText(" ");
		}
		md.addNewline();
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "词典分类",
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
			]
		}));
		return;
	}
	if (!policy.categoryValid) {
		const md = Format.createMarkdown();
		md.addText(`❌ 未知分类「${category}」`);
		md.addNewline();
		md.addText(`可用分类：${policy.categories.join("、")}`);
		md.addNewline();
		md.addNewline();
		for (const cat of policy.categories) {
			md.addButton(markdownButtonLabel(`${cat}`), { data: `/词典分类 ${cat}` });
			md.addText(" ");
		}
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "词典分类",
			header: [{
				label: "返回词典",
				command: "/词典"
			}],
			content: md,
			footer: [{
				label: "返回词典",
				command: "/词典"
			}, {
				label: "申请编辑",
				command: "/申请词典编辑权限"
			}]
		}));
		return;
	}
	const result = view.page;
	const md = Format.createMarkdown();
	if (result.entries.length === 0) {
		md.addText(`「${category}」分类下暂无词条`);
		md.addNewline();
		md.addNewline();
		md.addText("💡 你可以用 /录入词典 来创建词条~");
	} else {
		md.addText(`📂 ${category} · 词条列表`);
		md.addNewline();
		md.addNewline();
		for (const entry of result.entries) {
			const e = entry;
			md.addBlockquote(createQuoteMarkdown([`【${e.keyword}】`, `${e.content.slice(0, 30)}${e.content.length > 30 ? "..." : ""}`], [{
				label: "查看",
				command: `/词典 ${e.keyword}`
			}]));
		}
	}
	md.addNewline();
	md.addText("📂 切换分类：");
	md.addNewline();
	for (const cat of policy.categories) if (cat === category) md.addText(`[${cat}] `);
	else {
		md.addButton(markdownButtonLabel(`${cat}`), { data: `/词典分类 ${cat}` });
		md.addText(" ");
	}
	md.addNewline();
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "词典分类",
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
			command: `/词典分类 ${category} p{page}`
		}
	}));
});

//#endregion
export { res_default as default };