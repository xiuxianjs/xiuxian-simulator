import { formatGameTime } from "../../../utils/gameTime.js";
import { markdownButtonLabel } from "../../../utils/buttonLabel.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { listCommunityJoinRequests, readCommunitySettings, writeCommunitySettings } from "../../../api/bot/notification-cache.js";
import { requireCommunityAdministrator, requireCommunityBotAdministrator } from "../../../notification/community.js";
import { selects } from "../../config.js";
import { Format, logger, onResponse } from "alemonjs";

//#region src/response/notification/community/res.ts
const safeSummary = (value) => value.replace(/[\r\n<>`[\]*_]/g, " ").slice(0, 80);
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const quote = Format.createMarkdown();
	const text = (e.MessageText ?? "").trim().replace(/^[!！/#＃]/, "");
	const configuration = text.match(/^配置(群欢迎|加群提醒)\s+(开启|关闭)$/);
	const history = text.match(/^加群申请记录(?:\s+(\d+))?$/);
	try {
		const target = await requireCommunityAdministrator(e);
		if (history) {
			await requireCommunityBotAdministrator(target);
			const page = Number(history[1] ?? 1);
			if (!Number.isSafeInteger(page) || page < 1) throw new Error("页码必须是正整数。");
			const result = await listCommunityJoinRequests(target, page);
			quote.addText("平台事件摘要；收到事件不代表申请仍待审核。").addNewline();
			quote.addText("请在 QQ 群管理中核实与处理；此处不会自动审批。").addNewline();
			if (result.items.length === 0) quote.addText("本页暂无申请记录。").addNewline();
			for (const request of result.items) {
				quote.addText(`${safeSummary(request.userName || request.userId)} · ${request.autoApproved ? "平台已自动通过" : "已收到，状态待核实"}`).addNewline();
				quote.addText(`申请时间：${formatGameTime(request.appliedAt)}`).addNewline();
			}
			if (page > 1) quote.addButton(markdownButtonLabel("上一页"), { data: `/加群申请记录 ${page - 1}` });
			if (result.hasNext) quote.addText(" ").addButton(markdownButtonLabel("下一页"), { data: `/加群申请记录 ${page + 1}` });
		} else {
			const settings = await readCommunitySettings(target);
			if (configuration) {
				const enabled = configuration[2] === "开启";
				if (configuration[1] === "加群提醒" && enabled) await requireCommunityBotAdministrator(target);
				await writeCommunitySettings(target, {
					...settings,
					[configuration[1] === "群欢迎" ? "welcomeEnabled" : "requestReminders"]: enabled,
					updatedBy: e.UserId,
					updatedAt: Date.now()
				});
				settings[configuration[1] === "群欢迎" ? "welcomeEnabled" : "requestReminders"] = enabled;
			} else if (text !== "群通知管理") throw new Error("请使用 /群通知管理、/配置群欢迎 开启或关闭、/配置加群提醒 开启或关闭、/加群申请记录。");
			quote.addText(`成员欢迎：${settings.welcomeEnabled ? "已开启" : "已关闭"}`).addNewline();
			quote.addText(`加群申请提醒：${settings.requestReminders ? "已开启" : "已关闭"}`).addNewline();
			quote.addText("这些设置不改变个人游戏订阅。主动提醒还需应用推送能力、额度及群授权。").addNewline();
			if (settings.failedBatches) quote.addText(`有 ${settings.failedBatches} 批提醒多次失败，已停止重试；请核对权限和平台限制。`).addNewline();
			quote.addButton(markdownButtonLabel(settings.welcomeEnabled ? "关闭欢迎" : "开启欢迎"), { data: `/配置群欢迎 ${settings.welcomeEnabled ? "关闭" : "开启"}` }).addText(" ");
			quote.addButton(markdownButtonLabel(settings.requestReminders ? "关闭提醒" : "开启提醒"), { data: `/配置加群提醒 ${settings.requestReminders ? "关闭" : "开启"}` }).addNewline();
			quote.addButton(markdownButtonLabel("申请记录"), { data: "/加群申请记录" });
		}
	} catch (error) {
		logger.warn("群通知管理操作未完成", error instanceof Error ? error.message : "未知错误");
		quote.addText(error instanceof Error ? error.message : "群通知管理暂时不可用。");
	}
	await message.send(FormatGui({
		isPrivate: e.isPrivate,
		bid: e.UserId,
		mention: false,
		bar: false,
		title: "修仙 · 群通知管理",
		content: Format.createMarkdown().addBlockquote(quote)
	}));
});

//#endregion
export { res_default as default };