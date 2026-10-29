import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { parseRobotMarketBrowse } from "../../../api/bot/market-robot-query.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { formatNumber } from "../../../utils/formatHelper.js";
import { appendMarketCommandGuide, createMarketCommandBar, getMarketEmptyText, parseMarketCommand, shouldQueryMarket } from "../command.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/market/list/res.ts
const appendMarketCurrencyText = (md, spiritsCrystal) => {
	md.addText(`灵晶：${formatNumber(spiritsCrystal)}`);
	md.addNewline();
};
const appendQuotaText = (md, quota) => {
	if (!quota) return;
	if (quota.remaining <= 0) md.addText(`今日额度已用完（${formatNumber(quota.dailyUsed)}/${formatNumber(quota.dailyLimit)}）`);
	else md.addText(`今日剩余额度：${formatNumber(quota.remaining)}（${formatNumber(quota.dailyUsed)}/${formatNumber(quota.dailyLimit)}）`);
	md.addNewline();
};
/**
* 交易所列表 / 搜索 / 筛选指令
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const text = (e.MessageText ?? "").trim();
	const parsed = parseMarketCommand(text);
	if (!parsed) return;
	const [, next] = useEvent();
	const view = shouldQueryMarket(parsed) ? "browse" : "guide";
	const sendFailure = (text) => message.send(FormatGui({
		isPrivate,
		bid,
		title: parsed.title,
		content: Format.createMarkdown().addText(text),
		footer: createMarketCommandBar(parsed)
	}));
	let loaded;
	try {
		loaded = await runRobotBusiness(e, "market.browse", {
			view,
			...view === "browse" ? {
				categoryType: parsed.categoryKey?.type ?? "",
				categorySubtype: parsed.categoryKey?.subtype ?? "",
				keyword: parsed.keyword ?? "",
				sort: parsed.sort ?? "latest",
				page: String(parsed.page)
			} : {}
		}, (data) => parseRobotMarketBrowse(data, view), next, async (reply) => {
			await sendFailure(reply.text);
		});
	} catch (error) {
		logger.error("查看珍宝楼失败:", error);
		await sendFailure("查看珍宝楼失败，请稍后再试");
		return;
	}
	if (loaded.handled) return;
	if (loaded.data.view === "guide") {
		const contentMd = Format.createMarkdown();
		if (loaded.data.spiritsCrystal !== null) appendMarketCurrencyText(contentMd, loaded.data.spiritsCrystal);
		else logger.error("查看珍宝楼失败:", "货币余额暂时不可用");
		contentMd.addNewline();
		appendMarketCommandGuide(contentMd, parsed);
		contentMd.addNewline();
		message.send(FormatGui({
			isPrivate,
			bid,
			title: parsed.title,
			content: contentMd,
			footer: createMarketCommandBar(parsed)
		}));
		return;
	}
	const data = loaded.data;
	const contentMd = Format.createMarkdown();
	appendMarketCurrencyText(contentMd, data.spiritsCrystal);
	appendQuotaText(contentMd, data.quota);
	contentMd.addNewline();
	appendMarketCommandGuide(contentMd, parsed);
	contentMd.addNewline();
	contentMd.addNewline();
	if (data.items.length === 0) {
		contentMd.addText(getMarketEmptyText(parsed));
		contentMd.addNewline();
		message.send(FormatGui({
			isPrivate,
			bid,
			title: parsed.title,
			content: contentMd,
			footer: createMarketCommandBar(parsed)
		}));
		return;
	}
	/** 物品分类→详情指令参数映射 */
	const CATEGORY_DETAIL_MAP = {
		item: "物品",
		equipment: "装备",
		profession_tool: "天工",
		skill_book: "功法"
	};
	data.items.forEach((it) => {
		const canBuy = it.canPurchase;
		const typeLabel = it.itemCategoryLabel;
		const lines = [`【${it.listingId}】【${typeLabel}】 ${it.itemName}×${it.quantity}`];
		const mktBtns = [];
		if (canBuy) mktBtns.push({
			label: "购买",
			command: `/选购 ${it.listingId}`
		});
		const detailCN = CATEGORY_DETAIL_MAP[it.itemCategory];
		if (detailCN && it.templateItemId) mktBtns.push({
			label: "查看",
			command: `/物品详情 ${detailCN} ${it.templateItemId}`
		});
		const extra = it.attributeView;
		if (extra?.attrText) lines.push(`属性：${extra.attrText}`);
		if (it.upgradeHint) lines.push(`提示：${it.upgradeHint}`);
		lines.push(`单价：${it.unitPriceAmount} ${it.currencyName}  卖家：${it.sellerName}`);
		contentMd.addBlockquote(createQuoteMarkdown(lines, mktBtns));
	});
	message.send(FormatGui({
		isPrivate,
		bid,
		title: parsed.title,
		content: contentMd,
		nav: {
			current: data.pagination.currentPage,
			total: data.pagination.totalPages,
			count: data.pagination.total,
			command: parsed.pageCommand
		},
		footer: createMarketCommandBar(parsed)
	}));
});

//#endregion
export { res_default as default };