import { commandText } from "../../utils/commandPrefix.js";
import { BUBBLE_LIMITS } from "../presentation/tokens.js";
import { markdownButtonLabel } from "../../utils/buttonLabel.js";
import { FormatGui } from "../../utils/messageHelper.js";
import { activeFeatureText, mentionsRetiredFeature } from "../retiredFeatures.js";
import { parseLeaderboardMenu } from "../../api/bot/leaderboard-catalog.js";
import "../presentation/index.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
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
	const groups = [
		"实力成长",
		"修仙百业",
		"道友互动",
		"竞技与活动",
		"其他"
	];
	const active = menu.items.filter((item) => !mentionsRetiredFeature(item.command) && !mentionsRetiredFeature(item.label));
	const visible = groups.flatMap((group) => active.filter((item) => item.group === group));
	const total = Math.max(1, Math.ceil(visible.length / BUBBLE_LIMITS.homeTotalButtons));
	const pageSize = Math.ceil(visible.length / total);
	const requested = Number(e.MessageText?.trim().match(/排行榜\s*(\d+)$/u)?.[1] ?? 1);
	const page = Math.min(total, Math.max(1, requested));
	const shown = visible.slice((page - 1) * pageSize, page * pageSize);
	for (const group of groups) {
		const items = shown.filter((item) => item.group === group);
		if (items.length === 0) continue;
		md.addBold(group);
		md.addNewline();
		for (const item of items) {
			md.addButton(markdownButtonLabel(`${item.label}`), { data: commandText(item.command) });
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
		content: md,
		nav: total > 1 ? {
			current: page,
			total,
			count: visible.length,
			command: "/排行榜 {page}"
		} : void 0
	}));
});

//#endregion
export { res_default as default };