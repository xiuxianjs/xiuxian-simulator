import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { sendMiddlewareReply } from "../../middlewareReply.js";
import { EMPTY_STRING, FIRST_ARG_INDEX, SECOND_ARG_INDEX } from "../../../constants/common.js";
import "../../../constants/index.js";
import { withBusinessRecovery } from "../../businessRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { skillBookLearnConfirmation } from "../../../api/bot/skill-book-learn-presentation.js";
import { parseRobotSkillBookLearn } from "../../../api/bot/skill-book-learn.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/skillBook/learn/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e.UserId;
	const isPrivate = e.isPrivate ?? e.name.startsWith("private.");
	const text = (e.MessageText || "").replace(/^(!|！|\/|#|＃)?学习功法\s*/, "").trim();
	const args = text ? text.split(/\s+/) : [];
	const failure = adviceRenderer((reply) => sendMiddlewareReply(e, withBusinessRecovery("skill-books.learn", reply), "footer"));
	if (args.length > 2 || args[0] !== void 0 && (!/^\d+$/.test(args[0]) || !Number.isSafeInteger(Number(args[0])) || Number(args[0]) < 1) || args[1] !== void 0 && ![
		"确认",
		"是",
		"yes",
		"Yes",
		"YES"
	].includes(args[1])) {
		await failure({
			title: "",
			heading: "",
			text: "参数错误：请核对功法实例编号及完整参数，不附多余文字。",
			buttons: [],
			advice: []
		});
		return;
	}
	let learnResult;
	try {
		const result = await runRobotBusiness(e, "skill-books.learn", {
			bookId: args[0] ?? null,
			confirm: args[1] ?? null
		}, parseRobotSkillBookLearn, next, failure);
		if (result.handled) return;
		learnResult = result.data;
	} catch (error) {
		logger.error("学习功法结果未获完整确认:", error);
		await failure({
			title: "",
			heading: "",
			text: "功法学习结果未获完整确认，请先核对背包、当前功法与原回执。",
			buttons: [],
			advice: []
		});
		return;
	}
	if (learnResult.outcome === "confirmation_required") {
		const content = Format.createMarkdown();
		content.addText(`⚠️ ${skillBookLearnConfirmation(learnResult)}`);
		content.addNewline().addText("尚未替换 · 确认后按下列内容替换与返还");
		content.addNewline();
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content,
			footer: [{
				label: "确认替换",
				command: `/学习功法 ${learnResult.skillBook.id} 确认`
			}, {
				label: "返回我的功法",
				command: "/我的功法"
			}]
		}));
		return;
	}
	let successMessage = `✅ 学习成功

【${learnResult.skillBook?.name}】
类型: ${learnResult.skillBook?.skillType}`;
	if (learnResult.oldSkillBook && learnResult.refundInfo) {
		successMessage += "\n\n已替换旧功法";
		const refundInfo = learnResult.refundInfo;
		successMessage += `\n熟练度继承: ${refundInfo.transferredProficiency}%`;
		successMessage += `\n\n📦 折算经验: ${refundInfo.totalExp}`;
		successMessage += `\n├─ 基础返还: ${refundInfo.baseExp}`;
		if (refundInfo.upgradeCount > 0) successMessage += `\n└─ 升级经验: ${refundInfo.upgradeExp} (${refundInfo.upgradeCount}次升级)`;
		if (refundInfo.items && refundInfo.items.length > 0) {
			successMessage += "\n\n获得功法残页:";
			refundInfo.items.forEach((item) => {
				successMessage += `\n  • ${item.name} x${item.quantity} (${item.expValue}经验/个)`;
			});
		}
	}
	const md = Format.createMarkdown();
	md.addText(successMessage);
	md.addNewline();
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "",
		content: md,
		footer: [{
			label: "我的功法",
			command: "/我的功法"
		}]
	}));
});

//#endregion
export { res_default as default };