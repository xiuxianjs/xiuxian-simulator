import { isPrivateEvent } from "../../../utils/privateEvent.js";
import { FormatGui, addOptions } from "../../../utils/messageHelper.js";
import { section } from "../../presentation/sections.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { parseRobotFlyMailHome, parseRobotFriendInbox } from "../../../api/bot/fly-mail-queries.js";
import { flyMailDraft, flyMailQuote, flyMailTime } from "../../../utils/flyMailPresentation.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseFlyMailHomeCommand } from "../../../utils/flyMailCommand.js";
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
const HOME_FEEDBACK = /* @__PURE__ */ new Set([
	"飞信暂不可用",
	"飞信查看参数无效",
	"飞信会话参数无效",
	"会话不可用，请返回好友飞信"
]);
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e?.UserId;
	const isPrivate = isPrivateEvent(e);
	const parsed = parseFlyMailHomeCommand(e.MessageText);
	if (!parsed) return next();
	if (!isPrivate) {
		await message.send(FormatGui({
			bid,
			bar: false,
			content: Format.createMarkdown().addText("请私聊机器人发送 /飞信 查看，飞信内容不会在群内展示。")
		}));
		return;
	}
	const label = SCOPE_LABEL[parsed.scope];
	const refreshCommand = (parsed.conversationId ? `/飞信 会话 ${parsed.conversationId} {page}` : SCOPE_NAV_COMMAND[parsed.scope]).replace("{page}", String(parsed.page));
	const header = SCOPE_TABS.map((tab) => ({
		label: tab.label,
		selected: tab.scope === parsed.scope,
		command: tab.command
	}));
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
			const requiredRealm = "炼气二层";
			const locked = reply.text.startsWith(`${requiredRealm}及以上方可开启该功能`);
			const text = locked ? `${requiredRealm}及以上方可查看该飞信。` : HOME_FEEDBACK.has(reply.text) ? reply.text : "飞信暂不可用，请稍后刷新。";
			await message.send(FormatGui({
				isPrivate,
				bid,
				header,
				content: Format.createMarkdown().addText(label).addNewline().addText(text),
				footer: [
					...locked ? [{
						label: "我的境界",
						command: "/我的境界"
					}] : [],
					...text === "会话不可用，请返回好友飞信" || text === "飞信会话参数无效" ? [{
						label: "返回飞信",
						command: "/飞信"
					}] : [],
					{
						label: "刷新",
						command: refreshCommand
					}
				]
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
				command: refreshCommand
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
	if (conversation) md.addText(conversation.title ?? conversation.targetName).addNewline();
	if (inbox?.view === "conversations") {
		if (inbox.conversations.length === 0) md.addNewline().addText("暂无会话");
		for (const item of inbox.conversations) md.addBlockquote(section({
			title: item.title ?? item.targetName,
			lines: [`时间：${flyMailTime(item.lastMessageAt)}`, item.previewReviewed ? item.preview : "正文暂不可展示。"],
			actions: [{
				label: "打开会话",
				command: `/飞信 会话 ${item.id}`
			}, {
				label: "回复",
				command: flyMailDraft("friend", item.targetUid)
			}]
		}));
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