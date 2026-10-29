import { parseStorageLockResult } from "../../../api/bot/storage-lock.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice, appendMiddlewareBlocks } from "../../middlewareReply.js";
import { storageLockRecoveryTips } from "../../storageLockRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/storage/lock/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e.UserId;
	const isPrivate = e.isPrivate ?? false;
	const text = (e.MessageText || "").replace(/^(!|！|\/|#|＃)?锁定\s*/, "").trim();
	const args = text ? text.split(/\s+/) : [];
	const [, parentNext] = useEvent();
	const response = await runRobotBusiness(e, "storage.lock", { args }, (value) => {
		if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("锁定接口响应不完整");
		const row = value;
		if (typeof row.mode !== "string" || ![
			"category",
			"id",
			"name"
		].includes(row.mode) || typeof row.category !== "string" || typeof row.compound !== "boolean" || typeof row.itemId !== "number" || !Number.isFinite(row.itemId) || typeof row.itemName !== "string") throw new Error("锁定接口响应不完整");
		const asset = {
			材料: "item",
			道具: "item",
			装备: "equipment",
			天工: "professionTool",
			功法: "skillBook",
			本命: "soulArtifact"
		}[row.category.split("-")[0]];
		const result = parseStorageLockResult(row.result, row.mode === "id" ? "instance" : row.mode, asset);
		if (!result.view.success || result.view.count <= 0) throw new Error("锁定接口展示结果无效");
		return {
			mode: row.mode,
			category: row.category,
			compound: row.compound,
			itemId: row.itemId,
			itemName: row.itemName,
			result: result.view,
			nameIssues: result.kind === "name" ? result.name.issues : []
		};
	}, parentNext, adviceRenderer(async (reply) => {
		const md = Format.createMarkdown();
		const plainBlocks = (reply.blocks ?? []).filter((block) => !block.quoted && !block.inlineButtons?.length);
		if (!plainBlocks.length || plainBlocks.map((block) => block.text).join("") !== reply.text) md.addText(reply.text);
		for (const block of plainBlocks) if (/^\n+$/.test(block.text)) for (const _ of block.text) md.addNewline();
		else md.addText(block.text);
		if (reply.quote) md.addBlockquote(Format.createMarkdown().addText(reply.quote));
		appendMiddlewareBlocks(md, reply.blocks?.filter((block) => block.quoted || block.inlineButtons?.length));
		appendMiddlewareAdvice(md, reply.advice);
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md,
			footer: reply.buttons.length ? reply.buttons : void 0
		}));
	})).catch(async () => {
		const md = Format.createMarkdown();
		md.addText("锁定物品失败，请稍后再试或联系运营。");
		appendMiddlewareAdvice(md, storageLockRecoveryTips("storage.lock", "结果未确认"));
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
		return { handled: true };
	});
	if (response.handled) return;
	const data = response.data;
	const lines = ["✅ 锁定成功", ""];
	if (data.mode === "name") lines.push(`物品: ${data.itemName}`, data.result.message);
	else if (data.mode === "id") lines.push(`分类: ${data.category}`, `物品ID: ${data.itemId}`, data.result.message);
	else lines.push(`分类: ${data.category}`, `数量: ${data.result.count} 件`);
	const md = Format.createMarkdown();
	md.addText(lines.join("\n"));
	if (data.nameIssues.length) {
		md.addNewline().addText("另有项目未完成或需核对，请先查看各分类当前状态。");
		appendMiddlewareAdvice(md, storageLockRecoveryTips("storage.lock", "名称操作存在问题明细"));
	}
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "",
		content: md
	}));
});

//#endregion
export { res_default as default };