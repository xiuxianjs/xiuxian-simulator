import { isPrivateEvent } from "../../../utils/privateEvent.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { resolveRobotTargetFromArg } from "../../../utils/targetUid.js";
import { parseRobotFlyMailSend } from "../../../api/bot/flymail-send.js";
import { flyMailDraft, flyMailLabels, flyMailQuote, flyMailViewCommand } from "../../../utils/flyMailPresentation.js";
import { parseFlyMailSendCommand } from "../../../utils/flyMailCommand.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent, useMention } from "alemonjs";

//#region src/response/flyMail/send/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [mention] = useMention();
	const parsed = parseFlyMailSendCommand(e.MessageText);
	if (!parsed) return;
	const target = parsed.scope === "friend" ? await resolveRobotTargetFromArg(parsed.targetArg, mention) : null;
	const [, next] = useEvent();
	const view = flyMailViewCommand(parsed.scope);
	const draft = flyMailDraft(parsed.scope, target && "uid" in target ? target.uid : void 0) + (parsed.originConversationId ? `[会话:${parsed.originConversationId}] ` : "");
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
			const text = reply.text.replace("对方已禁言你的飞信", "对方已屏蔽你的飞信。");
			const editable = /内容不能为空|请输入正文|内容长度|违规词汇/.test(text);
			const edit = reply.buttons.find((button) => button.command.startsWith("/发")) ?? {
				label: parsed.content ? "重新编辑" : "继续写信",
				command: draft
			};
			const safeEdit = [...edit.command].length > 80 ? {
				...edit,
				command: draft
			} : edit;
			await send(text, [...editable ? [safeEdit] : [], ...text.includes("请选择收信人") ? [{
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