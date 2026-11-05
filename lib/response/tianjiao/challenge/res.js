import { createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { BattleFormatGui } from "../../../utils/battleMemoryMessage.js";
import { parseRobotTianjiaoChallenge, tianjiaoChallengeArgument } from "../../../api/bot/tianjiao-robot-query.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/tianjiao/challenge/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const feedback = async (text) => {
		await message.send(await BattleFormatGui({
			isPrivate,
			bid,
			title: "",
			content: Format.createMarkdown().addText(text),
			footer: [{
				label: "登天奖励",
				command: "/登天奖励"
			}, {
				label: "登天梯",
				command: "/登天梯"
			}]
		}, []));
	};
	let result;
	try {
		const loaded = await runRobotBusiness(e, "tianjiao.challenge", { rankArg: tianjiaoChallengeArgument(e.MessageText || "") }, parseRobotTianjiaoChallenge, next, (reply) => feedback(reply.text));
		if (loaded.handled) return;
		result = loaded.data;
	} catch (error) {
		await feedback(error instanceof Error ? error.message : "登天挑战失败");
		return;
	}
	if (result.code === "NO_MATCH") return;
	const md = Format.createMarkdown();
	if (result.code === "PARAM_ERROR") {
		md.addText("请输入正确的格式：/登天挑战 [排名]");
		md.addNewline();
		md.addText("例如：/登天挑战 1");
	} else {
		md.addBold(result.data.title);
		md.addNewline();
		let quoteLines = [];
		const flushQuote = () => {
			if (quoteLines.length > 0) {
				md.addBlockquote(createQuoteMarkdown(quoteLines));
				quoteLines = [];
			}
		};
		for (const line of result.data.lines) if (line === "") {
			flushQuote();
			md.addNewline();
		} else if (line === "战斗情况") {
			flushQuote();
			md.addBold(line);
			md.addNewline();
		} else quoteLines.push(line);
		flushQuote();
	}
	const footer = result.code === "SUCCESS" ? [
		...result.data.logId ? [{
			label: "文字记录",
			command: `/查看战斗过程 ${result.data.logId}`
		}] : [],
		{
			label: "登天奖励",
			command: "/登天奖励"
		},
		{
			label: "登天梯",
			command: "/登天梯"
		}
	] : [{
		label: "登天奖励",
		command: "/登天奖励"
	}, {
		label: "登天梯",
		command: "/登天梯"
	}];
	message.send(await BattleFormatGui({
		isPrivate,
		bid,
		title: "",
		content: md,
		footer
	}, [{ id: result.code === "SUCCESS" ? result.data.logId : void 0 }]));
});

//#endregion
export { res_default as default };