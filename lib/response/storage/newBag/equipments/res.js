import { parseRobotStorageEquipment } from "../../../../api/bot/queries.js";
import { FormatGui, addOptions, createQuoteMarkdown } from "../../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../../utils/useMessage.js";
import { appendMiddlewareAdvice, appendMiddlewareBlocks } from "../../../middlewareReply.js";
import { EMPTY_STRING, ZERO_VALUE } from "../../../../constants/common.js";
import "../../../../constants/index.js";
import { equipmentRecoveryTips } from "../../../equipmentRecovery.js";
import { selects } from "../../../config.js";
import { adviceRenderer } from "../../../feedbackRenderer.js";
import { runRobotBusiness } from "../../../robotBusiness.js";
import { equipmentItemActions, equipmentPageActions } from "../capabilities.js";
import { renderSubTabs } from "../tabs.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/storage/newBag/equipments/res.ts
/**
* 装备分类处理器
* 路由:
*   /储物袋 装备 - 显示装备类型按钮（动态）
*   /储物袋 装备 武器 - 显示武器列表
*   /储物袋 装备 武器 2 - 显示武器第2页
*
* 注意：装备仍使用 userEquipments 表，暂未迁移到 userItems
*/
const response = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	try {
		const args = (e.MessageText ?? "").replace(/\s+操作(?=\s|$)/, "").replace(/^(!|！|\/|#|＃)?(我的)?(储物袋|背包)\s+装备\s*/, "").trim().split(/\s+/).filter(Boolean);
		const [, parentNext] = useEvent();
		const response = await runRobotBusiness(e, "storage.equipment", { args }, parseRobotStorageEquipment, parentNext, adviceRenderer(async (reply) => {
			const md = Format.createMarkdown().addText(reply.text);
			if (reply.quote) md.addBlockquote(Format.createMarkdown().addText(reply.quote));
			appendMiddlewareBlocks(md, reply.blocks?.filter((block) => block.text !== reply.text || block.inlineButtons?.length));
			appendMiddlewareAdvice(md, reply.advice);
			await message.send(FormatGui({
				isPrivate,
				bid,
				header: [{
					label: "返回",
					command: "/储物袋"
				}],
				content: md,
				footer: reply.buttons.length ? reply.buttons : void 0
			}));
		}));
		if (response.handled) return;
		const result = { data: response.data };
		const page = response.data.page;
		const equipmentType = response.data.requestedType;
		const baseCommand = equipmentType ? `/储物袋 装备 ${equipmentType}` : "/储物袋 装备";
		if (/\s+操作(?:\s|$)/.test(e.MessageText ?? "")) {
			const md = Format.createMarkdown().addText("选择批量操作；分解前会展示本批收益并要求确认，每次最多300件。");
			if (equipmentPageActions(result.data.capabilities).length === 0) {
				md.addNewline().addText("当前没有可用批量入口");
				appendMiddlewareAdvice(md, equipmentRecoveryTips("storage.equipment", "暂无批量操作"));
			}
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "装备 · 批量处理",
				content: md,
				footer: [...equipmentPageActions(result.data.capabilities), {
					label: "返回装备",
					command: baseCommand
				}]
			}));
			return;
		}
		const { types, activeType, total, totalPages, items } = result.data;
		const md = Format.createMarkdown();
		const subTabs = types.map((t) => ({
			label: t,
			command: `/储物袋 装备 ${t}`
		}));
		renderSubTabs(md, subTabs, activeType ?? void 0);
		if (!activeType) {
			md.addText("暂无装备类型");
			appendMiddlewareAdvice(md, equipmentRecoveryTips("storage.equipment", "暂无装备类型"));
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				header: [{
					label: "返回",
					command: "/储物袋"
				}],
				content: md
			}));
			return;
		}
		if (total === 0) {
			md.addText("该类型暂无装备");
			appendMiddlewareAdvice(md, equipmentRecoveryTips("storage.equipment", "该类型暂无装备"));
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				header: [{
					label: "返回",
					command: "/储物袋"
				}],
				content: md
			}));
			return;
		}
		if (items.length === 0) {
			md.addText(`本页暂无装备，当前分类共 ${total} 件`);
			appendMiddlewareAdvice(md, equipmentRecoveryTips("storage.equipment", "当前页无记录"));
		}
		let hasUnavailableItem = false;
		items.forEach((item) => {
			const lines = [`【${item.id}】`, `「${item.displayName}」 ${item.displayGrade} · ${item.displayEquipmentType}`];
			for (let i = 0; i < item.attributeParts.length; i += 2) {
				const attrPair = item.attributeParts.slice(i, i + 2).join(" ｜ ");
				lines.push(attrPair);
			}
			md.addText(lines[0]);
			const actions = equipmentItemActions(item);
			addOptions(md, actions);
			if (!actions.length) {
				md.addText("当前没有可用操作");
				hasUnavailableItem = true;
			}
			md.addText(lines[1]).addNewline();
			if (lines.length > 2) md.addBlockquote(createQuoteMarkdown(lines.slice(2)));
			md.addNewline();
			md.addNewline();
			md.addNewline();
		});
		if (hasUnavailableItem) appendMiddlewareAdvice(md, equipmentRecoveryTips("storage.equipment", "暂无可用操作"));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "储物袋 · 装备",
			header: [{
				label: "返回",
				command: "/储物袋"
			}],
			content: md,
			nav: {
				current: page,
				total: totalPages,
				command: `/储物袋 装备 ${activeType} {page}`
			},
			footer: [{
				label: "我的装备",
				command: "/我的装备"
			}, {
				label: "批量处理",
				command: `${baseCommand} 操作`
			}]
		}));
	} catch (error) {
		logger.error("装备分类处理失败:", error);
		const md = Format.createMarkdown();
		md.addText("查询装备失败，请稍后重试");
		appendMiddlewareAdvice(md, equipmentRecoveryTips("storage.equipment", "查询失败"));
		message.send(FormatGui({
			isPrivate,
			bid,
			header: [{
				label: "返回",
				command: "/储物袋"
			}],
			content: md
		}));
	}
});

//#endregion
export { response as default };