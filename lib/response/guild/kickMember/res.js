import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { resolveRobotTarget } from "../../../utils/targetUid.js";
import { parseRobotGuildKick } from "../../../api/bot/guild-kick-robot-query.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent, useMention } from "alemonjs";

//#region src/response/guild/kickMember/res.ts
/**
* 踢出宗门成员
* 指令格式: /踢出成员 [UID|@目标]
* 不带ID时显示可踢出的成员列表
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [mention] = useMention();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const text = e.MessageText?.trim() ?? "";
	const match = text.match(/^[!！/#＃]?踢出成员(?:\s+(.+))?$/);
	if (!match) return;
	const sendText = async (text) => {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: Format.createMarkdown().addText(text)
		}));
	};
	let loaded;
	try {
		const target = match[1] ? await resolveRobotTarget(text, mention) : null;
		loaded = await runRobotBusiness(e, "guild.kick", {
			mode: match[1] ? "action" : "directory",
			target
		}, parseRobotGuildKick, next, async (reply) => {
			await sendText(reply.text);
		});
	} catch (error) {
		await sendText(error instanceof Error ? error.message : "操作失败");
		return;
	}
	if (loaded.handled || loaded.data.outcome === "no_target") return;
	if (loaded.data.outcome === "result") {
		await sendText(loaded.data.message);
		return;
	}
	const kickable = loaded.data.members;
	if (kickable.length === 0) {
		const md4 = Format.createMarkdown();
		md4.addText("当前没有可踢出的成员，或您没有踢人权限");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md4
		}));
		return;
	}
	const contentMd = Format.createMarkdown();
	contentMd.addBlockquote(Format.createMarkdown().addText("点击 [踢出] 可直接踢出对应成员"));
	for (const role of [
		"副宗主",
		"长老",
		"弟子"
	]) {
		const group = kickable.filter((m) => m.roleName === role);
		if (group.length === 0) continue;
		contentMd.addText(`── ${role} ──`);
		contentMd.addNewline();
		for (const m of group) contentMd.addBlockquote(createQuoteMarkdown([`${m.userName}（ID：${m.userId}）`], [{
			label: "踢出",
			command: `/踢出成员 ${m.userId}`
		}]));
		contentMd.addNewline();
	}
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "踢出成员",
		header: [{
			label: "返回",
			command: "/我的宗门"
		}],
		content: contentMd
	}));
});

//#endregion
export { res_default as default };