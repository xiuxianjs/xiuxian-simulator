import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotCompanionOathUpgrade } from "../../../api/bot/companion-actions-robot.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/companion/upgradeOath/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const rawText = (e.MessageText ?? "").trim();
	const confirmed = /^[!！/#＃]?升级誓约\s+确认$/.test(rawText);
	const [, next] = useEvent();
	const response = await runRobotBusiness(e, "companion.upgrade-oath", { confirmed }, parseRobotCompanionOathUpgrade, next, async (reply) => {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: reply.title,
			content: Format.createMarkdown().addText(reply.text),
			footer: reply.buttons.length ? reply.buttons : void 0
		}));
	});
	if (response.handled) return;
	const result = response.data;
	const { partnerName } = result;
	if (result.mode === "preview") {
		const { currentBlessingPercent, upgradedBlessingPercent } = result;
		const md = Format.createMarkdown();
		md.addText(`确定要将你与「${partnerName}」的普通誓约升级为高级誓约吗？`);
		md.addNewline();
		md.addText("升级后将消耗：三生同心笺×1");
		md.addNewline();
		md.addText(`誓约祝福：+${currentBlessingPercent}% -> +${upgradedBlessingPercent}%`);
		md.addNewline();
		md.addText("⚠️ 原普通誓约纪念物「同心玉佩」若仍在背包中，将被直接丢弃，这是升级代价");
		md.addNewline();
		md.addText("⚠️ 结缘日期、灵契值、同心值都会保留");
		md.addNewline();
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md,
			footer: [{
				label: "确认升级",
				command: "/升级誓约 确认"
			}]
		}));
		return;
	}
	const md = Format.createMarkdown();
	md.addText(result.message);
	md.addNewline();
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "",
		content: md
	}));
});

//#endregion
export { res_default as default };