import { formatGameTime } from "../../utils/gameTime.js";
import { FormatGui, createQuoteMarkdown } from "../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { parsePKCommandInteger } from "../../api/bot/pk-management.js";
import { parsePKHistory, pkHistoryScope, pkHistoryScopes } from "../../api/bot/pk-history.js";
import { selects } from "../config.js";
import { runRobotBusiness } from "../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/pkHistory/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const args = e.MessageText.replace(/^(!|！|\/|#|＃)?争夺历史\s*/, "").trim().split(/\s+/).filter(Boolean);
	const scope = pkHistoryScope(args[0]);
	const cursor = parsePKCommandInteger(args[1], 0);
	const send = async (text) => {
		await message.send(FormatGui({
			isPrivate: e.isPrivate ?? false,
			bid: e.UserId,
			title: "争夺历史",
			content: Format.createMarkdown().addText(text)
		}));
	};
	try {
		const result = await runRobotBusiness(e, "pvp.pk-history", {
			scope: scope ?? "",
			cursor: args.length > 2 ? null : cursor
		}, parsePKHistory, next, (reply) => send(reply.text));
		if (result.handled) return;
		const data = result.data;
		const label = pkHistoryScopes[scope ?? "all"];
		const md = Format.createMarkdown().addText(`${label}`);
		for (const row of data.items) {
			const lines = [
				`战报 #${row.reportId} · ${row.viewerRole === "attacker" ? "我发起" : "我被打"} · ${row.opponentName}`,
				formatGameTime(row.createdAt),
				row.resultText,
				row.moneyText,
				row.originalAssetText,
				row.counterStatusText
			];
			if (row.counterDeadline) lines.push(`反击截止：${formatGameTime(row.counterDeadline)}`);
			md.addNewline().addBlockquote(createQuoteMarkdown(lines, [{
				label: "详情",
				command: `/争夺战报 ${row.reportId}`
			}]));
		}
		if (!data.items.length) md.addNewline().addText("暂无争夺记录");
		const footer = Object.entries(pkHistoryScopes).map(([key, title]) => ({
			label: title,
			selected: key === (scope ?? "all"),
			command: `/争夺历史 ${title}`
		}));
		if (data.nextCursor !== void 0) footer.push({
			label: "下一批",
			command: `/争夺历史 ${label} ${data.nextCursor}`
		});
		await message.send(FormatGui({
			isPrivate: e.isPrivate ?? false,
			bid: e.UserId,
			title: "争夺历史",
			content: md,
			footer
		}));
	} catch {
		await send("读取争夺历史失败，请稍后刷新。");
	}
});

//#endregion
export { res_default as default };