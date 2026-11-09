import { formatNumber } from "../../../utils/formatHelper.js";
import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { parseRobotMarketBrowse, parseRobotMarketFishDetail } from "../../../api/bot/market-robot-query.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { appendMarketCommandGuide, createMarketCommandBar, getMarketEmptyText, marketSearchCommand, parseMarketCommand, shouldQueryMarket } from "../command.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/market/list/res.ts
const appendMarketCurrencyText = (md, spiritsCrystal) => {
	md.addText(`灵晶：${formatNumber(spiritsCrystal)}`);
	md.addNewline();
};
const appendQuotaText = (md, quota) => {
	if (!quota) return;
	if (quota.remaining <= 0) md.addText(`今日已限额（${formatNumber(quota.dailyUsed)}/${formatNumber(quota.dailyLimit)}）`);
	else md.addText(`今日限额：${formatNumber(quota.remaining)}（${formatNumber(quota.dailyUsed)}/${formatNumber(quota.dailyLimit)}）`);
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
	const [, next] = useEvent();
	const detail = /^(?:[!！/#＃])?(?:交易所|珍宝楼)\s+查看鱼类(?:\s+(.*))?$/.exec(text);
	if (detail) {
		const title = "珍宝楼 · 鱼类详情";
		const footer = [{
			label: "返回",
			command: "/珍宝楼",
			autoEnter: false
		}];
		const sendDetail = (content) => message.send(FormatGui({
			isPrivate,
			bid,
			title,
			content,
			footer
		}));
		const listingId = Number(detail[1]);
		if (!/^[1-9]\d*$/.test(detail[1] ?? "") || !Number.isSafeInteger(listingId)) {
			await sendDetail(Format.createMarkdown().addText("请输入有效的鱼类挂单编号。"));
			return;
		}
		try {
			const result = await runRobotBusiness(e, "market.fish-detail", { listingId }, (data) => parseRobotMarketFishDetail(data, listingId), next, async (reply) => {
				await sendDetail(Format.createMarkdown().addText(reply.text));
			});
			if (!result.handled) {
				const fish = result.data;
				const weight = `${Math.trunc(fish.weightG / 1e3)}.${String(fish.weightG % 1e3).padStart(3, "0")} kg`;
				await sendDetail(Format.createMarkdown().addBlockquote(createQuoteMarkdown([
					`【${listingId}】${fish.itemName} #${fish.catchId}`,
					`境界：${fish.fishRealmName}`,
					`重量：${weight}`,
					`单价：${fish.unitPriceAmount} ${fish.currencyName}  卖家：${fish.sellerName}`
				])));
			}
		} catch (error) {
			logger.error("查看珍宝楼鱼类详情失败:", error);
			await sendDetail(Format.createMarkdown().addText("查看鱼类详情失败，请稍后再试。"));
		}
		return;
	}
	const parsed = parseMarketCommand(text);
	if (!parsed) return;
	const commandBar = (reference) => createMarketCommandBar(parsed, reference).map((row) => row.map((button) => ({
		...button,
		autoEnter: false
	})));
	const fallbackFooter = commandBar();
	const view = shouldQueryMarket(parsed) ? "browse" : "guide";
	const sendFailure = (text) => message.send(FormatGui({
		isPrivate,
		bid,
		title: parsed.title,
		content: Format.createMarkdown().addText(text),
		footer: fallbackFooter
	}));
	let loaded;
	try {
		loaded = await runRobotBusiness(e, "market.browse", {
			view,
			...view === "browse" ? {
				categoryType: parsed.categoryKey?.type ?? "",
				categorySubtype: parsed.categoryKey?.subtype ?? "",
				keyword: parsed.keyword ?? "",
				...parsed.searchReference ? { searchReference: parsed.searchReference } : {},
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
			footer: fallbackFooter
		}));
		return;
	}
	const data = loaded.data;
	const reference = parsed.mode === "search" ? data.searchReference : void 0;
	const footer = commandBar(reference);
	const pageCommand = parsed.mode === "search" ? reference && marketSearchCommand(reference, parsed.sortCN, "{page}") : parsed.pageCommand;
	const contentMd = Format.createMarkdown();
	appendMarketCurrencyText(contentMd, data.spiritsCrystal);
	appendQuotaText(contentMd, data.quota);
	contentMd.addNewline();
	appendMarketCommandGuide(contentMd, parsed);
	if (parsed.mode === "search" && !reference && data.pagination.totalPages > 1) contentMd.addText("搜索翻页暂不可用，请重新输入关键词。");
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
			footer
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
		const fish = it.itemCategory === "fish";
		const lines = [`【${it.listingId}】【${typeLabel}】 ${it.itemName}×${it.quantity}`];
		const mktBtns = [];
		if (canBuy) mktBtns.push({
			label: "购买",
			command: `/选购 ${it.listingId}${fish ? " 1" : ""}`,
			autoEnter: false
		});
		const detailCN = CATEGORY_DETAIL_MAP[it.itemCategory];
		if (detailCN && it.templateItemId) mktBtns.push({
			label: "查看",
			command: `/物品详情 ${detailCN} ${it.templateItemId}`,
			autoEnter: false
		});
		if (fish) mktBtns.push({
			label: "查看",
			command: `/珍宝楼 查看鱼类 ${it.listingId}`,
			autoEnter: false
		});
		else {
			const extra = it.attributeView;
			if (extra?.attrText) lines.push(`属性：${extra.attrText}`);
			if (it.upgradeHint) lines.push(`提示：${it.upgradeHint}`);
		}
		lines.push(`单价：${it.unitPriceAmount} ${it.currencyName}  卖家：${it.sellerName}`);
		contentMd.addBlockquote(createQuoteMarkdown(lines, mktBtns));
	});
	message.send(FormatGui({
		isPrivate,
		bid,
		title: parsed.title,
		content: contentMd,
		nav: pageCommand ? {
			current: data.pagination.currentPage,
			total: data.pagination.totalPages,
			count: data.pagination.total,
			command: pageCommand,
			autoEnter: false
		} : void 0,
		footer
	}));
});

//#endregion
export { res_default as default };