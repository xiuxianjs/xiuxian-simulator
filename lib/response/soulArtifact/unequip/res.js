import { markdownButtonLabel } from "../../../utils/buttonLabel.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { sendMiddlewareReply } from "../../middlewareReply.js";
import { withBusinessRecovery } from "../../businessRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseSoulArtifactUnequipResult } from "../../../api/bot/soul-artifact-unequip.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/soulArtifact/unequip/res.ts
/**
* 分离本命物指令
* /分离      → 显示确认提示
* /分离 确认 → 执行分离
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? e.name.startsWith("private.");
	const match = (e.MessageText ?? "").trim().match(/^[!！/#＃]?分离(?:\s*(确认))?$/);
	const isConfirmed = Boolean(match?.[1]);
	const [, parentNext] = useEvent();
	const renderFailure = adviceRenderer((reply) => sendMiddlewareReply(e, withBusinessRecovery("soul-artifacts.unequip", reply), true));
	if (!match) {
		await renderFailure({
			title: "",
			heading: "",
			text: "格式错误，请先核对本命物操作用法。",
			buttons: [],
			advice: []
		});
		return;
	}
	const response = await runRobotBusiness(e, "soul-artifacts.unequip", { confirmed: isConfirmed }, (value) => {
		if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("分离本命物响应不完整");
		const row = value;
		if (row.mode !== "confirmation" && row.mode !== "done" || typeof row.message !== "string") throw new Error("分离本命物响应不完整");
		const result = parseSoulArtifactUnequipResult(row.result);
		if (row.mode === "confirmation") {
			if (!result.artifact || result.artifact.previousLevel <= 0) throw new Error("分离本命物响应不完整");
			return {
				code: "CONFIRM",
				data: {
					name: result.artifact.name ?? "undefined",
					level: result.artifact.previousLevel,
					totalCost: result.artifact.totalCost,
					refundQty: result.artifact.refundQuantity
				}
			};
		}
		if (result.outcome === "confirmation") throw new Error("分离本命物响应不完整");
		return {
			code: "DONE",
			data: { message: row.message }
		};
	}, parentNext, renderFailure).catch(async () => {
		await renderFailure({
			title: "",
			heading: "",
			text: "本命物培养结果未获完整确认，请先核对当前状态、材料与原回执。",
			buttons: [],
			advice: []
		});
		return { handled: true };
	});
	if (response.handled) return;
	const result = response.data;
	if (result.code === "CONFIRM") {
		const md = Format.createMarkdown();
		md.addText("⚠️ 分离本命物确认");
		md.addNewline();
		md.addNewline();
		md.addText(`本命物：${result.data.name}`);
		md.addNewline();
		md.addText(`当前等级：Lv.${result.data.level}`);
		md.addNewline();
		md.addText(`投入筑灵石：${result.data.totalCost}`);
		md.addNewline();
		md.addText(`退还筑灵石：${result.data.refundQty}（60%）`);
		md.addNewline();
		md.addNewline();
		md.addText("分离后等级将重置为 Lv.0，品级和洗涤附加保留");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md,
			footer: [{
				label: "确认分离",
				command: "/分离 确认"
			}, {
				label: "取消",
				command: "/储物袋 本命"
			}]
		}));
		return;
	}
	const md = Format.createMarkdown();
	const displayMsg = result.data.message;
	md.addText(displayMsg);
	md.addNewline();
	md.addButton(markdownButtonLabel("储物袋 · 本命"), { data: "/储物袋 本命" });
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "",
		content: md
	}));
});

//#endregion
export { res_default as default };