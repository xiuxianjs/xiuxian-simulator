import { parseRobotSoulArtifactUpgrade } from "../../../api/bot/soul-artifact-upgrade.js";
import { markdownButtonLabel } from "../../../utils/buttonLabel.js";
import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { sendMiddlewareReply } from "../../middlewareReply.js";
import { withBusinessRecovery } from "../../businessRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/soulArtifact/upgrade/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? e.name.startsWith("private.");
	const [, parentNext] = useEvent();
	const match = (e.MessageText?.trim() ?? "").match(/^[!！/#＃]?本命物升级\s*(\d+)?$/);
	const render = async (text, compareLines, canContinue) => {
		const md = Format.createMarkdown();
		md.addText(text);
		if (compareLines.length > 0) {
			md.addNewline();
			md.addNewline();
			md.addText("升级前后");
			md.addNewline();
			md.addBlockquote(createQuoteMarkdown(compareLines.map((line) => ` ${line}`)));
		}
		const actionMd = Format.createMarkdown();
		if (canContinue) {
			actionMd.addText("继续升级： ").addButton(markdownButtonLabel("再升×1"), { data: "/本命物升级" });
			actionMd.addText(" ").addButton(markdownButtonLabel("再升×5"), { data: "/本命物升级 5" });
			actionMd.addText(" ").addButton(markdownButtonLabel("再升×36"), { data: "/本命物升级 36" });
		} else {
			actionMd.addText("本次未完成全部请求等级，请先核对本命物等级与筑灵石。").addNewline();
			actionMd.addButton(markdownButtonLabel("查看材料"), { data: "/储物袋 材料 其它" });
		}
		actionMd.addText(" ").addButton(markdownButtonLabel("我的本命物"), { data: "/本命物信息" });
		md.addBlockquote(actionMd);
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
	};
	const renderFailure = adviceRenderer(async (reply) => {
		const recovered = withBusinessRecovery("soul-artifacts.upgrade", reply);
		const buttons = [...recovered.buttons];
		for (const button of [{
			label: "本命物信息",
			command: "/本命物信息"
		}]) if (!buttons.some((existing) => existing.command === button.command) && !recovered.advice.some((tip) => tip.command === button.command)) buttons.push(button);
		await sendMiddlewareReply(e, {
			...recovered,
			buttons
		}, true);
	});
	if (!match) {
		await renderFailure({
			title: "",
			heading: "",
			text: "格式错误，请先核对本命物操作用法。",
			buttons: [],
			advice: []
		});
		return;
	}
	const response = await runRobotBusiness(e, "soul-artifacts.upgrade", { levels: match?.[1] ?? null }, parseRobotSoulArtifactUpgrade, parentNext, renderFailure).catch(async () => {
		await renderFailure({
			title: "",
			heading: "",
			text: "本命物培养结果未获完整确认，请先核对当前状态、材料与原回执。",
			buttons: [],
			advice: []
		});
		return { handled: true };
	});
	if (response.handled) return;
	await render(response.data.message, response.data.result.compareLines, response.data.result.actualLevels >= Number(match?.[1] ?? 1));
});

//#endregion
export { res_default as default };