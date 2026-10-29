import { FormatGui, addOptions } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { parseRobotCompanionProposalAction } from "../../../api/bot/companion-actions-robot.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/companion/accept/res.ts
/**
* 同意道侣申请指令
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const text = e.MessageText?.trim() ?? "";
	const proposerName = text.match(/^[!！/#＃]?同意道侣\s+(.+)$/)?.[1]?.trim();
	const [, next] = useEvent();
	if (!/^[!！/#＃]?同意道侣(?:\s+.+)?$/.test(text)) return next();
	const response = await runRobotBusiness(e, "companion.accept", { name: proposerName ?? "" }, parseRobotCompanionProposalAction, next, async (reply) => {
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
	if (result.mode === "list") {
		if (result.received.length === 0) {
			const md = Format.createMarkdown();
			md.addBold("【道侣申请】");
			md.addNewline();
			md.addText("暂无待处理的道侣申请");
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md
			}));
			return;
		}
		const md = Format.createMarkdown();
		md.addBold("【道侣申请】");
		md.addNewline();
		md.addText("待处理的道侣申请：");
		md.addNewline();
		for (let i = 0; i < result.received.length; i++) {
			const p = result.received[i];
			md.addText(`【${i + 1}】${p.fromName}（灵契值：${p.intimacy}）`);
			addOptions(md, [{
				label: "同意",
				command: `/同意道侣 ${p.fromName}`
			}, {
				label: "拒绝",
				command: `/拒绝道侣 ${p.fromName}`
			}]);
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
	const repeatMsg = result.message;
	md.addText(repeatMsg);
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "",
		content: md
	}));
});

//#endregion
export { res_default as default };