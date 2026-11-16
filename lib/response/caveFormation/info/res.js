import { commandText } from "../../../utils/commandPrefix.js";
import { markdownButtonLabel } from "../../../utils/buttonLabel.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { parseBackendCaveFormations } from "../../../api/bot/cave-formation-queries.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice, sendMiddlewareReply } from "../../middlewareReply.js";
import { withBusinessRecovery } from "../../businessRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/caveFormation/info/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? e.name.startsWith("private.");
	const layoutCommand = "/储物袋 道具 其它 洞府阵法";
	const title = "我的洞府 · 阵法";
	const renderFailure = adviceRenderer((reply) => sendMiddlewareReply(e, withBusinessRecovery("cave-formations.list", {
		...reply,
		title: reply.title || title
	}), "footer"));
	try {
		const [, next] = useEvent();
		const response = await runRobotBusiness(e, "cave-formations.list", {}, parseBackendCaveFormations, next, renderFailure);
		if (response.handled) return;
		const active = response.data;
		const md = Format.createMarkdown();
		if (active.length === 0) {
			md.addText("暂无生效中的洞府阵法");
			appendMiddlewareAdvice(md, withBusinessRecovery("cave-formations.list", {
				title: "",
				heading: "",
				text: "暂无生效中的洞府阵法",
				buttons: [],
				advice: []
			}).advice);
		} else for (const item of active) {
			const quote = Format.createMarkdown().addText(`【${item.categoryLabel}】${item.formationName}`);
			quote.addText(" ").addButton(markdownButtonLabel("替换"), {
				data: commandText(layoutCommand),
				autoEnter: false
			});
			quote.addText(" ").addButton(markdownButtonLabel("移除"), {
				data: commandText(`移除阵法 ${item.formationName}`),
				autoEnter: false
			});
			quote.addNewline().addText(`剩余 ${item.remainingText}`);
			for (const line of item.effectText.split("\n")) quote.addNewline().addText(line);
			md.addBlockquote(quote);
		}
		await message.send(FormatGui({
			isPrivate,
			bid,
			title,
			content: md,
			footer: [{
				label: "返回洞府",
				command: "/我的洞府",
				autoEnter: false
			}, {
				label: "我的阵法",
				command: layoutCommand,
				autoEnter: false
			}]
		}));
	} catch (error) {
		logger.error("获取洞府阵法失败:", error);
		await renderFailure({
			title: "",
			heading: "",
			text: "获取洞府阵法失败，请稍后重试。",
			buttons: [],
			advice: []
		});
	}
});

//#endregion
export { res_default as default };