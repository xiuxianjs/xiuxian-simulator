import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseCreateParams, parseRobotGlossaryUpsert } from "../../../api/bot/glossary-actions-robot.js";
import { glossaryFeedbackMessage } from "../feedback.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/glossary/create/res.ts
/**
* 录入词典
*
* 指令格式：
*   /录入词典 词条名 内容
*   /录入词典 词条名 分类 内容
*
* 权限：仅白名单玩家可操作
* 风控：敏感词过滤 + 每日录入限额 + 操作日志
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const renderFeedback = async (reply) => {
		await message.send(glossaryFeedbackMessage(e, reply));
	};
	const parsed = parseCreateParams(e.MessageText ?? "");
	const args = parsed.empty ? {
		mode: "help",
		keyword: "",
		content: ""
	} : parsed.noContent ? {
		mode: "invalid",
		keyword: parsed.keyword,
		content: ""
	} : {
		mode: "write",
		keyword: parsed.keyword,
		content: parsed.content
	};
	const loaded = await runRobotBusiness(e, "glossary.upsert", args, parseRobotGlossaryUpsert, next, renderFeedback);
	if (loaded.handled) return;
	if (parsed.empty) {
		if (loaded.data.mode !== "help") throw new Error("词典帮助响应不完整");
		const view = loaded.data.view;
		const quota = view.quota;
		const used = quota.used;
		const policy = view.policy;
		const md = Format.createMarkdown();
		md.addText("格式：/录入词典 词条名 内容");
		md.addNewline();
		md.addText("例如：/录入词典 灵石 修仙界的通用货币");
		md.addNewline();
		md.addNewline();
		md.addText("也可指定分类：/录入词典 词条名 分类 内容");
		md.addNewline();
		md.addText(`可用分类：${policy.categories.join("、")}`);
		md.addNewline();
		md.addNewline();
		md.addText(`词条名上限${policy.keywordMaxLength}字，内容上限${policy.contentMaxLength}字`);
		md.addNewline();
		md.addText(`今日已录入：${used}/${quota.dailyLimit}`);
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "录入词典",
			content: md,
			footer: [{
				label: "返回词典",
				command: "/词典"
			}, {
				label: "词典分类",
				command: "/词典分类"
			}]
		}));
		return;
	}
	if (parsed.noContent || loaded.data.mode !== "write") throw new Error("词典录入响应不完整");
	const result = loaded.data.result;
	const md = Format.createMarkdown();
	if (result.isNew) {
		md.addText(`✅ 词条「${parsed.keyword}」创建成功`);
		md.addNewline();
		md.addText(`分类：${result.category}`);
		md.addNewline();
		md.addText(`今日已录入：${result.used}/${result.dailyLimit}`);
	} else {
		md.addText(`✅ 词条「${parsed.keyword}」更新成功`);
		md.addNewline();
		md.addText(`分类：${result.category}`);
		md.addNewline();
		md.addText(`今日已录入：${result.used}/${result.dailyLimit}`);
	}
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "词典",
		content: md,
		footer: [
			{
				label: "查看词条",
				command: `/词典 ${parsed.keyword}`
			},
			{
				label: "返回词典",
				command: "/词典"
			},
			{
				label: "继续录入",
				command: "/录入词典"
			}
		]
	}));
});

//#endregion
export { res_default as default };