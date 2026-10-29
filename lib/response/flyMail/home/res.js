import { isPrivateEvent } from "../../../utils/privateEvent.js";
import { FormatGui, addOptions } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { parseRobotFlyMailHome, parseRobotFriendInbox } from "../../../api/bot/fly-mail-queries.js";
import { flyMailDraft, flyMailQuote, flyMailTime } from "../../../utils/flyMailPresentation.js";
import { parseFlyMailHomeCommand } from "../../../utils/flyMailCommand.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/flyMail/home/res.ts
const SCOPE_LABEL = {
	friend: "好友飞信",
	master: "师门飞信",
	guild: "宗门飞信",
	companion: "道侣飞信",
	team: "队伍飞信"
};
const SCOPE_NAV_COMMAND = {
	friend: "/飞信 {page}",
	master: "/飞信 师门 {page}",
	guild: "/飞信 宗门 {page}",
	companion: "/飞信 道侣 {page}",
	team: "/飞信 队伍 {page}"
};
const SCOPE_SEND_COMMAND = {
	friend: "/我的好友",
	master: "/发师门飞信 ",
	guild: "/发宗门飞信 ",
	companion: "/发道侣飞信 ",
	team: "/发队伍飞信 "
};
const SCOPE_TABS = [
	{
		scope: "friend",
		label: "好友",
		command: "/飞信"
	},
	{
		scope: "master",
		label: "师门",
		command: "/飞信 师门"
	},
	{
		scope: "guild",
		label: "宗门",
		command: "/飞信 宗门"
	},
	{
		scope: "companion",
		label: "道侣",
		command: "/飞信 道侣"
	},
	{
		scope: "team",
		label: "队伍",
		command: "/飞信 队伍"
	}
];
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = isPrivateEvent(e);
	const parsed = parseFlyMailHomeCommand(e.MessageText);
	if (!parsed) return;
	if (!isPrivate) {
		await message.send(FormatGui({
			bid,
			bar: false,
			content: Format.createMarkdown().addText("请私聊机器人发送 /飞信 查看，飞信内容不会在群内展示。")
		}));
		return;
	}
	const label = SCOPE_LABEL[parsed.scope];
	const header = SCOPE_TABS.map((tab) => ({
		label: tab.label,
		selected: tab.scope === parsed.scope,
		command: tab.command
	}));
	const [, next] = useEvent();
	let response;
	try {
		response = await runRobotBusiness(e, "flymail.home", {
			scope: parsed.scope,
			page: String(parsed.page),
			...parsed.scope === "friend" ? {
				view: parsed.conversationId ? "messages" : "conversations",
				...parsed.conversationId ? { conversationId: String(parsed.conversationId) } : {}
			} : {}
		}, (data) => parsed.scope === "friend" ? parseRobotFriendInbox(data, parsed.conversationId) : parseRobotFlyMailHome(data, parsed.scope), next, async (reply) => {
			await message.send(FormatGui({
				isPrivate,
				bid,
				header,
				content: Format.createMarkdown().addText(label).addNewline().addText(reply.text),
				footer: [...reply.buttons, {
					label: "刷新",
					command: e.MessageText
				}]
			}));
		});
	} catch {
		message.send(FormatGui({
			isPrivate,
			bid,
			header,
			content: Format.createMarkdown().addText(label).addNewline().addText("飞信暂不可用，请稍后刷新。"),
			footer: [{
				label: "刷新",
				command: e.MessageText
			}]
		}));
		return;
	}
	if (response.handled) return;
	const result = { data: response.data };
	const md = Format.createMarkdown().addText(`${label} `);
	const inbox = "view" in result.data ? result.data : void 0;
	const conversation = inbox?.conversation;
	addOptions(md, [...conversation ? [{
		label: "会话列表",
		command: "/飞信"
	}] : [], {
		label: conversation ? "继续写信" : "写信",
		command: conversation ? flyMailDraft("friend", conversation.targetUid) : parsed.scope === "friend" ? SCOPE_SEND_COMMAND.friend : flyMailDraft(parsed.scope)
	}]);
	if (conversation) md.addText(conversation.targetName).addNewline();
	if (inbox?.view === "conversations") {
		if (inbox.conversations.length === 0) md.addNewline().addText("暂无会话");
		for (const item of inbox.conversations) {
			const row = Format.createMarkdown().addText(item.targetName);
			addOptions(row, [{
				label: "打开会话",
				command: `/飞信 会话 ${item.id}`
			}]);
			row.addText(flyMailTime(item.lastMessageAt)).addNewline().addText(item.preview);
			addOptions(row, [{
				label: "回复",
				command: flyMailDraft("friend", item.targetUid)
			}]);
			md.addBlockquote(row);
		}
	} else if (result.data.list.length === 0) md.addNewline().addText(conversation ? "暂无消息记录" : "暂无飞信");
	result.data.list.forEach((item) => {
		md.addBlockquote(flyMailQuote(item, e.uid));
	});
	message.send(FormatGui({
		isPrivate,
		bid,
		header,
		content: md,
		nav: result.data.totalPage > 1 ? {
			current: result.data.page,
			total: result.data.totalPage,
			count: result.data.total,
			command: parsed.conversationId ? `/飞信 会话 ${parsed.conversationId} {page}` : SCOPE_NAV_COMMAND[parsed.scope]
		} : void 0
	}));
});

//#endregion
export { res_default as default };