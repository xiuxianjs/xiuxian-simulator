import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { sendMiddlewareReply } from "../../middlewareReply.js";
import { withBusinessRecovery } from "../../businessRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseBackendSkillBookDecompose } from "../../../api/bot/skill-book-decompose.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/skillBook/decompose/res.ts
/**
* 分解功法指令处理器
* 指令格式: /分解功法 {功法ID}
*/
const response = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? e.name.startsWith("private.");
	const [, next] = useEvent();
	const args = (e.MessageText ?? "").replace(/^[!！/#＃]?分解功法\s*/, "").trim().split(/\s+/).filter(Boolean);
	const bookId = args[0] ?? null;
	const failure = adviceRenderer((reply) => sendMiddlewareReply(e, withBusinessRecovery("skill-books.decompose", reply), "footer"));
	if (args.length > 1 || bookId !== null && (!/^\d+$/.test(bookId) || !Number.isSafeInteger(Number(bookId)) || Number(bookId) < 1)) {
		await failure({
			title: "",
			heading: "",
			text: "参数错误：请核对功法实例编号及完整参数，不附多余文字。",
			buttons: [],
			advice: []
		});
		return;
	}
	const result = await runRobotBusiness(e, "skill-books.decompose", { bookId }, parseBackendSkillBookDecompose, next, failure).catch(async () => {
		await failure({
			title: "",
			heading: "",
			text: "功法分解结果未获完整确认，请先核对原实例与返还。",
			buttons: [],
			advice: []
		});
		return { handled: true };
	});
	if (result.handled) return;
	const data = result.data;
	const refundInfo = {
		skillBook: data,
		totalExp: data.refundExp,
		baseExp: data.baseExp,
		items: data.refundedItems
	};
	let successMessage = `✅ 分解成功

【${refundInfo.skillBook.name}】
类型: ${refundInfo.skillBook.skillType}
品级: ${refundInfo.skillBook.grade}
境界: ${refundInfo.skillBook.realm}`;
	successMessage += `\n\n📦 折算经验: ${refundInfo.totalExp}`;
	successMessage += `\n└─ 基础返还: ${refundInfo.baseExp}`;
	if (refundInfo.items && refundInfo.items.length > 0) {
		successMessage += "\n\n获得功法残页:";
		refundInfo.items.forEach((item) => {
			successMessage += `\n  • ${item.name} x${item.quantity} (${item.expValue}经验/个)`;
		});
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
			label: "查看储物袋",
			command: "/我的储物袋 功法"
		}]
	}));
});

//#endregion
export { response as default };