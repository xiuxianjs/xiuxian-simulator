import { FormatGui, createQuoteMarkdown } from "../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { parsePlayerTalents } from "../../api/bot/talents.js";
import { selects } from "../config.js";
import { runRobotBusiness } from "../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/talents/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const md = Format.createMarkdown();
	try {
		const result = await runRobotBusiness(e, "talents.query", {}, parsePlayerTalents, next);
		if (result.handled) return;
		if (!result.data.granted) md.addText("当前存档尚未发放天赋，老玩家将在后续更新中补发。");
		else result.data.talents.forEach((talent) => {
			md.addBlockquote(createQuoteMarkdown([
				`【${talent.category}】${talent.name}`,
				talent.description,
				talent.enabled ? "自动生效中" : "暂未开启"
			]));
			md.addNewline();
		});
	} catch {
		md.addText("查询天赋失败，请稍后重试。");
	}
	message.send(FormatGui({
		isPrivate: e.isPrivate ?? false,
		bid: e.UserId,
		title: "我的天赋",
		content: md,
		footer: [{
			label: "我",
			command: "/我"
		}]
	}));
});

//#endregion
export { res_default as default };