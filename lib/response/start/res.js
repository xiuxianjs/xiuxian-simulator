import { invalidateEventBackendRobotIdentity } from "../../api/bot/identity.js";
import { FormatGui } from "../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { parseBackendRegistration } from "../../api/bot/registration.js";
import { formatName } from "../../utils/name.js";
import { selects } from "../config.js";
import { runRobotBusiness } from "../robotBusiness.js";
import { sendRegistrationNamePrompt } from "./namePrompt.js";
import { invalidateEventCommandEntry } from "../../api/bot/command-entry.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/start/res.ts
const GUIDE_ACTION_BAR = [{
	label: "继续",
	command: "/继续"
}, {
	label: "跳过剧情",
	command: "/跳过引导"
}];
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, parentNext] = useEvent();
	const feedback = (title, text) => {
		const md = Format.createMarkdown().addText(text);
		if (title) md.addNewline();
		message.send(FormatGui({
			isPrivate,
			bid,
			title,
			content: md,
			...title ? { bar: [{
				label: `我是 ${formatName(e?.UserName)}`,
				command: `/我是 ${formatName(e?.UserName)}`
			}] } : {}
		}));
		return Promise.resolve();
	};
	let result;
	try {
		const response = await runRobotBusiness(e, "account.register", { region: e.GuildId ?? e.ChannelId ?? "" }, parseBackendRegistration, parentNext, (reply) => feedback(reply.title, reply.text));
		if (response.handled) return;
		result = response.data;
	} catch {
		await feedback("", "创建存档失败，请稍后再试或联系运营。");
		return;
	}
	if (result.code === "OK") {
		invalidateEventBackendRobotIdentity(e);
		invalidateEventCommandEntry(e);
	}
	if (result.code === "EXISTING_USER") {
		const md = Format.createMarkdown();
		md.addText("可发送 /我 查看账号信息。");
		md.addNewline();
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "踏入仙途",
			content: md,
			footer: [{
				label: "我",
				command: "/我"
			}, {
				label: "查看主线",
				command: "/查看主线"
			}]
		}));
		return;
	}
	if (result.code === "NEED_NAME") {
		await sendRegistrationNamePrompt(e);
		return;
	}
	if (result.code === "NEED_GENDER") {
		const name = result.data.playerName;
		const md = Format.createMarkdown().addText(`道号：${name}`).addNewline().addText("选择角色性别，踏入仙途。");
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "初入仙途",
			content: md,
			bar: [{
				label: "女修",
				command: `/我是 ${name} 女`
			}, {
				label: "男修",
				command: `/我是 ${name} 男`
			}]
		}));
		return;
	}
	const md = Format.createMarkdown();
	md.addBold("新手引导");
	md.addNewline();
	md.addText(`${result.data.playerName}，你的仙途从此刻开始。`);
	if (result.data.spiritRoot?.granted) {
		md.addNewline();
		md.addText(`先天灵根：${result.data.spiritRoot.title} · 闭关修为+${result.data.spiritRoot.bonusPercent}%`);
	}
	if (result.data.talents?.granted) {
		md.addNewline();
		md.addNewline();
		md.addBold("先天天赋");
		result.data.talents.talents.forEach((talent) => {
			md.addNewline();
			md.addText(`【${talent.category}】${talent.name}：${talent.description}${talent.enabled ? "" : "（暂未开启）"}`);
		});
		md.addNewline();
		md.addText("天赋自动生效，完成引导后可发送 /我的天赋 查看。");
	}
	md.addNewline();
	md.addNewline();
	md.addText("\"你独行于陨星荒野，夜色浓如墨，四周草木无声。忽然，一阵阴冷的笑声自身后传来——\"呵呵，又是一只迷途的羔羊……\"你猛然回头，只见一名黑袍修士手持炼魂幡，正缓步逼近。\"");
	md.addNewline();
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "",
		content: md,
		bar: GUIDE_ACTION_BAR
	}));
});

//#endregion
export { res_default as default };