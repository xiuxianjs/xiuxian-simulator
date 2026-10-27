import { formatGameTime } from "../../utils/gameTime.js";
import { parseRobberyRecords } from "../../api/bot/robbery-records.js";
import { FormatGui, createQuoteMarkdown } from "../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { selects } from "../config.js";
import { runRobotBusiness } from "../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/robberyRecord/res.ts
/**
* 打劫记录
* 指令：/打劫记录 [页码]
*
* 展示被打劫的记录，每条记录附带[回击]按钮
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const pageMatch = e.MessageText.match(/(\d+)/);
	const page = pageMatch ? Math.max(1, Math.min(Number(pageMatch[1]), 100)) : 1;
	const [, next] = useEvent();
	const sendFailure = async (text) => {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "打劫记录",
			content: Format.createMarkdown().addText(text)
		}));
	};
	let result;
	try {
		result = await runRobotBusiness(e, "pvp.records", { page }, parseRobberyRecords, next, async (reply) => {
			await sendFailure(reply.text);
		});
	} catch {
		await sendFailure("获取打劫记录失败");
		return;
	}
	if (result.handled) return;
	const md = Format.createMarkdown();
	if (result.data.records.length === 0) {
		md.addText("暂无被打劫记录");
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "打劫记录",
			content: md
		}));
		return;
	}
	for (const r of result.data.records) {
		md.addNewline();
		const time = formatGameTime(r.createdAt);
		const actor = r.isCounterAttack ? "反击方" : "进攻方";
		const lines = [
			`【战报 #${r.id}】`,
			`时间：${time}`,
			`${actor}：${r.attackerDisplayName}`,
			`类型：${r.typeText}`,
			`战斗结果：${actor}${r.isWin ? "获胜" : "未获胜"}`
		];
		if (r.lossText) {
			const losses = r.lossText.match(/^损失：(.*)$/);
			lines.push("", ...losses ? ["损失：", ...losses[1].split("、").map((loss) => loss.replace(/^(灵石|灵晶)-/, "$1 -"))] : [r.lossText]);
		}
		if (r.dropText) lines.push(`物品状态：${r.dropText}`);
		if (r.counterStatusText) lines.push(`反击状态：${r.counterStatusText}`);
		if (r.counterDeadline) lines.push(`反击截止：${formatGameTime(r.counterDeadline)}`);
		const actions = r.canCounterAttack ? [{
			label: r.counterDeadline ? "免费反击" : "回击",
			command: `/回击 ${r.id}`
		}] : [];
		if (r.counterDeadline) actions.push({
			label: "详情",
			command: `/争夺战报 ${r.id}`
		});
		md.addBlockquote(createQuoteMarkdown(lines, actions));
	}
	await message.send(FormatGui({
		isPrivate,
		bid,
		title: "打劫记录",
		content: md,
		nav: {
			current: result.data.currentPage,
			total: result.data.totalPages === 0 ? 1 : result.data.totalPages,
			count: result.data.total,
			command: "/打劫记录 {page}"
		}
	}));
});

//#endregion
export { res_default as default };