import { isPrivateEvent } from "../../../utils/privateEvent.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { formatFlyMailMuteResult, parseFlyMailMuteCommand } from "../../../utils/flyMailCommand.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotFlyMailMute } from "../../../api/bot/flymail-mute.js";
import { Format, onResponse, useEvent, useMention } from "alemonjs";

//#region src/response/flyMail/mute/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [mention] = useMention();
	const bid = e?.UserId;
	const isPrivate = isPrivateEvent(e);
	const parsed = parseFlyMailMuteCommand(e.MessageText);
	if (!parsed) return;
	if (!isPrivate) {
		await message.send(FormatGui({
			bid,
			bar: false,
			content: Format.createMarkdown().addText("请私聊机器人管理飞信屏蔽设置。")
		}));
		return;
	}
	let targetUid = 0;
	let targetBid;
	if (parsed.targetArg && /^\d+$/.test(parsed.targetArg) && Number(parsed.targetArg) > 0) targetUid = Number(parsed.targetArg);
	else {
		const target = await mention.findOne();
		if (target.count && target.data?.UserId) targetBid = target.data.UserId;
	}
	const [, next] = useEvent();
	try {
		const response = await runRobotBusiness(e, parsed.action === "mute" ? "flymail.mute" : "flymail.unmute", {
			targetUid: Number.isFinite(targetUid) ? String(targetUid) : null,
			targetBid: targetBid ?? null
		}, parseRobotFlyMailMute, next, async (reply) => {
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: reply.title,
				content: Format.createMarkdown().addText(reply.text),
				footer: reply.buttons.length ? reply.buttons : void 0
			}));
		});
		if (response.handled) return;
		const result = formatFlyMailMuteResult(response.data, parsed.action);
		const md = Format.createMarkdown();
		md.addText(result.message);
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "飞信",
			content: md,
			footer: [...parsed.action === "mute" && targetUid > 0 && result.outcome === "updated" ? [{
				label: "解除屏蔽",
				command: `/飞信解除 ${targetUid}`
			}] : [], {
				label: "查看飞信",
				command: "/飞信"
			}]
		}));
	} catch {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "飞信",
			content: Format.createMarkdown().addText("操作结果待确认，请稍后查看。"),
			footer: [{
				label: "查看飞信",
				command: "/飞信"
			}]
		}));
	}
});

//#endregion
export { res_default as default };