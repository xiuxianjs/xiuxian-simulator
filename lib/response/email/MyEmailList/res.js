import { markdownButtonLabel } from "../../../utils/buttonLabel.js";
import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice, sendMiddlewareReply } from "../../middlewareReply.js";
import { emailRecoveryTips } from "../../emailRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { emailListArguments, parseRobotEmailList } from "../../../api/bot/email-robot-query.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/email/MyEmailList/res.ts
/**
* 附件类型标签映射
*/
const CATEGORY_LABELS = {
	money: "货币",
	currency: "货币",
	lootbox: "礼盒",
	equipment: "装备",
	skill_book: "功法",
	skill: "功法",
	soul_artifact: "本命物",
	item: "道具",
	prop: "道具",
	material: "材料",
	recipe: "丹方",
	title: "称号"
};
/**
* 格式化邮件附件展示文本
*/
function formatEmailGoods(goods) {
	if (!Array.isArray(goods) || goods.length === 0) return "无";
	return goods.map((item) => {
		return `【${CATEGORY_LABELS[item.category] ?? "物品"}】${item.name || "神秘物品"} ×${item.quantity ?? 1}`;
	}).join("、");
}
/**
* 生成邮件状态展示文本
*/
function formatEmailState(state) {
	return state === 1 ? "(未读)" : state === 2 ? "(已读)" : state === 3 ? "✅" : state === 4 ? "🗑️" : "(未知)";
}
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const feedback = adviceRenderer((reply) => sendMiddlewareReply(e, {
		...reply,
		title: "我的邮件"
	}));
	const loaded = await runRobotBusiness(e, "emails.list", emailListArguments(e.MessageText), parseRobotEmailList, next, feedback).catch(async () => {
		await sendMiddlewareReply(e, {
			title: "我的邮件",
			heading: "",
			text: "邮件列表查询失败，请稍后再试",
			buttons: [],
			advice: emailRecoveryTips("emails.list", "列表查询失败")
		});
		return { handled: true };
	});
	if (loaded.handled) return;
	const result = loaded.data;
	if (result.code === "EMPTY") {
		const emptyMd = Format.createMarkdown();
		emptyMd.addText(result.total > 0 ? `本页暂无邮件，当前共 ${result.total} 封邮件` : "暂无邮件");
		appendMiddlewareAdvice(emptyMd, emailRecoveryTips("emails.list", "本页暂无邮件"));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "我的邮件",
			header: [{
				label: "返回",
				command: "/更多"
			}],
			content: emptyMd
		}));
		return;
	}
	const contentMd = Format.createMarkdown();
	result.list.forEach((emailItem, idx) => {
		const statusText = formatEmailState(emailItem.state);
		const goodsText = formatEmailGoods(emailItem.goodsList);
		const lines = [`【${emailItem.emailId}】${emailItem.name} ${statusText}`];
		const emailBtns = [{
			label: "查看",
			command: `/查看邮件 ${emailItem.emailId}`
		}];
		if (emailItem.canClaim) emailBtns.push({
			label: "领取",
			command: `/领取邮件 ${emailItem.emailId}`
		});
		if (emailItem.canDelete) emailBtns.push({
			label: "删除",
			command: `/删除邮件 ${emailItem.emailId}`
		});
		if (emailItem.subtitle) lines.push(emailItem.subtitle);
		lines.push(`附件：${goodsText}`);
		contentMd.addBlockquote(createQuoteMarkdown(lines, emailBtns));
		if (idx < result.list.length - 1) contentMd.addNewline();
	});
	if ((result.hasClaimable || result.hasDeletable) && true) {
		const batchMd = Format.createMarkdown();
		if (result.hasClaimable) batchMd.addButton(markdownButtonLabel("一键领取"), { data: "/一键领取邮件" });
		if (result.hasDeletable) {
			if (result.hasClaimable) batchMd.addText(" ");
			batchMd.addButton(markdownButtonLabel("一键删除"), { data: "/一键删除邮件" });
		}
		contentMd.addBlockquote(batchMd);
	}
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "我的邮件",
		header: [{
			label: "返回",
			command: "/更多"
		}],
		content: contentMd,
		nav: result.totalPage > 1 ? {
			current: result.page,
			total: result.totalPage,
			count: result.total,
			command: "/我的邮件 {page}"
		} : void 0
	}));
});

//#endregion
export { res_default as default };