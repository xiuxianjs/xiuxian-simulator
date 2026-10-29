import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { sendMiddlewareReply } from "../../middlewareReply.js";
import { EMPTY_STRING, FIRST_ARG_INDEX } from "../../../constants/common.js";
import "../../../constants/index.js";
import { parseRobotSkillVisibility } from "../../../api/bot/skill-visibility.js";
import { withBusinessRecovery } from "../../businessRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/skillBook/show/res.ts
const response = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? e.name.startsWith("private.");
	const [, next] = useEvent();
	const messageText = (e.MessageText || "").replace(/^(!|！|\/|#|＃)?显示功法\s*/, "").trim();
	const args = messageText ? messageText.split(/\s+/) : [];
	const failure = adviceRenderer((reply) => sendMiddlewareReply(e, withBusinessRecovery("skill-books.show", reply), "footer"));
	if (args.length > 1 || args[0] !== void 0 && (!/^\d+$/.test(args[0]) || !Number.isSafeInteger(Number(args[0])) || Number(args[0]) < 1)) {
		await failure({
			title: "",
			heading: "",
			text: "参数错误：请使用本人已学功法的完整正整数实例编号，不附多余参数。",
			buttons: [],
			advice: []
		});
		return;
	}
	const skillBookId = Number(args[0] ?? "");
	const md = Format.createMarkdown();
	try {
		const result = await runRobotBusiness(e, "skill-books.show", { bookId: args[0] ?? "" }, (data) => parseRobotSkillVisibility(data, skillBookId, false), next, failure);
		if (result.handled) return;
		md.addText(`✅ ${result.data.message}`);
	} catch (error) {
		logger.error("显示功法失败:", error);
		await failure({
			title: "",
			heading: "",
			text: "功法显示结果未获完整确认，请先核对已学和隐藏列表。",
			buttons: [],
			advice: []
		});
		return;
	}
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "",
		content: md,
		footer: [{
			label: "我的隐藏功法",
			command: "/我的隐藏功法"
		}, {
			label: "我的功法",
			command: "/我的功法"
		}]
	}));
});

//#endregion
export { response as default };