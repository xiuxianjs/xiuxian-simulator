import { isPrivateEvent } from "../../../utils/privateEvent.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { parseRobotFlyMailSend } from "../../../api/bot/flymail-send.js";
import { flyMailDraft, flyMailLabels, flyMailQuote, flyMailViewCommand } from "../../../utils/flyMailPresentation.js";
import { resolveRobotTargetFromArg } from "../../../utils/targetUid.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseFlyMailSendCommand } from "../../../utils/flyMailCommand.js";
import { Format, onResponse, useEvent, useMention } from "alemonjs";

//#region src/response/flyMail/send/res.ts
const EDITABLE_FEEDBACK = /* @__PURE__ */ new Set([
	"内容不能为空",
	"请输入正文",
	"内容长度不能超过200个字符",
	"内容包含违规词汇，请修改后重试",
	"飞信内容未通过审核，请修改后重试"
]);
const SEND_FEEDBACK = /* @__PURE__ */ new Set([
	"请选择收信人",
	"飞信发送参数无效",
	"服务暂时不可用，请稍后再试",
	"飞信内容审核暂不可用，请稍后再试",
	"当前境界尚未开放飞信",
	"原会话已失效，请查看当前飞信",
	"请指定有效目标",
	"对方不是你的好友或同宗成员",
	"你当前没有道侣，无法发送道侣飞信",
	"当前未加入宗门",
	"当前宗门暂无其他成员可接收飞信",
	"当前未加入队伍",
	"当前队伍暂无其他成员可接收飞信"
]);
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const [mention] = useMention();
	const parsed = parseFlyMailSendCommand(e.MessageText);
	if (!parsed) return next();
	const target = parsed.scope === "friend" ? await resolveRobotTargetFromArg(parsed.targetArg, mention) : null;
	const view = flyMailViewCommand(parsed.scope);
	const targetUidFromInput = target && "uid" in target ? target.uid : void 0;
	const send = async (text, footer) => {
		if (!isPrivateEvent(e)) {
			await message.send(FormatGui({
				bid: e.UserId,
				bar: false,
				content: Format.createMarkdown().addText("请私聊机器人查看飞信操作结果。")
			}));
			return;
		}
		await message.send(FormatGui({
			isPrivate: e.isPrivate,
			bid: e.UserId,
			title: flyMailLabels[parsed.scope],
			bar: false,
			content: Format.createMarkdown().addText(text),
			footer
		}));
	};
	if (parsed.originConversationId === 0) {
		await send("原会话已失效，请查看当前飞信。", [{
			label: "查看飞信",
			command: view
		}]);
		return;
	}
	let result;
	try {
		const response = await runRobotBusiness(e, parsed.originConversationId ? "flymail.reply" : "flymail.send", {
			scope: parsed.scope,
			target,
			content: parsed.content ?? "",
			...parsed.originConversationId ? { originConversationId: parsed.originConversationId } : {}
		}, parseRobotFlyMailSend, next, async (reply) => {
			const reason = reply.text.trim().replace(/。$/, "");
			const editable = EDITABLE_FEEDBACK.has(reason);
			const text = reason === "对方已禁言你的飞信" || reason === "对方已屏蔽你的飞信" ? "对方已屏蔽你的飞信。" : editable || SEND_FEEDBACK.has(reason) ? reply.text : "飞信操作未完成，请查看飞信。";
			const serverDraft = parseFlyMailSendCommand(reply.buttons.find((button) => button.command.startsWith("/发"))?.command ?? "");
			const resolvedUid = Number(serverDraft?.targetArg);
			const recipient = targetUidFromInput ?? (serverDraft?.scope === "friend" && /^\d+$/.test(serverDraft.targetArg ?? "") && Number.isSafeInteger(resolvedUid) && resolvedUid > 0 ? resolvedUid : void 0);
			const command = flyMailDraft(parsed.scope, recipient) + (parsed.originConversationId && (parsed.scope !== "friend" || recipient) ? `[会话:${parsed.originConversationId}] ` : "");
			const edit = {
				label: parsed.content ? "重新编辑" : "继续写信",
				command
			};
			await send(text, [...editable ? [edit] : [], ...reason === "请选择收信人" ? [{
				label: "我的好友",
				command: "/我的好友"
			}] : [{
				label: "查看飞信",
				command: view
			}]]);
		});
		if (response.handled) return;
		result = response.data;
	} catch {
		await send("飞信发送结果待确认，请先查看会话。", [{
			label: "查看飞信",
			command: view
		}]);
		return;
	}
	const targetUid = result.chat?.targetUid ?? result.targetUid;
	const conversationId = result.conversationId;
	const footer = [{
		label: parsed.scope === "friend" ? "会话列表" : "查看飞信",
		command: view
	}, ...parsed.scope !== "friend" && conversationId || targetUid ? [{
		label: "继续写信",
		command: flyMailDraft(parsed.scope, targetUid)
	}] : []];
	if (!isPrivateEvent(e)) {
		await send("飞信已发送。", []);
		return;
	}
	if (result.chat) {
		const md = Format.createMarkdown();
		if (result.chat.title) md.addText(result.chat.title).addNewline();
		const items = [...result.chat.history.list].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id);
		for (const item of items) md.addBlockquote(flyMailQuote(item, e.uid)).addNewline();
		await message.send(FormatGui({
			isPrivate: e.isPrivate,
			bid: e.UserId,
			bar: false,
			header: footer,
			content: md
		}));
		return;
	}
	await send("飞信已发送。", footer);
});

//#endregion
export { res_default as default };