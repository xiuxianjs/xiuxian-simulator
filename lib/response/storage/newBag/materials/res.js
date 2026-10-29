import { FormatGui, createQuoteMarkdown } from "../../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../../utils/useMessage.js";
import { appendMiddlewareAdvice, appendMiddlewareBlocks } from "../../../middlewareReply.js";
import { EMPTY_STRING, ZERO_VALUE } from "../../../../constants/common.js";
import "../../../../constants/index.js";
import { parseRobotStorageBag } from "../../../../api/bot/inventory.js";
import { storageBagRecoveryTips } from "../../../storageBagRecovery.js";
import { selects } from "../../../config.js";
import { adviceRenderer } from "../../../feedbackRenderer.js";
import { runRobotBusiness } from "../../../robotBusiness.js";
import { inventoryItemActions, inventoryPageActions } from "../capabilities.js";
import { MATERIAL_SUB_TABS, renderSubTabs } from "../tabs.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/storage/newBag/materials/res.ts
/**
* 材料分类处理器
* 路由:
*   /储物袋 材料 - 显示二级分类
*   /储物袋 材料 草药 - 显示草药列表
*   /储物袋 材料 草药 2 - 显示草药第2页
*   /储物袋 材料 经验 - 显示经验材料列表
*   /储物袋 材料 其它 - 显示其它材料列表
*/
const response = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	try {
		const args = (e.MessageText ?? "").replace(/^(!|！|\/|#|＃)?(我的)?(储物袋|背包)\s+材料\s*/, "").trim().split(/\s+/).filter(Boolean);
		const [, parentNext] = useEvent();
		const response = await runRobotBusiness(e, "storage.materials", { args }, parseRobotStorageBag, parentNext, adviceRenderer(async (reply) => {
			const md = Format.createMarkdown();
			md.addText(reply.text);
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
		const activeSubcategory = result.data.activeSubcategory;
		const subcategoryName = {
			herb: "草药",
			exp: "经验材料",
			other: "其它"
		}[activeSubcategory] || activeSubcategory;
		const md = Format.createMarkdown();
		renderSubTabs(md, MATERIAL_SUB_TABS, subcategoryName);
		if (result.data.total === 0) {
			md.addText("该分类暂无物品");
			appendMiddlewareAdvice(md, storageBagRecoveryTips("storage.materials", "该分类暂无物品"));
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md
			}));
			return;
		}
		if (!result.data.items.length) {
			md.addText(`本页暂无物品，当前分类共 ${result.data.total} 条记录`);
			appendMiddlewareAdvice(md, storageBagRecoveryTips("storage.materials", "当前页无记录"));
		}
		result.data.items.forEach((item) => {
			const lockIcon = item.isLocked ? "🔒" : "";
			const gradeName = item.grade?.name ?? "未知";
			const realmName = item.realm?.name ?? "未知";
			md.addBlockquote(createQuoteMarkdown([` 【${item.id}】${lockIcon}${item.name} x${item.quantity}`, ` 品级: ${gradeName} | 境界: ${realmName}`], inventoryItemActions(item)));
			md.addNewline();
		});
		md.addNewline();
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md,
			nav: {
				current: result.data.page,
				total: Math.ceil(result.data.total / result.data.pageSize),
				command: `/储物袋 材料 ${subcategoryName} {page}`
			},
			footer: inventoryPageActions(result.data.capabilities, "材料", subcategoryName)
		}));
	} catch (error) {
		logger.error("材料分类处理失败:", error);
		const md = Format.createMarkdown();
		md.addText("查询材料失败，请稍后重试");
		appendMiddlewareAdvice(md, storageBagRecoveryTips("storage.materials", "查询失败"));
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