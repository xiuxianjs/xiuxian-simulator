import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { parseRobotGuildWorship } from "../../../api/bot/guild-activity-robot-query.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/guild/worship/res.ts
const WORSHIP_REG = /^[!！/#＃]?祭祀祖师(?:\s+(灵石|灵晶|道晶))?$/;
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const offerName = (e.MessageText ?? "").trim().match(WORSHIP_REG)?.[1];
	try {
		const loaded = await runRobotBusiness(e, "guild.worship", { offer: offerName ?? "" }, parseRobotGuildWorship, next, async (reply) => {
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: reply.title,
				content: Format.createMarkdown().addText(reply.text),
				footer: reply.buttons
			}));
		});
		if (loaded.handled) return;
		const result = loaded.data;
		const md = Format.createMarkdown();
		if (result.code === "GUIDE") {
			md.addText(result.data.introText);
			md.addNewline();
			md.addNewline();
			for (const offer of result.data.offers) md.addBlockquote(createQuoteMarkdown([offer.line], offer.canWorship ? [{
				label: `祭祀${offer.name}`,
				command: `/祭祀祖师 ${offer.name}`
			}] : []));
			md.addNewline();
			md.addText(result.data.noticeText);
			const footer = !result.data.canWorship ? [{
				label: "宗门日常",
				command: "/宗门日常"
			}, {
				label: "我的宗门",
				command: "/我的宗门"
			}] : [
				{
					label: "灵石",
					command: "/祭祀祖师 灵石"
				},
				{
					label: "灵晶",
					command: "/祭祀祖师 灵晶"
				},
				{
					label: "道晶",
					command: "/祭祀祖师 道晶"
				},
				{
					label: "宗门日常",
					command: "/宗门日常"
				}
			];
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "祭祀祖师",
				content: md,
				footer
			}));
			return;
		}
		md.addText(result.data.message);
		if (result.code === "OK") {
			md.addNewline();
			md.addText(result.data.offerText);
			md.addNewline();
			md.addText(result.data.dailyActivityText);
			md.addNewline();
			md.addText(result.data.contributionText);
		}
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "祭祀祖师",
			content: md,
			footer: [
				{
					label: "宗门日常",
					command: "/宗门日常"
				},
				{
					label: "宗门主线",
					command: "/宗门主线"
				},
				{
					label: "我的宗门",
					command: "/我的宗门"
				}
			]
		}));
	} catch (error) {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "祭祀祖师",
			content: Format.createMarkdown().addText(error instanceof Error ? error.message : "祭祀祖师失败"),
			footer: [
				{
					label: "宗门日常",
					command: "/宗门日常"
				},
				{
					label: "宗门主线",
					command: "/宗门主线"
				},
				{
					label: "我的宗门",
					command: "/我的宗门"
				}
			]
		}));
	}
});

//#endregion
export { res_default as default };