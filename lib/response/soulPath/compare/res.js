import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { sendMiddlewareReply } from "../../middlewareReply.js";
import { withoutSoulConfirmationActions } from "../../soulPathRecovery.js";
import { withBusinessRecovery } from "../../businessRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseSoulPathComparison } from "../../../api/bot/battle-attributes.js";
import { addSoulEffectChanges, addSoulQuote, sendSoulGui } from "../shared.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/soulPath/compare/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const md = Format.createMarkdown();
	const [, parentNext] = useEvent();
	const sendFailure = adviceRenderer((reply) => sendMiddlewareReply(e, withBusinessRecovery("soul-path.compare", withoutSoulConfirmationActions({
		...reply,
		title: reply.title || "道途印证"
	})), "footer"));
	try {
		const response = await runRobotBusiness(e, "soul-path.compare", {}, parseSoulPathComparison, parentNext, sendFailure);
		if (response.handled) return;
		const { changes, emptyMessage, quote } = response.data;
		md.addBold("道途加成");
		md.addNewline();
		addSoulEffectChanges(md, changes, emptyMessage);
		addSoulQuote(md, quote);
	} catch (error) {
		logger.error("[道途印证] 属性计算失败", error);
		await sendFailure({
			title: "",
			heading: "",
			text: "属性暂时无法计算，请稍后重试。",
			buttons: [],
			advice: []
		});
		return;
	}
	await message.send(sendSoulGui(e, "道途印证", md, [{
		label: "返回道途",
		command: "/元婴道途"
	}, {
		label: "本命物",
		command: "/我的本命物"
	}]));
});

//#endregion
export { res_default as default };