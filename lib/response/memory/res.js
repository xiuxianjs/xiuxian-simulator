import { FormatGui } from "../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { parseBackendMemories } from "../../api/bot/queries.js";
import { selects } from "../config.js";
import { runRobotBusiness } from "../robotBusiness.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/memory/res.ts
/**
* 我的回忆指令处理器
* 指令：/我的回忆
* 展示玩家个人历程中几个关键"第一次"节点，以故事化短文呈现
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const sendFailure = (text) => message.send(FormatGui({
		isPrivate,
		bid,
		title: "我的回忆",
		content: Format.createMarkdown().addText(text)
	}));
	try {
		const loaded = await runRobotBusiness(e, "personal-history.memories", {}, parseBackendMemories, next, async (reply) => {
			await sendFailure(reply.text);
		});
		if (loaded.handled) return;
		const data = loaded.data;
		const md = Format.createMarkdown();
		const { items, totalDays, name } = data;
		md.addBlockquote(Format.createMarkdown().addText(`${name}，你已在这片天地走过了 ${totalDays} 天。`));
		items.forEach((item) => {
			md.addText(`【${item.label}】`);
			md.addNewline();
			md.addText(item.text);
			if (item.subtext) {
				md.addNewline();
				md.addBlockquote(Format.createMarkdown().addText(item.subtext));
			}
			md.addNewline();
			md.addNewline();
		});
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "我的回忆",
			content: md,
			footer: data.canShowStoryButton ? [{
				label: "我的故事",
				command: "/我的故事"
			}] : void 0
		}));
	} catch (error) {
		logger.error("我的回忆加载失败:", error);
		await sendFailure("回忆加载失败，请稍后再试");
	}
});

//#endregion
export { res_default as default };