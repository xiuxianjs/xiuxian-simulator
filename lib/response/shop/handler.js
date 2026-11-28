import { commandText } from "../../utils/commandPrefix.js";
import { markdownButtonLabel } from "../../utils/buttonLabel.js";
import { FormatGui, addOptions, createQuoteMarkdown } from "../../utils/messageHelper.js";
import { displayCurrencyText, toCurrencyName } from "../../constants/currency.js";
import { measureTransportStageSync } from "../../utils/transportTiming.js";
import { BackendAPIError } from "../../api/bot/client.js";
import { decodeShopData } from "../../api/bot/companion-shop-queries.js";
import "../../constants/index.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { isShopPurchaseReference, parseShopPurchaseOverview, parseShopPurchaseReferenceResult } from "../../api/bot/interaction-overview.js";
import "../../api/index.js";
import { appendCurrencyCardToMd } from "../../utils/currencyCardHelper.js";
import { selects } from "../config.js";
import { SHOP_META } from "./meta.js";
import { loadFinalBusiness } from "../finalBusiness.js";
import { checkEncounterAfterPanel } from "../onlineEncounter/afterPanel.js";
import { appendShopSearch, buildShopBrowseCommand, createShopCategoryFooter, parseShopBrowseCommand } from "./filters.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/shop/handler.ts
/**
* 通用商店 handler 工厂
* 生成可直接作为路由 handler 使用的 onResponse 回调
* 为商店定规矩。
*
* 排序规则： 限购周期 > 境界限制 -> 解锁条件 > 权重
*
*/
/** 情绪型商品购买后的氛围文本（道侣商店专属，无战力影响） */
const EMOTIONAL_ITEM_TEXT = {
	同心结: "两心相系，此结虽小，情意绵长。",
	三生缘: "三世之约，一缕红线，牵引无尽。",
	素心绢帕: "素帕轻柔，藏于袖间，心意已达。",
	灵溪玉佩: "玉润如水，随身守护，仙缘渐深。",
	静心竹笺: "竹笺清香，字迹未落，情已先到。",
	同心锁: "锁住流年，共守此心，岁月静好。",
	红线: "红线千里，命中注定，缘起于此。"
};
/**
* 为情绪型商品（道侣商店）构建购买氛围文本
* 仅作展示，不影响任何数值
*/
const buildEmotionalPurchaseText = (shopCode, itemName) => {
	if (shopCode !== "DAOLV") return;
	return EMOTIONAL_ITEM_TEXT[itemName] ?? "此物轻巧，却承载着一份难以言说的心意。";
};
/** 商品类别 → 详情指令参数 */
const CATEGORY_CMD_MAP = {
	item: "物品",
	equipment: "装备",
	skill_book: "功法"
};
const getItemDetailCommand = (item) => {
	if (item.category === "soul_artifact" && item.itemId) return `/图鉴详情 本命 ${item.itemId}`;
	const categoryCN = CATEGORY_CMD_MAP[item.category];
	if (!categoryCN || !item.itemId) return;
	return `/物品详情 ${categoryCN} ${item.itemId}`;
};
/** 商店头部导航（所有商店共享） */
const SHOP_HEADER_BASE = [
	{
		label: "万宝楼",
		command: "/商店 万宝楼"
	},
	{
		label: "签到",
		command: "/商店 签到"
	},
	{
		label: "积分",
		command: "/商店 积分"
	},
	{
		label: "道侣",
		command: "/商店 道侣"
	},
	{
		label: "神奇",
		command: "/商店 神奇"
	},
	{
		label: "声望",
		command: "/商店 声望"
	},
	{
		label: "渔市",
		command: "/商店 渔市"
	}
];
const SHOP_CODE_MAP = {
	万宝楼: "WANBAOLOU",
	签到: "CHECKIN",
	签到商店: "CHECKIN",
	积分: "TOWER_SCORE",
	积分商店: "TOWER_SCORE",
	道侣: "DAOLV",
	道侣商店: "DAOLV",
	神奇: "SHENQI",
	神奇商店: "SHENQI",
	声望: "REPUTATION",
	声望商店: "REPUTATION",
	渔市: "FISHING"
};
const getShopHeader = (access, selection) => SHOP_HEADER_BASE.flatMap((item) => {
	const shopCode = SHOP_CODE_MAP[item.command.slice(4)];
	if (shopCode !== "FISHING" && !access.visibleShopCodes.includes(shopCode)) return [];
	const changingFishingShop = shopCode === "FISHING" !== (selection.shopCode === "FISHING");
	return [{
		...item,
		selected: selection.shopCode === shopCode,
		autoEnter: false,
		command: buildShopBrowseCommand(selection, {
			shopCode,
			currencyCode: void 0,
			filters: {
				...selection.filters,
				sort: void 0
			},
			...changingFishingShop ? {
				categoryLabel: "全部",
				secondaryLabel: void 0
			} : {}
		})
	}];
});
const formatItem = (item, omitRemaining) => {
	const actualPrice = item.discountPriceAmount ?? item.priceAmount;
	let price = `${actualPrice} ${item.priceCurrencyName}`;
	if (actualPrice < item.priceAmount) price += `（原价${item.priceAmount}，${item.discountLabel ?? "优惠价"}）`;
	if (item.secondaryPriceAmount && item.secondaryPriceCurrencyName) price += ` + ${item.secondaryPriceAmount} ${item.secondaryPriceCurrencyName}`;
	const remainingText = omitRemaining ? "" : ` · 剩余${item.remaining}份`;
	return {
		limitText: item.limit === -1 ? "不限购" : `限${item.limit}份${remainingText}`,
		periodText: item.limit > 0 ? `${item.limitPeriodCN}` : "",
		lockText: item.unlocked ? "" : ` 🔒${item.lockReason ?? "未解锁"}`,
		price
	};
};
const groupShopOffers = (products, groupFishing) => {
	const cards = [];
	const packs = /* @__PURE__ */ new Map();
	for (const item of products) if (groupFishing && item.shopCode === "FISHING" && item.category === "item" && item.itemId && item.itemId > 0) {
		const key = `${item.itemId}:${item.quantity}`;
		const offers = packs.get(key);
		if (offers) {
			offers.push(item);
			continue;
		}
		const pack = [item];
		packs.set(key, pack);
		cards.push(pack);
	} else cards.push([item]);
	return cards;
};
const appendShopOffer = (quote, item, compact, raidBanned = false) => {
	const soldOut = item.limit > 0 && item.remaining === 0;
	const { limitText, periodText, lockText, price } = formatItem(item, compact && soldOut);
	const detailCommand = compact ? void 0 : getItemDetailCommand(item);
	const shopBtns = [];
	if (item.unlocked && !soldOut && !(raidBanned && item.shopCode === "WANBAOLOU")) {
		const buyCmd = SHOP_META[item.shopCode]?.buyCmd ?? "购买";
		shopBtns.push({
			label: "购买",
			command: `/${buyCmd} ${item.productId}`
		});
	}
	if (detailCommand) shopBtns.push({
		label: "详情",
		command: detailCommand
	});
	const priceLine = compact ? `${price} · ${periodText}${limitText}` : `${price}  ${periodText}${limitText}`;
	const lines = compact ? [priceLine, lockText.trim()].filter(Boolean) : [...!item.unlocked ? [lockText] : [], priceLine];
	if (soldOut) lines.push({
		每日: "今日已兑完",
		每周: "本周已兑完",
		每月: "本月已兑完",
		终身: "终身额度已用完"
	}[item.limitPeriodCN] ?? "当前额度已用完");
	if (item.category === "soul_artifact" && item.limit > 0) {
		const reset = {
			每周: "每周一00:00重置",
			每月: "每月1日00:00重置"
		}[item.limitPeriodCN];
		if (reset) lines.push(`${reset}（北京时间）`);
	}
	if (item.shopCode !== "CHECKIN" && item.category === "item" && (item.itemId === 38 || item.itemId === 39)) shopBtns.push({
		label: "查看签到兑换",
		command: `/商店 签到 搜索 ${item.itemId === 38 ? "精力丹" : "元力丹"}`
	});
	quote.absorb(createQuoteMarkdown(compact ? [lines.join(" · ")] : lines));
	if (shopBtns.length > 0) addOptions(quote, shopBtns.map((button) => ({
		...button,
		autoEnter: false
	})));
	else quote.addNewline();
};
/**
* 创建商店列表路由 handler
* @param shopCode 商店代号，如 'CHECKIN' | 'SHENQI' | 'WANBAOLOU' 等；不传则支持 /商店 [分类] [页码]
*/
const createShopListHandler = (shopCode) => {
	return onResponse(selects, async (e) => {
		const [, next] = useEvent();
		const [message] = useMessage$1();
		const bid = e?.UserId;
		const text = e.MessageText?.trim() ?? "";
		const parsed = parseShopBrowseCommand(text, shopCode);
		const activeShopCode = parsed.shopCode;
		const page = parsed.page;
		const currencyCode = parsed.currencyCode;
		let shopQuery;
		try {
			const business = await loadFinalBusiness(e, next, "shops.list", {
				page,
				shopCode: activeShopCode,
				currencyCode,
				...!parsed.error && parsed.searchReference ? { searchReference: parsed.searchReference } : {},
				...!parsed.error && Object.values(parsed.filters).some((value) => value !== void 0) ? { filters: parsed.filters } : {}
			}, (value) => decodeShopData(value));
			if (business.handled) return;
			shopQuery = await business.load();
		} catch {
			const response = measureTransportStageSync("response.build", () => {
				const md = Format.createMarkdown();
				const baseTitle = activeShopCode ? SHOP_META[activeShopCode]?.name ?? "商店" : "商店（全部）";
				const errorTitle = currencyCode ? `${baseTitle}（${toCurrencyName(currencyCode)}）` : baseTitle;
				md.addText(`${errorTitle}暂不可用`);
				return FormatGui({
					isPrivate: e.isPrivate ?? false,
					bid,
					title: errorTitle,
					content: md
				});
			}, e);
			message.send(response);
			return;
		}
		const response = measureTransportStageSync("response.build", () => {
			const access = shopQuery.access;
			const searching = Boolean(parsed.filters.keyword ?? parsed.searchReference);
			const selection = {
				...parsed,
				searchReference: searching ? shopQuery.searchReference : void 0
			};
			const renderCurrency = (md) => {
				appendCurrencyCardToMd(md, shopQuery.currencies, { hideZero: true });
				if (!shopQuery.access.deniedReason) {
					appendShopSearch(md, parsed);
					if (searching && !selection.searchReference) md.addText("搜索续查暂不可用，请重新输入关键词。").addNewline();
				}
			};
			const shopHeader = getShopHeader(access, selection);
			const categoryFooter = createShopCategoryFooter(selection).map((action) => ({
				...action,
				autoEnter: false
			}));
			const accessDeniedReason = access.deniedReason;
			let title = (activeShopCode ? SHOP_META[activeShopCode] : void 0)?.name ?? "商店";
			if (currencyCode) title = `${title}（${toCurrencyName(currencyCode)}）`;
			else if (!activeShopCode) title = "商店（全部）";
			if (accessDeniedReason) {
				const md = Format.createMarkdown();
				renderCurrency(md);
				md.addText(accessDeniedReason);
				return FormatGui({
					isPrivate: e.isPrivate ?? false,
					bid,
					title,
					header: shopHeader,
					content: md
				});
			}
			const result = shopQuery.result;
			if (parsed.error || result.data.length === 0) {
				const emptyMd = Format.createMarkdown();
				renderCurrency(emptyMd);
				emptyMd.addText(parsed.error ?? (Object.values(parsed.filters).some(Boolean) || currencyCode ? "没有符合条件的商品" : "暂无商品"));
				return FormatGui({
					isPrivate: e.isPrivate ?? false,
					bid,
					title,
					header: shopHeader,
					content: emptyMd,
					footer: categoryFooter
				});
			}
			const contentMd = Format.createMarkdown();
			renderCurrency(contentMd);
			const raidBanned = access.shopRaidBan && access.shopRaidBanUntil !== null;
			if (raidBanned) {
				contentMd.addText(`昨日参与劫车，${access.shopRaidBanUntil} 前无法在万宝楼购买。`);
				contentMd.addNewline();
			}
			groupShopOffers(result.data, activeShopCode === "FISHING" && !currencyCode).forEach((offers) => {
				const [first] = offers;
				const grouped = offers.length > 1;
				const compact = grouped || first.shopCode === "FISHING" && (first.itemSubtype === "fishing_bait" || first.itemSubtype === "fishing_chum");
				const productTag = grouped ? "" : `【${first.productId}】`;
				const typeTag = first.typeLabel ? `【${first.typeLabel}】` : "";
				const quote = Format.createMarkdown().addBold(`${productTag}${typeTag}${first.name} ×${first.quantity}`);
				const detailCommand = compact ? getItemDetailCommand(first) : void 0;
				if (detailCommand) addOptions(quote, [{
					label: "详情",
					command: detailCommand,
					autoEnter: false
				}], void 0, false);
				quote.addNewline();
				offers.forEach((item) => {
					appendShopOffer(quote, item, compact, raidBanned);
				});
				contentMd.addBlockquote(quote);
			});
			const pageCmd = buildShopBrowseCommand(selection, {}, "{page}");
			return FormatGui({
				isPrivate: e.isPrivate ?? false,
				bid,
				title,
				header: shopHeader,
				content: contentMd,
				footer: categoryFooter,
				nav: !searching || selection.searchReference ? {
					current: result.pagination.currentPage,
					total: result.pagination.totalPages,
					command: pageCmd,
					autoEnter: false
				} : void 0
			});
		}, e);
		if (response) {
			const sent = message.send(response);
			if (shopCode === void 0 && !parsed.error && !shopQuery.access.deniedReason) await checkEncounterAfterPanel(e, "shop", message, sent);
		}
	});
};
/**
* 统一商店购买 handler
* 指令格式：/购买 <商品编号> [数量]
* 商品编号全局唯一，自动根据 product.shopCode 识别所属商店
*/
const shopBuyHandler = onResponse(selects, async (e) => {
	const [, next] = useEvent();
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const fallbackTitle = "商店";
	const command = e.MessageText?.trim() ?? "";
	const referenceCommand = /^(?:[!！/#＃]\s*)?购买\s+确认(?:\s+(.*))?$/.exec(command);
	if (referenceCommand) {
		const reference = referenceCommand[1];
		const content = Format.createMarkdown();
		try {
			if (!isShopPurchaseReference(reference) || [...command].length > 80) throw new Error("购买引用无效");
			const business = await loadFinalBusiness(e, next, "shops.purchase", {
				mode: "reference",
				reference
			}, (data) => parseShopPurchaseReferenceResult(data, reference));
			if (business.handled) return;
			const result = await business.load();
			if (!result) throw new Error("购买回执不完整");
			content.addText(`购买成功：${result.name}，支付${displayCurrencyText(result.paid)}，获得×${result.granted}`);
		} catch (error) {
			content.addText(error instanceof BackendAPIError ? error.message : "购买结果未确认，请使用原确认入口核对。");
		}
		await message.send(FormatGui({
			isPrivate: e.isPrivate ?? false,
			bid,
			title: "渔市",
			content,
			footer: [{
				label: "返回渔市",
				command: "/商店 渔市"
			}]
		}));
		return;
	}
	const match = command.match(/(\d+)(?:\s+(\d+))?(\s+确认)?$/);
	if (!match) {
		if ((await loadFinalBusiness(e, next, "shops.purchase", { mode: "usage" }, (value) => value)).handled) return;
		const content = Format.createMarkdown();
		content.addText("格式：购买 商品编号 数量");
		content.addNewline();
		content.addText("示例：购买 301（购买1个）或 购买 301 10（购买10个）");
		message.send(FormatGui({
			isPrivate: e.isPrivate ?? false,
			bid,
			title: fallbackTitle,
			content
		}));
		return;
	}
	const productId = Number(match[1]);
	const count = match[2] ? Number(match[2]) : 1;
	const confirmed = Boolean(match[3]);
	let overview;
	try {
		const business = await loadFinalBusiness(e, next, "shops.purchase", {
			productId,
			count,
			confirmed
		}, parseShopPurchaseOverview);
		if (business.handled) return;
		overview = await business.load();
	} catch (error) {
		const content = Format.createMarkdown();
		content.addText(error instanceof BackendAPIError ? error.message : "购买预检失败，请稍后再试");
		message.send(FormatGui({
			isPrivate: e.isPrivate ?? false,
			bid,
			title: fallbackTitle,
			content
		}));
		return;
	}
	const preview = overview.preview;
	const meta = SHOP_META[preview.shopCode];
	const shopName = meta?.name ?? fallbackTitle;
	const alternative = overview.checkinAlternative;
	const appendAlternative = (content, settled) => {
		if (!alternative) return;
		content.addBlockquote(createQuoteMarkdown([`${settled ? "下次补给也可选择" : "也可选择"}：${alternative.name} ×${alternative.granted}，${displayCurrencyText(alternative.paid)}（1份）`], [{
			label: "查看签到兑换",
			command: "/商店 签到"
		}]));
	};
	if (isShopPurchaseReference(overview.reference) || preview.needsConfirmation && !confirmed) {
		const confirmCmd = overview.reference ? `/购买 确认 ${overview.reference}` : `/${meta?.buyCmd ?? "购买"} ${productId}${count > 1 ? ` ${count}` : ""} 确认`;
		const content = Format.createMarkdown();
		content.addText("⚠️ 大额购买提醒");
		content.addNewline();
		content.addText(`将购买：${preview.name} ×${preview.granted}；合计：${displayCurrencyText(preview.paid)}`);
		content.addNewline();
		appendAlternative(content, false);
		message.send(FormatGui({
			isPrivate: e.isPrivate ?? false,
			bid,
			title: shopName,
			content,
			footer: [{
				label: "确认购买",
				command: confirmCmd
			}, {
				label: "返回商店",
				command: `/${meta?.listCmd ?? "商店"}`
			}]
		}));
		return;
	}
	try {
		if (overview.purchaseError) throw new BackendAPIError(overview.purchaseError);
		const result = overview.result;
		if (!result) throw new Error("商店结算响应不完整");
		const content = Format.createMarkdown();
		if (meta?.listCmd) {
			content.addButton(markdownButtonLabel("返回"), { data: commandText(`${meta.listCmd}`) });
			content.addNewline();
		}
		content.addText(`购买成功：${result.name}，支付${displayCurrencyText(result.paid)}，获得×${result.granted}`);
		appendAlternative(content, true);
		const emotionalText = buildEmotionalPurchaseText(preview.shopCode, result.name);
		if (emotionalText) {
			content.addNewline();
			content.addBlockquote(Format.createMarkdown().addText(emotionalText));
		}
		message.send(FormatGui({
			isPrivate: e.isPrivate ?? false,
			bid,
			title: shopName,
			content
		}));
	} catch (error) {
		const content = Format.createMarkdown();
		content.addText(error instanceof BackendAPIError ? error.message : "购买失败，请稍后再试");
		message.send(FormatGui({
			isPrivate: e.isPrivate ?? false,
			bid,
			title: shopName,
			content
		}));
	}
});

//#endregion
export { createShopListHandler, shopBuyHandler };