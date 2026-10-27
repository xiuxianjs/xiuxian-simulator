import { markdownButtonLabel } from "../../../utils/buttonLabel.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice, sendMiddlewareReply } from "../../middlewareReply.js";
import { withBusinessRecovery } from "../../businessRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { paginateCaveItems, parseCavePage } from "../pagination.js";
import { parseBackendCaveNearby } from "../../../api/bot/cave-nearby-queries.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/cavePlot/nearby/res.ts
const HEADER = [{
	label: "我的灵田",
	command: "/灵田"
}];
const FOOTER = [
	{
		label: "洞府阵法",
		command: "/洞府阵法"
	},
	{
		label: "灵田记录",
		command: "/灵田记录"
	},
	{
		label: "我的好友",
		command: "/我的好友"
	}
];
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? e.name.startsWith("private.");
	const md = Format.createMarkdown();
	const failure = adviceRenderer((reply) => sendMiddlewareReply(e, withBusinessRecovery("cave.nearby", {
		...reply,
		title: reply.title || "附近灵田",
		buttons: [...reply.buttons, ...[...HEADER, ...FOOTER].filter((button) => !reply.buttons.some((original) => original.command === button.command))]
	}), "footer"));
	try {
		const [, next] = useEvent();
		const response = await runRobotBusiness(e, "cave.nearby", {}, (value) => {
			const data = parseBackendCaveNearby(value);
			if (data.players.some((player) => player.ownerId <= 0)) throw new Error("附近灵田目标无效");
			return data;
		}, next, failure);
		if (response.handled) return;
		const nearbyResult = response.data;
		const pagination = paginateCaveItems(nearbyResult.players, parseCavePage(e.MessageText ?? "").page, "/附近灵田 页 {page}");
		const pageRows = pagination.items;
		if (pageRows.length === 0) {
			md.addText(nearbyResult.message ?? "附近暂无可查看的玩家灵田。");
			appendMiddlewareAdvice(md, withBusinessRecovery("cave.nearby", {
				title: "",
				heading: "",
				text: "附近灵田列表为空",
				buttons: [],
				advice: []
			}).advice);
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: "附近灵田",
				header: HEADER,
				footer: FOOTER,
				content: md,
				nav: pagination.nav
			}));
			return;
		}
		pageRows.forEach((row, index) => {
			const quote = Format.createMarkdown().addText(`${row.ownerName} · ${row.relationLabel}`);
			quote.addText(" ");
			quote.addButton(markdownButtonLabel("查看灵田"), { data: `/查看灵田 ${row.ownerId}` });
			if (row.canSteal) {
				quote.addText(" ");
				quote.addButton(markdownButtonLabel("偷药"), { data: `/偷药 ${row.ownerId}` });
			}
			quote.addNewline().addText(`灵气：${row.auraText}`).addNewline().addText(row.stolenStatusText);
			md.addBlockquote(quote);
			if (index < pageRows.length - 1) {
				md.addNewline();
				md.addNewline();
			}
		});
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "附近灵田",
			header: HEADER,
			footer: FOOTER,
			content: md,
			nav: pagination.nav
		}));
	} catch (error) {
		logger.error("附近灵田查询失败:", error);
		await failure({
			title: "",
			heading: "",
			text: "获取附近灵田失败，请稍后重试。",
			buttons: [],
			advice: []
		});
	}
});

//#endregion
export { res_default as default };