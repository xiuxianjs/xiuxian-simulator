import { isPrivateEvent } from "../../../utils/privateEvent.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { parseRobotFlyMailMute } from "../../../api/bot/flymail-mute.js";
import { parseFlyMailMuteCommand } from "../../../utils/flyMailCommand.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent, useMention } from "alemonjs";

//#region src/response/flyMail/mute/res.ts
const MUTE_FEEDBACK = /* @__PURE__ */ new Set([
	"不能对自己进行操作",
	"该用户不存在",
	"参数无效",
	"飞信服务暂不可用"
]);
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const [mention] = useMention();
	const bid = e?.UserId;
	const isPrivate = isPrivateEvent(e);
	const parsed = parseFlyMailMuteCommand(e.MessageText);
	if (!parsed) return next();
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
	const numericTarget = /^\d+$/.test(parsed.targetArg ?? "") ? Number(parsed.targetArg) : 0;
	if (Number.isSafeInteger(numericTarget) && numericTarget > 0) targetUid = numericTarget;
	else {
		const target = await mention.findOne();
		if (target.count && target.data?.UserId) targetBid = target.data.UserId;
	}
	try {
		if ((await runRobotBusiness(e, parsed.action === "mute" ? "flymail.mute" : "flymail.unmute", {
			targetUid: String(targetUid),
			targetBid: targetBid ?? null
		}, parseRobotFlyMailMute, next, async (reply) => {
			const locked = reply.text.startsWith("炼气二层及以上方可开启该功能");
			const text = reply.text === parsed.usageText || MUTE_FEEDBACK.has(reply.text) ? reply.text : locked ? "炼气二层及以上方可使用飞信屏蔽设置。" : "飞信屏蔽操作未完成。";
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: "飞信 · 屏蔽设置",
				content: Format.createMarkdown().addText(text),
				footer: [...locked ? [{
					label: "我的境界",
					command: "/我的境界"
				}] : [], {
					label: "查看飞信",
					command: "/飞信"
				}]
			}));
		})).handled) return;
		const confirmation = parsed.action === "mute" ? "已屏蔽该玩家的飞信。" : "已解除对该玩家的飞信屏蔽。";
		const md = Format.createMarkdown();
		md.addBlockquote(Format.createMarkdown().addText(confirmation));
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "飞信 · 屏蔽设置",
			content: md,
			footer: [...parsed.action === "mute" && targetUid > 0 ? [{
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
			title: "飞信 · 屏蔽设置",
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