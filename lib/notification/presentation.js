import { FormatGui, addOptions, createQuoteMarkdown } from "../utils/messageHelper.js";
import { Format } from "alemonjs";

//#region src/notification/presentation.ts
function notificationReference(text, pattern) {
	const id = text.match(pattern)?.[1];
	return id && Number.isSafeInteger(Number(id)) && Number(id) > 0 ? id : void 0;
}
function notificationActions(source, text) {
	if (source === "black-box.announcement") {
		const match = text.match(/\/(?:黑盒排期|黑盒拍卖) (\d{2}):(\d{2})(?!\d)/);
		return [{
			label: "查看本场",
			command: `/黑盒排期${match && Number(match[1]) < 24 && Number(match[2]) < 60 ? ` ${match[1]}:${match[2]}` : ""}`
		}];
	}
	if (source === "black-box.opening" || source === "black-box.started") {
		const match = text.match(/\/(黑盒入场|黑盒详情) (\d+) (D\d{2}-\d{4}-[ABC])/);
		const expected = source === "black-box.opening" ? "黑盒入场" : "黑盒详情";
		if (match?.[1] === expected && Number.isSafeInteger(Number(match[2])) && Number(match[2]) > 0) return [{
			label: source === "black-box.opening" ? "参加匹配" : "私聊查看本组",
			command: `/${expected} ${match[2]} ${match[3]}`
		}];
		return [{
			label: "查看本人记录",
			command: "/黑盒记录"
		}];
	}
	if (source === "black-box.admission") return [{
		label: "查看流拍原因",
		command: "/黑盒记录"
	}];
	if (source === "black-box.result") {
		const match = text.match(/\/黑盒详情 (\d+) (D\d{2}-\d{4}-[ABC])(?=\s|$)/);
		if (match && Number.isSafeInteger(Number(match[1])) && Number(match[1]) > 0) return [{
			label: "查看本场结果",
			command: `/黑盒详情 ${match[1]} ${match[2]}`
		}, {
			label: "本人记录",
			command: "/黑盒记录"
		}];
	}
	if (source === "black-box.reminder" || source === "black-box.result") return [{
		label: source === "black-box.reminder" ? "查看预约" : "查看结果",
		command: "/黑盒记录"
	}];
	if (source.startsWith("pk.")) {
		const reportId = notificationReference(text, /战报\s*#(\d+)/);
		return [{
			label: "查看战报",
			command: reportId ? `/争夺战报 ${reportId}` : "/打劫记录"
		}];
	}
	if (source === "meditation.limit") return [{
		label: "出关领取",
		command: "/出关"
	}];
	if (source === "exploration.completed") return [{
		label: "返程结算",
		command: "/返程"
	}];
	if (source === "cave.plot.matured") return [{
		label: "查看灵田",
		command: "/灵田"
	}];
	if (source === "forge.order.expired") return [{
		label: "查看委托",
		command: "/锻造委托"
	}];
	if (source === "tribulation.settled") {
		const eventId = notificationReference(text, /\/渡劫结算 (\d+)/);
		return [{
			label: "本次结算",
			command: eventId ? `/渡劫结算 ${eventId}` : "/我的渡劫"
		}];
	}
	if (source.startsWith("tribulation.")) return [{
		label: "我的渡劫",
		command: "/我的渡劫"
	}];
	if (source === "friend.request.created") return [{
		label: "好友申请",
		command: "/好友申请"
	}, {
		label: "我的好友",
		command: "/我的好友"
	}];
	if (source.startsWith("friend.request.")) return [{
		label: "我的好友",
		command: "/我的好友"
	}];
	if (source === "companion.proposal.created") return [{
		label: "处理道侣申请",
		command: "/同意道侣"
	}];
	if (source === "companion.anniversary.gift") return [{
		label: "查收周年礼物",
		command: "/我的邮件"
	}, {
		label: "我的道侣",
		command: "/我的道侣"
	}];
	if (source.startsWith("companion.")) return [{
		label: "我的道侣",
		command: "/我的道侣"
	}];
	if (source === "master.proposal.created") return [{
		label: "查看拜师申请",
		command: "/同意拜师"
	}];
	if (source === "master.graduation.created") return [{
		label: "查看出师申请",
		command: "/同意出师"
	}];
	if (source.startsWith("master.")) return [{
		label: "我的师门",
		command: "/我的师门"
	}];
	if (/^team\.invitation:\d+:created$/.test(source)) return [{
		label: "查看队伍邀请",
		command: "/我的队伍邀请"
	}];
	if (/^team\.application:\d+:created$/.test(source)) return [{
		label: "审核入队申请",
		command: "/队伍申请"
	}];
	if (/^team\.application:\d+:rejected$/.test(source)) return [{
		label: "我的入队申请",
		command: "/我的队伍申请"
	}, {
		label: "寻找队伍",
		command: "/队伍列表"
	}];
	if (source === "team.match" && /^(?:匹配超时\n|【组队匹配超时】)/.test(text)) return [{
		label: "选择秘境",
		command: "/查看秘境"
	}, {
		label: "选择主线",
		command: "/查看主线"
	}];
	if (source.startsWith("team.") || source.startsWith("team:")) return [{
		label: "我的队伍",
		command: "/我的队伍"
	}];
	if (source === "guild.competition.reward") return [{
		label: "领取大比奖励",
		command: "/领取宗门大比奖励"
	}, {
		label: "宗门大比",
		command: "/宗门大比"
	}];
	if (source === "guild.application.rejected" || source === "guild.member.kicked" || source === "guild.dissolve") return [{
		label: "寻找宗门",
		command: "/宗门列表"
	}];
	if ([
		"guild.leave.successor",
		"guild.leadership.transfer",
		"guild.leadership.impeach.successor"
	].includes(source)) return [{
		label: "宗门管理",
		command: "/我的宗门 管理"
	}];
	if (source === "guild.red_packet.sent") return [{
		label: "查看宗门红包",
		command: "/宗门红包"
	}];
	if (source.startsWith("guild.")) return [{
		label: "我的宗门",
		command: "/我的宗门"
	}];
	if (source === "scheduled.email.sent") return [{
		label: "查收邮件",
		command: "/我的邮件"
	}];
	if (source === "market.listing.expired") return [{
		label: "我的上架",
		command: "/我的上架"
	}, {
		label: "储物袋",
		command: "/储物袋"
	}];
	if (source.startsWith("bounty.expired.")) return [{
		label: "查看灵晶",
		command: "/我"
	}, {
		label: "悬赏榜",
		command: "/悬赏榜"
	}];
	if (source.startsWith("flymail.")) return [{
		label: "查看飞信",
		command: "/飞信"
	}];
	return [];
}
/** 服务端标题属于纯文本正文；平台展示和历史记录复用相同分行。 */
function notificationTextLayout(text) {
	const normalized = text.replace(/\r\n/g, "\n");
	const match = normalized.match(/^【([^\n】]+)】\n\n/);
	return {
		title: match?.[1] ?? "修仙 · 通知",
		lines: (match ? normalized.slice(match[0].length) : normalized).split("\n")
	};
}
/** 兼容旧纯文本通知；已有 Markdown/图片等富内容保留原样，飞信继续使用专用展示。 */
function notificationNoticeData(data, source = "") {
	if (!data.length || data.some((block) => block.type !== "Text" && block.type !== "Mention")) return data;
	const text = data.filter((block) => block.type === "Text").map((block) => block.value).join("");
	if (!text.trim()) return data;
	const actions = [...notificationActions(source, text), {
		label: "我的通知",
		command: "/我的通知"
	}];
	const { title, lines } = notificationTextLayout(text);
	const quote = createQuoteMarkdown(lines).addNewline();
	addOptions(quote, actions);
	const content = Format.createMarkdown().addBlockquote(quote);
	return [...data.filter((block) => block.type === "Mention"), ...FormatGui({
		mention: false,
		bar: false,
		title,
		content
	}).format.value];
}

//#endregion
export { notificationNoticeData, notificationTextLayout };