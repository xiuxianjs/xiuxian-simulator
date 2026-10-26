import { FormatGui, addOptions } from "../../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../../utils/useMessage.js";
import { appendMiddlewareAdvice, appendMiddlewareBlocks } from "../../../middlewareReply.js";
import { parseProfessionToolBag } from "../../../../api/bot/queries.js";
import { EMPTY_STRING, ZERO_VALUE } from "../../../../constants/common.js";
import "../../../../constants/index.js";
import { storageBagRecoveryTips } from "../../../storageBagRecovery.js";
import { selects } from "../../../config.js";
import { adviceRenderer } from "../../../feedbackRenderer.js";
import { runRobotBusiness } from "../../../robotBusiness.js";
import { renderSubTabs } from "../tabs.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/storage/newBag/tiangong/res.ts
/**
* 天工分类处理器
* 路由:
*   /储物袋 天工 - 显示天工工具类型按钮（火焰/丹炉/炼器台）
*   /储物袋 天工 火焰 - 显示火焰列表
*   /储物袋 天工 火焰 2 - 显示火焰第2页
*
* 注意：天工物品使用独立的 user_profession_tools 表
*/
const itemAction = (kind, item) => {
	switch (kind) {
		case "replace": return {
			label: "替换",
			command: `/替换 ${item.id}`
		};
		case "unlock": return {
			label: "解锁",
			command: `/解锁 天工 ${item.id}`
		};
		case "lock": return {
			label: "锁定",
			command: `/锁定 天工 ${item.id}`
		};
		case "viewDetail": return {
			label: "详情",
			command: `/物品详情 ${item.name}`
		};
		default: throw new Error(`天工接口返回无效物品能力: ${kind}`);
	}
};
const pageAction = (kind, activeType) => {
	switch (kind) {
		case "lockAll": return {
			label: "一键锁定",
			command: `/锁定 天工 ${activeType}`
		};
		case "unlockAll": return {
			label: "一键解锁",
			command: `/解锁 天工 ${activeType}`
		};
		default: throw new Error(`天工接口返回无效页面能力: ${kind}`);
	}
};
const response = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	try {
		const args = (e.MessageText ?? "").replace(/^(!|！|\/|#|＃)?(我的)?(储物袋|背包)\s+天工\s*/, "").trim().split(/\s+/).filter(Boolean);
		const [, parentNext] = useEvent();
		const response = await runRobotBusiness(e, "storage.profession-tools", { args }, parseProfessionToolBag, parentNext, adviceRenderer(async (reply) => {
			const md = Format.createMarkdown().addText(reply.text);
			if (reply.quote) md.addBlockquote(Format.createMarkdown().addText(reply.quote));
			appendMiddlewareBlocks(md, reply.blocks?.filter((block) => block.text !== reply.text || block.inlineButtons?.length));
			appendMiddlewareAdvice(md, reply.advice);
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md,
				footer: reply.buttons.length ? reply.buttons : void 0
			}));
		}));
		if (response.handled) return;
		const result = { data: response.data };
		const page = response.data.page;
		const { types, activeType, total, totalPages, items, capabilities } = result.data;
		const pageTools = items;
		const md = Format.createMarkdown();
		const subTabs = types.map((t) => ({
			label: t,
			command: `/储物袋 天工 ${t}`
		}));
		renderSubTabs(md, subTabs, activeType ?? void 0);
		if (!activeType) {
			md.addText("暂无天工类型");
			appendMiddlewareAdvice(md, storageBagRecoveryTips("storage.profession-tools", "暂无天工类型"));
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md
			}));
			return;
		}
		if (total === 0) {
			md.addText("该类型暂无天工工具");
			appendMiddlewareAdvice(md, storageBagRecoveryTips("storage.profession-tools", "该类型暂无天工工具"));
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md
			}));
			return;
		}
		if (!items.length) {
			md.addText(`本页暂无天工工具，当前分类共 ${total} 件`);
			appendMiddlewareAdvice(md, storageBagRecoveryTips("storage.profession-tools", "当前页无记录"));
		}
		let hasUnavailableReplace = false;
		pageTools.forEach((item) => {
			const lockIcon = item.isLocked ? "🔒" : "";
			md.addText(`【${item.id}】 ${lockIcon}${item.name}-${item.grade}`);
			addOptions(md, item.capabilities.map((kind) => itemAction(kind, item)));
			if (!item.capabilities.includes("replace")) {
				md.addText("当前未提供替换入口，请核对工具详情与职业状态");
				hasUnavailableReplace = true;
			}
			md.addNewline();
		});
		if (hasUnavailableReplace) appendMiddlewareAdvice(md, storageBagRecoveryTips("storage.profession-tools", "未提供替换入口"));
		md.addNewline();
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md,
			nav: {
				current: page,
				total: totalPages,
				command: `/储物袋 天工 ${activeType} {page}`
			},
			footer: capabilities.map((kind) => pageAction(kind, activeType))
		}));
	} catch (error) {
		logger.error("天工分类处理失败:", error);
		const md = Format.createMarkdown();
		md.addText("查询天工工具失败，请稍后重试");
		appendMiddlewareAdvice(md, storageBagRecoveryTips("storage.profession-tools", "查询失败"));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
	}
});

//#endregion
export { response as default };