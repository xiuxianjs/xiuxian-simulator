import { markdownButtonLabel } from "../../utils/buttonLabel.js";
import { FormatGui } from "../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { activeFeatureText, mentionsRetiredFeature } from "../retiredFeatures.js";
import { parseLeaderboardMenu } from "../../api/bot/leaderboard-catalog.js";
import { selects } from "../config.js";
import { adviceRenderer } from "../feedbackRenderer.js";
import { runRobotBusiness } from "../robotBusiness.js";
import { rankingFailureMarkdown, rankingFeedbackMarkdown } from "./view.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/leaderboard/res.ts
/**
* 统一排行榜入口
* 指令：/排行榜
* 列出所有排行榜类型，点击按钮进入对应排行榜
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const md = Format.createMarkdown();
	let menu;
	try {
		const [, parentNext] = useEvent();
		const response = await runRobotBusiness(e, "leaderboard.menu", {}, parseLeaderboardMenu, parentNext, adviceRenderer(async (reply) => {
			rankingFeedbackMarkdown(reply, md);
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: "排行榜",
				content: md,
				footer: reply.buttons.length ? reply.buttons : void 0
			}));
		}));
		if (response.handled) return;
		menu = response.data;
	} catch (error) {
		rankingFailureMarkdown("leaderboard.menu", error instanceof Error ? error.message : "排行榜加载失败", md);
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "排行榜",
			content: md
		}));
		return;
	}
	for (const group of [
		"实力成长",
		"修仙百业",
		"道友互动",
		"竞技与活动",
		"其他"
	]) {
		const items = menu.items.filter((item) => item.group === group && !mentionsRetiredFeature(item.command) && !mentionsRetiredFeature(item.label));
		if (items.length === 0) continue;
		md.addBold(group);
		md.addNewline();
		for (const item of items) {
			md.addButton(markdownButtonLabel(`${item.label}`), { data: item.command });
			md.addText(` — ${item.description}`);
			md.addNewline();
		}
		md.addNewline();
	}
	md.addText(activeFeatureText(menu.hint));
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "排行榜",
		content: md
	}));
});

//#endregion
export { res_default as default };