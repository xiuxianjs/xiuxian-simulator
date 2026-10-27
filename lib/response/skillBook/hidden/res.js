import { FormatGui, addOptions } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice, sendMiddlewareReply } from "../../middlewareReply.js";
import { EMPTY_STRING, FIRST_ARG_INDEX, MIN_PAGE } from "../../../constants/common.js";
import { formatSkillBookListItem } from "../../../utils/skillBookHelper.js";
import { skillInventoryRecoveryTips } from "../../skillInventoryRecovery.js";
import { withBusinessRecovery } from "../../businessRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotLearnedBooks } from "../../../api/bot/learned-books-queries.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/skillBook/hidden/res.ts
const response = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? e.name.startsWith("private.");
	const [, parentNext] = useEvent();
	const messageText = (e.MessageText || "").replace(/^(!|！|\/|#|＃)?我的隐藏功法\s*/, "").trim();
	const args = messageText ? messageText.split(/\s+/) : [];
	const failed = adviceRenderer((reply) => sendMiddlewareReply(e, withBusinessRecovery("skill-books.hidden", {
		...reply,
		title: reply.title || "我的隐藏功法"
	}), "footer"));
	const response = await runRobotBusiness(e, "skill-books.hidden", { page: args[0] ?? null }, parseRobotLearnedBooks, parentNext, failed).catch(async () => {
		await failed({
			title: "",
			heading: "",
			text: "隐藏列表未获完整确认，请先核对当前显示状态与原反馈。",
			buttons: [],
			advice: []
		});
		return { handled: true };
	});
	if (response.handled) return;
	const { items, total, totalPages, currentPage } = { data: response.data.page }.data;
	const md = Format.createMarkdown();
	if (total === 0) {
		md.addText("暂无隐藏功法");
		appendMiddlewareAdvice(md, skillInventoryRecoveryTips("skill-books.hidden", "暂无隐藏功法"));
	} else if (items.length === 0) {
		md.addText("❌ 页码超出范围");
		md.addNewline();
		md.addNewline();
		md.addText(`共 ${total} 本隐藏功法 · ${totalPages} 页`);
		appendMiddlewareAdvice(md, skillInventoryRecoveryTips("skill-books.hidden", "页码超出范围"));
	} else items.forEach((item) => {
		md.addText(formatSkillBookListItem(item, item.id));
		addOptions(md, [{
			label: "显示",
			command: `/显示功法 ${item.id}`
		}, {
			label: "查看",
			command: `/查看功法 ${item.id}`
		}]);
	});
	const nav = total > 0 ? {
		current: items.length === 0 ? 1 : currentPage,
		total: totalPages,
		count: total,
		command: "/我的隐藏功法 {page}"
	} : void 0;
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "我的隐藏功法",
		header: [{
			label: "我的功法",
			command: "/我的功法"
		}],
		content: md,
		nav
	}));
});

//#endregion
export { response as default };