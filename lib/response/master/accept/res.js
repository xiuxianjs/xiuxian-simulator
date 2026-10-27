import { markdownButtonLabel } from "../../../utils/buttonLabel.js";
import { FormatGui, addOptions } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { parseMasterDecision } from "../../../api/bot/master-actions.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/master/accept/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const discipleArg = (e.MessageText?.trim() ?? "").match(/^[!！/#＃]?同意拜师(?:\s+(.+))?$/)?.[1]?.trim();
	let result;
	try {
		const loaded = await runRobotBusiness(e, "master.binding-accept", { discipleArg: discipleArg ?? "" }, parseMasterDecision, next);
		if (loaded.handled) return;
		result = loaded.data;
	} catch (error) {
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: Format.createMarkdown().addText(error instanceof Error ? error.message : "操作失败")
		}));
		return;
	}
	if (result.outcome === "list") {
		const md = Format.createMarkdown();
		md.addBold("【拜师申请】");
		md.addNewline();
		if (result.received.length === 0) {
			md.addText("暂无待处理的拜师申请");
			md.addNewline().addButton(markdownButtonLabel("查看我的师门"), { data: "/我的师门" });
		} else {
			md.addText("待处理的拜师申请：");
			md.addNewline();
			result.received.forEach((proposal, index) => {
				md.addText(`【${index + 1}】${proposal.fromName}`);
				md.addNewline();
				md.addBlockquote(addOptions(Format.createMarkdown().addText(`UID：${proposal.fromUserId}`).addNewline().addText(`${proposal.fromRealm}`), [{
					label: "同意收徒",
					command: `/同意拜师 ${proposal.fromUserId}`
				}]));
			});
		}
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
		return;
	}
	const md = Format.createMarkdown();
	md.addText(result.message);
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "",
		content: md
	}));
});

//#endregion
export { res_default as default };