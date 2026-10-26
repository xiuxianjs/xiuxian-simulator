import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { BattleFormatGui } from "../../../utils/battleMemoryMessage.js";
import { parseRobotBattleLog } from "../../../api/bot/battle-log-query.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/battle/viewLog/res.ts
/**
* 查看战斗过程
* 指令：查看战斗过程 [战斗日志ID]
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const match = (e.MessageText ?? "").match(/^(!|！|\/|#|＃)?查看战斗过程\s+(.+)$/);
	const logId = String(match?.[2] ?? "").trim();
	const [, next] = useEvent();
	let response;
	try {
		response = await runRobotBusiness(e, "battle.log", { logId }, (data) => parseRobotBattleLog(data, logId), next, async (reply) => {
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: reply.title,
				content: Format.createMarkdown().addText(reply.text)
			}));
		});
	} catch (error) {
		const text = error instanceof Error ? `查看战斗过程失败：${error.message}` : "查看战斗过程失败";
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: Format.createMarkdown().addText(text)
		}));
		return;
	}
	if (response.handled) return;
	const md = Format.createMarkdown();
	if (!response.data.text && response.data.memoryShare) {
		md.addText("此记录可在战斗回忆中查看。");
		message.send(await BattleFormatGui({
			isPrivate,
			bid,
			title: "战斗回忆",
			content: md
		}, [{ id: logId }]));
		return;
	}
	md.addCode(response.data.text, { language: "markdown" });
	message.send(await BattleFormatGui({
		isPrivate,
		bid,
		title: "战斗过程",
		content: md
	}, [{ id: logId }]));
});

//#endregion
export { res_default as default };