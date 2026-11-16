import { FormatGui } from "../../../../utils/messageHelper.js";
import { section } from "../../../presentation/sections.js";
import { parseRobotStorageBag } from "../../../../api/bot/inventory.js";
import { EMPTY_STRING, ZERO_VALUE } from "../../../../constants/common.js";
import "../../../../constants/index.js";
import { useMessage as useMessage$1 } from "../../../../utils/useMessage.js";
import { appendMiddlewareAdvice, appendMiddlewareBlocks } from "../../../middlewareReply.js";
import { SUBCATEGORY_NAMES } from "../../../../constants/newStorage.js";
import { storageBagRecoveryTips } from "../../../storageBagRecovery.js";
import { selects } from "../../../config.js";
import { adviceRenderer } from "../../../feedbackRenderer.js";
import { runRobotBusiness } from "../../../robotBusiness.js";
import { PROP_SUB_TABS, renderSubTabs } from "../tabs.js";
import { inventoryItemActions, inventoryPageActions } from "../capabilities.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/storage/newBag/props/res.ts
/**
* 道具分类处理器
* 路由:
*   /储物袋 道具 - 显示二级分类
*   /储物袋 道具 丹药 - 显示丹药列表
*   /储物袋 道具 丹药 2 - 显示丹药第2页
*   /储物袋 道具 其它 - 显示其它道具列表
*/
const response = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const args = (e.MessageText ?? "").replace(/^(!|！|\/|#|＃)?(我的)?(储物袋|背包)\s+道具\s*/, "").trim().split(/\s+/).filter(Boolean);
	const formationBag = ["其它", "other"].includes(args[0]) && args[1] === "洞府阵法";
	const formationFooter = formationBag ? [{
		label: "返回阵法",
		command: "/洞府阵法",
		autoEnter: false
	}, {
		label: "灵田",
		command: "/灵田",
		autoEnter: false
	}] : void 0;
	const pageFrame = {
		isPrivate,
		bid,
		title: formationBag ? "储物袋 · 可用阵法" : void 0
	};
	try {
		const [, parentNext] = useEvent();
		const response = await runRobotBusiness(e, "storage.props", { args }, parseRobotStorageBag, parentNext, adviceRenderer(async (reply) => {
			const md = Format.createMarkdown();
			md.addText(reply.text);
			if (reply.quote) md.addBlockquote(Format.createMarkdown().addText(reply.quote));
			appendMiddlewareBlocks(md, reply.blocks?.filter((block) => block.text !== reply.text || block.inlineButtons?.length));
			appendMiddlewareAdvice(md, reply.advice);
			await message.send(FormatGui({
				...pageFrame,
				content: md,
				footer: formationFooter ?? reply.buttons
			}));
		}));
		if (response.handled) return;
		const result = { data: response.data };
		const activeSubcategory = result.data.activeSubcategory;
		const subcategoryDisplayName = SUBCATEGORY_NAMES[activeSubcategory] || activeSubcategory;
		const md = Format.createMarkdown();
		if (formationBag && activeSubcategory !== "formation") {
			md.addText("暂时无法查询可用阵法，请稍后重试。");
			await message.send(FormatGui({
				...pageFrame,
				content: md,
				footer: formationFooter
			}));
			return;
		}
		if (!formationBag) renderSubTabs(md, PROP_SUB_TABS, subcategoryDisplayName);
		if (result.data.total === 0) {
			md.addText(formationBag ? "暂无可用阵盘" : "该分类暂无物品");
			if (!formationBag) appendMiddlewareAdvice(md, storageBagRecoveryTips("storage.props", "该分类暂无物品"));
			message.send(FormatGui({
				...pageFrame,
				content: md,
				footer: formationFooter
			}));
			return;
		}
		if (!result.data.items.length) {
			md.addText(formationBag ? `本页暂无可用阵盘，共 ${result.data.total} 条记录` : `本页暂无物品，当前分类共 ${result.data.total} 条记录`);
			if (!formationBag) appendMiddlewareAdvice(md, storageBagRecoveryTips("storage.props", "当前页无记录"));
		}
		result.data.items.forEach((item) => {
			md.addBlockquote(section({
				title: `${item.name}`,
				id: item.id,
				suffix: item.isLocked ? "🔒" : "",
				lines: [`数量：×${item.quantity} · 品级：${item.grade?.name ?? "未知"} · 境界：${item.realm?.name ?? "未知"}`],
				actions: inventoryItemActions(item, formationBag)
			}));
			md.addNewline();
		});
		md.addNewline();
		message.send(FormatGui({
			...pageFrame,
			content: md,
			nav: {
				current: result.data.page,
				total: Math.ceil(result.data.total / result.data.pageSize),
				command: formationBag ? "/储物袋 道具 其它 洞府阵法 {page}" : `/储物袋 道具 ${activeSubcategory} {page}`
			},
			footer: formationFooter ?? inventoryPageActions(result.data.capabilities, "道具", subcategoryDisplayName)
		}));
	} catch (error) {
		logger.error("道具分类处理失败:", error);
		const md = Format.createMarkdown();
		md.addText(formationBag ? "查询可用阵法失败，请稍后重试" : "查询道具失败，请稍后重试");
		if (!formationBag) appendMiddlewareAdvice(md, storageBagRecoveryTips("storage.props", "查询失败"));
		message.send(FormatGui({
			...pageFrame,
			content: md,
			footer: formationFooter
		}));
	}
});

//#endregion
export { response as default };