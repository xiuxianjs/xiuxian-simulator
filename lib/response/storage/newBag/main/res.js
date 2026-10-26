import { FormatGui } from "../../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../../utils/useMessage.js";
import { appendMiddlewareAdvice, appendMiddlewareBlocks } from "../../../middlewareReply.js";
import { parseRobotStorageMenu } from "../../../../api/bot/inventory.js";
import { storageBagRecoveryTips } from "../../../storageBagRecovery.js";
import { selects } from "../../../config.js";
import { adviceRenderer } from "../../../feedbackRenderer.js";
import { runRobotBusiness } from "../../../robotBusiness.js";
import { createPrimaryTabsBar } from "../tabs.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/storage/newBag/main/res.ts
/**
* 新储物袋主入口处理器
* 路由: /储物袋
* 功能: 显示一级分类 tabs，点击直接进入对应分类
*/
const response = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, parentNext] = useEvent();
	const renderFailure = adviceRenderer(async (reply) => {
		const md = Format.createMarkdown();
		md.addText(reply.text);
		if (reply.quote) md.addBlockquote(Format.createMarkdown().addText(reply.quote));
		appendMiddlewareBlocks(md, reply.blocks?.filter((block) => block.text !== reply.text || block.inlineButtons?.length));
		appendMiddlewareAdvice(md, reply.advice);
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "储物袋",
			content: md,
			footer: reply.buttons.length ? reply.buttons : createPrimaryTabsBar()
		}));
	});
	const response = await runRobotBusiness(e, "storage.menu", {}, parseRobotStorageMenu, parentNext, renderFailure).catch(async (error) => {
		logger.error("储物袋菜单加载失败", error);
		await renderFailure({
			title: "",
			heading: "",
			text: "查询储物袋失败，请稍后重试",
			buttons: [],
			advice: storageBagRecoveryTips("storage.menu", "查询失败")
		});
		return { handled: true };
	});
	if (response.handled) return;
	const result = { data: response.data };
	const md = Format.createMarkdown();
	md.addText(result.data.message);
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "储物袋",
		content: md,
		footer: createPrimaryTabsBar()
	}));
});

//#endregion
export { response as default };