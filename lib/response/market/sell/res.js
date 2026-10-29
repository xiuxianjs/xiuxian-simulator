import { FormatGui, addOptions } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { DEFAULT_PAGE, EMPTY_STRING, MIN_PAGE } from "../../../constants/common.js";
import "../../../constants/index.js";
import { parseRobotMarketSell } from "../../../api/bot/market-sell-query.js";
import { isUnifiedItemCategory } from "../../../constants/marketCategories.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { MARKET_PRIMARY_CATEGORY_KEYS, MARKET_SECONDARY_CATEGORY_LABELS, getMarketSecondaryCategoryKey, isMarketSecondaryParentLabel, isMarketSellPrimaryLabel } from "../categories.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/market/sell/res.ts
/**
* 交易上架指令
* - /交易上架：选择分类
* - /交易上架 道具 丹药：查看该分类第1页
* - /交易上架 道具 丹药2：查看该分类第2页（分类后不加空格的数字为页码）
* - /交易上架 道具 丹药 36：显示提示，要求补齐数量与单价
* - /交易上架 道具 丹药 36 2 100：直接以 数量2 单价100 上架（装备/功法数量固定为1，只传单价即可）
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const text = (e.MessageText ?? "").trim();
	/**
	* 构建"交易上架"分类选择按钮
	* 原布局：第一行[道具][材料]，第二行[装备][天工]，第三行[功法][本命]，如有二级则第四行为二级按钮
	*/
	const createSellCategoryButtons = (primaryCategory) => {
		const rows = [
			[{
				label: "道具",
				command: "/交易上架 道具"
			}, {
				label: "材料",
				command: "/交易上架 材料"
			}],
			[{
				label: "装备",
				command: "/交易上架 装备"
			}, {
				label: "天工",
				command: "/交易上架 天工"
			}],
			[{
				label: "功法",
				command: "/交易上架 功法"
			}, {
				label: "本命",
				command: "/交易上架 本命"
			}]
		];
		if (primaryCategory) rows.push(MARKET_SECONDARY_CATEGORY_LABELS[primaryCategory].map((category) => ({
			label: category,
			command: `/交易上架 ${primaryCategory} ${category}`
		})));
		return rows;
	};
	/**
	* 构建"交易上架"分类切换按钮
	*/
	const createSellPageButtons = (categoryCN) => {
		if (categoryCN.startsWith("道具")) return createSellCategoryButtons("道具");
		if (categoryCN.startsWith("材料")) return createSellCategoryButtons("材料");
		return createSellCategoryButtons();
	};
	/**
	* 解析交易上架指令
	*/
	const parseCommand = (msg) => {
		const args = msg.replace(/^(!|！|\/|#|＃)?交易上架\s*/, "").trim();
		if (!args) return { kind: "choose" };
		const parts = args.split(/\s+/).filter(Boolean);
		const primaryMatch = (parts[0] ?? "").match(/^(.+?)(\d+)?$/);
		if (!primaryMatch || !isMarketSellPrimaryLabel(primaryMatch[1])) return null;
		const primaryCategory = primaryMatch[1];
		const primaryPage = primaryMatch[2] ? Math.max(1, Number(primaryMatch[2])) : 1;
		const rest = parts.slice(1);
		if (isMarketSecondaryParentLabel(primaryCategory)) {
			if (rest.length === 0) return {
				kind: "list",
				categoryCN: primaryCategory,
				categoryKey: MARKET_PRIMARY_CATEGORY_KEYS[primaryCategory],
				page: primaryPage
			};
			const second = rest[0] ?? "";
			if (/^\d+$/.test(second)) {
				const extraNums = rest.slice(1).filter((s) => /^\d+$/.test(s)).map(Number);
				return {
					kind: "start",
					categoryCN: primaryCategory,
					categoryKey: MARKET_PRIMARY_CATEGORY_KEYS[primaryCategory],
					userItemId: Number(second),
					quantity: extraNums[0],
					unitPrice: extraNums[1]
				};
			}
			const secondaryPattern = MARKET_SECONDARY_CATEGORY_LABELS[primaryCategory].join("|");
			const secondaryMatch = second.match(new RegExp(`^(${secondaryPattern})(\\d+)?$`));
			if (!secondaryMatch) return null;
			const secondaryCategory = secondaryMatch[1];
			const page = secondaryMatch[2] ? Math.max(1, Number(secondaryMatch[2])) : 1;
			const categoryKey = getMarketSecondaryCategoryKey(primaryCategory, secondaryCategory);
			if (!categoryKey) return null;
			if (rest.length === 1) return {
				kind: "list",
				categoryCN: `${primaryCategory} ${secondaryCategory}`,
				categoryKey,
				page
			};
			if (rest.length >= 2 && /^\d+$/.test(rest[1])) {
				const extraNums = rest.slice(2).filter((s) => /^\d+$/.test(s)).map(Number);
				return {
					kind: "start",
					categoryCN: `${primaryCategory} ${secondaryCategory}`,
					categoryKey,
					userItemId: Number(rest[1]),
					quantity: extraNums[0],
					unitPrice: extraNums[1]
				};
			}
			return null;
		}
		const categoryKey = MARKET_PRIMARY_CATEGORY_KEYS[primaryCategory];
		if (rest.length === 0) return {
			kind: "list",
			categoryCN: primaryCategory,
			categoryKey,
			page: primaryPage
		};
		if (rest.length >= 1 && /^\d+$/.test(rest[0])) {
			const extraNums = rest.slice(1).filter((s) => /^\d+$/.test(s)).map(Number);
			return {
				kind: "start",
				categoryCN: primaryCategory,
				categoryKey,
				userItemId: Number(rest[0]),
				quantity: extraNums[0],
				unitPrice: extraNums[1]
			};
		}
		return null;
	};
	/**
	* 获取交易上架展示用的物品ID（功法堆叠显示取第一个ID）
	*/
	const getDisplayId = (item) => {
		const itemData = item;
		if (itemData?.ids && Array.isArray(itemData.ids) && itemData.ids.length > 0) return Number(itemData.ids[0]);
		return Number(itemData?.id);
	};
	/**
	* 将统一物品格式化为"交易上架"展示（直接写入md对象）
	*/
	const formatPriceInfo = (item) => {
		if (!item.priceRange) return null;
		const lowestText = typeof item.currentLowestPrice === "number" ? ` | 市场最低:${item.currentLowestPrice}` : "";
		return `   可挂区间:${item.priceRange.min}~${item.priceRange.max}灵晶${lowestText}`;
	};
	const formatUnifiedItemToMD = (md, input) => {
		const { item, displayId, categoryCN } = input;
		const sellCmd = `/交易上架 ${categoryCN} ${displayId}`;
		if (item.subtype === "exp" && item.config?.expValue) {
			md.addText(`${displayId}、【${item.name}】 x${item.quantity}`);
			addOptions(md, [{
				label: "上架",
				command: sellCmd
			}]);
			md.addText(`   经验值: ${item.config.expValue} | 品级: ${item.grade}`);
			const priceInfo = formatPriceInfo(item);
			if (priceInfo) {
				md.addNewline();
				md.addText(priceInfo);
			}
			return;
		}
		md.addText(`${displayId}、【${item.name}】 x${item.quantity}`);
		addOptions(md, [{
			label: "上架",
			command: sellCmd
		}]);
		md.addText(`   品级: ${item.grade} | 境界: ${item.realm}`);
		const priceInfo = formatPriceInfo(item);
		if (priceInfo) {
			md.addNewline();
			md.addText(priceInfo);
		}
	};
	/**
	* 将储物袋物品格式化为"交易上架"展示（含蓝色上架按钮，直接写入md对象）
	*/
	const formatSellItemToMD = (md, input) => {
		const { item, displayId, categoryCN, categoryKey } = input;
		const sellCmd = `/交易上架 ${categoryCN} ${displayId}`;
		if (isUnifiedItemCategory(categoryKey)) {
			formatUnifiedItemToMD(md, {
				item,
				displayId,
				categoryCN
			});
			return;
		}
		if (item?.type === "equipment") {
			const attrs = [];
			if (Number(item.physicalAttack) > 0) attrs.push(`物攻:${item.physicalAttack}`);
			if (Number(item.magicAttack) > 0) attrs.push(`法攻:${item.magicAttack}`);
			if (Number(item.physicalDefense) > 0) attrs.push(`物防:${item.physicalDefense}`);
			if (Number(item.magicDefense) > 0) attrs.push(`法防:${item.magicDefense}`);
			if (Number(item.hp) > 0) attrs.push(`生命:${item.hp}`);
			if (Number(item.physicalAttackPercent) > 0) attrs.push(`物攻%:${+Number(item.physicalAttackPercent).toFixed(2)}%`);
			if (Number(item.magicAttackPercent) > 0) attrs.push(`法攻%:${+Number(item.magicAttackPercent).toFixed(2)}%`);
			if (Number(item.physicalDefensePercent) > 0) attrs.push(`物防%:${+Number(item.physicalDefensePercent).toFixed(2)}%`);
			if (Number(item.magicDefensePercent) > 0) attrs.push(`法防%:${+Number(item.magicDefensePercent).toFixed(2)}%`);
			if (Number(item.hpPercent) > 0) attrs.push(`生命%:${+Number(item.hpPercent).toFixed(2)}%`);
			if (Number(item.speed) > 0) attrs.push(`速度:${item.speed}`);
			if (Number(item.critRate) > 0) attrs.push(`暴击率:${+Number(item.critRate).toFixed(2)}%`);
			if (Number(item.critDamage) > 0) attrs.push(`暴击伤害:${+Number(item.critDamage).toFixed(2)}%`);
			md.addText(`${displayId}、【${item.name}】`);
			addOptions(md, [{
				label: "上架",
				command: sellCmd
			}]);
			md.addText(`   类型: ${item.equipmentType} | 品级: ${item.grade}`);
			if (attrs.length > 0) {
				md.addNewline();
				md.addText(`   属性: ${attrs.join(" | ")}`);
			}
			const priceInfoEq = formatPriceInfo(item);
			if (priceInfoEq) {
				md.addNewline();
				md.addText(priceInfoEq);
			}
			return;
		}
		if (item?.type === "professionTool") {
			md.addText(`${displayId}、【${item.name}】`);
			addOptions(md, [{
				label: "上架",
				command: sellCmd
			}]);
			md.addText(`   类型: ${item.typeName} | 品级: ${item.grade} | 境界: ${item.realm}`);
			const priceInfoPt = formatPriceInfo(item);
			if (priceInfoPt) {
				md.addNewline();
				md.addText(priceInfoPt);
			}
			return;
		}
		if (item?.type === "skillBook") {
			md.addText(`${displayId}、【${item.name}】${Array.isArray(item.ids) ? ` x${item.quantity}` : ""}`);
			addOptions(md, [{
				label: "上架",
				command: sellCmd
			}]);
			if (Array.isArray(item.ids)) {
				md.addText(`   品级: ${item.grade} | 境界: ${item.realm}`);
				const priceInfoSb = formatPriceInfo(item);
				if (priceInfoSb) {
					md.addNewline();
					md.addText(priceInfoSb);
				}
				return;
			}
			const attrs = [];
			if (Number(item.physicalAttack) > 0) attrs.push(`物攻:${item.physicalAttack}`);
			if (Number(item.magicAttack) > 0) attrs.push(`法攻:${item.magicAttack}`);
			if (Number(item.physicalDefense) > 0) attrs.push(`物防:${item.physicalDefense}`);
			if (Number(item.magicDefense) > 0) attrs.push(`法防:${item.magicDefense}`);
			if (Number(item.hp) > 0) attrs.push(`生命:${item.hp}`);
			if (Number(item.physicalAttackPercent) > 0) attrs.push(`物攻%:${+Number(item.physicalAttackPercent).toFixed(2)}%`);
			if (Number(item.magicAttackPercent) > 0) attrs.push(`法攻%:${+Number(item.magicAttackPercent).toFixed(2)}%`);
			if (Number(item.physicalDefensePercent) > 0) attrs.push(`物防%:${+Number(item.physicalDefensePercent).toFixed(2)}%`);
			if (Number(item.magicDefensePercent) > 0) attrs.push(`法防%:${+Number(item.magicDefensePercent).toFixed(2)}%`);
			if (Number(item.hpPercent) > 0) attrs.push(`生命%:${+Number(item.hpPercent).toFixed(2)}%`);
			if (Number(item.speed) > 0) attrs.push(`速度:${item.speed}`);
			if (Number(item.critRate) > 0) attrs.push(`暴击率:${+Number(item.critRate).toFixed(2)}%`);
			if (Number(item.critDamage) > 0) attrs.push(`暴击伤害:${+Number(item.critDamage).toFixed(2)}%`);
			md.addText(`   类型: ${item.skillType} | 品级: ${item.grade} | 境界: ${item.realm}`);
			if (attrs.length > 0) {
				md.addNewline();
				md.addText(`   属性: ${attrs.join(" | ")}`);
			}
			const priceInfoSk = formatPriceInfo(item);
			if (priceInfoSk) {
				md.addNewline();
				md.addText(priceInfoSk);
			}
			return;
		}
		md.addText(`${displayId}、【${item?.name ?? "未知物品"}】`);
		addOptions(md, [{
			label: "上架",
			command: sellCmd
		}]);
		const priceInfoUnknown = formatPriceInfo(item);
		if (priceInfoUnknown) {
			md.addNewline();
			md.addText(priceInfoUnknown);
		}
	};
	const parsed = parseCommand(text);
	const [, next] = useEvent();
	const mode = parsed?.kind ?? "invalid";
	const args = parsed?.kind === "list" ? {
		mode,
		category: parsed.categoryKey.type,
		subtype: parsed.categoryKey.subtype ?? "",
		page: String(parsed.page)
	} : parsed?.kind === "start" ? {
		mode,
		category: parsed.categoryKey.type,
		userItemId: parsed.userItemId,
		firstNumber: parsed.quantity ?? null,
		secondNumber: parsed.unitPrice ?? null
	} : { mode };
	const sendFailure = async (text, footer) => {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "交易上架",
			content: Format.createMarkdown().addText(text),
			footer
		}));
	};
	let loaded;
	try {
		loaded = await runRobotBusiness(e, "market.sell", args, (data) => parseRobotMarketSell(data, mode, parsed && parsed.kind !== "choose" ? parsed.categoryKey.type : ""), next, async (reply) => {
			await sendFailure(reply.text, reply.buttons.length ? reply.buttons.map((button) => ({
				label: button.label,
				command: button.command
			})) : void 0);
		});
	} catch (error) {
		logger.error("交易上架失败:", error);
		await sendFailure(mode === "list" ? "查看上架物品列表失败，请稍后再试" : "市场上架规则加载失败，请稍后再试");
		return;
	}
	if (loaded.handled || !parsed) return;
	if (parsed.kind === "choose") {
		const md = Format.createMarkdown();
		md.addText("请选择要上架的物品分类：");
		md.addNewline();
		md.addNewline();
		md.addText("分类与珍宝楼筛选保持一致，选择后会展示对应可上架物品，并提供“上架”按钮");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "交易上架",
			content: md,
			footer: createSellCategoryButtons()
		}));
		return;
	}
	if (parsed.kind === "list" && loaded.data.mode === "list") {
		try {
			const result = loaded.data.page;
			const title = `交易上架 - ${parsed.categoryCN}`;
			const buttons = createSellPageButtons(parsed.categoryCN);
			const navConfig = result.totalPages > 1 ? {
				current: parsed.page,
				total: result.totalPages,
				count: result.total,
				command: `/交易上架 ${parsed.categoryCN}{page}`
			} : void 0;
			if (result.total === 0) {
				const md = Format.createMarkdown();
				md.addText("该分类暂无可上架物品");
				message.send(FormatGui({
					isPrivate,
					bid,
					title,
					content: md,
					footer: buttons,
					nav: navConfig
				}));
				return;
			}
			if (result.items.length === 0 && result.total > 0) {
				const md = Format.createMarkdown();
				md.addText("页码超出范围");
				md.addNewline();
				md.addText(`当前页: ${parsed.page} | 总页数: ${result.totalPages}`);
				message.send(FormatGui({
					isPrivate,
					bid,
					title,
					content: md,
					footer: createSellPageButtons(parsed.categoryCN),
					nav: result.totalPages > 1 ? {
						current: 1,
						total: result.totalPages,
						count: result.total,
						command: `/交易上架 ${parsed.categoryCN}{page}`
					} : void 0
				}));
				return;
			}
			const md = Format.createMarkdown();
			md.addText("编号为物品ID，点击“上架”后按提示输入数量与单价");
			md.addNewline();
			md.addNewline();
			if (result.items.length === 0) {
				md.addText("当前页暂无可上架物品");
				md.addNewline();
				md.addNewline();
				message.send(FormatGui({
					isPrivate,
					bid,
					title,
					content: md,
					footer: buttons,
					nav: navConfig
				}));
				return;
			}
			result.items.forEach((item, index) => {
				const displayId = getDisplayId(item);
				if (!Number.isFinite(displayId) || displayId <= 0) return;
				formatSellItemToMD(md, {
					item,
					displayId,
					categoryCN: parsed.categoryCN,
					categoryKey: parsed.categoryKey
				});
				if (index < result.items.length - 1) md.addNewline();
			});
			md.addNewline();
			message.send(FormatGui({
				isPrivate,
				bid,
				title,
				content: md,
				footer: buttons,
				nav: navConfig
			}));
		} catch (error) {
			logger.error("查看上架物品列表失败:", error);
			const md = Format.createMarkdown();
			md.addText("查看上架物品列表失败，请稍后再试");
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "交易上架",
				content: md
			}));
		}
		return;
	}
	if (parsed.kind !== "start" || loaded.data.mode !== "start") return;
	const categoryCN = parsed.categoryCN;
	const userItemId = parsed.userItemId;
	const range = loaded.data.range;
	const MIN_UNIT_PRICE = range.minPrice;
	const MAX_UNIT_PRICE = range.maxPrice;
	const REF_PRICE = range.referencePrice;
	const MAX_LISTING_QTY = range.maxListingQuantity;
	const hasReference = range.source !== "fallback" && REF_PRICE > 0;
	const sourceLabel = range.source === "median" ? "市场参考价" : "基础定价";
	const priceRangeHint = !hasReference ? "（暂无可靠参考价，请自行输入单价）" : `（${sourceLabel} ${REF_PRICE} 灵晶）`;
	const isFixedQtyCategory = range.fixedQuantity;
	const providedQty = parsed.quantity;
	const providedPrice = parsed.unitPrice;
	let quantity;
	let unitPriceAmount;
	if (isFixedQtyCategory) {
		quantity = 1;
		unitPriceAmount = providedQty;
	} else {
		quantity = providedQty ?? 0;
		unitPriceAmount = providedPrice;
	}
	const buildUsageHint = () => {
		const md = Format.createMarkdown();
		md.addText(`分类：${categoryCN} | 背包ID：${userItemId}`);
		md.addNewline();
		if (isFixedQtyCategory) {
			md.addText(`请发送：/交易上架 ${categoryCN} ${userItemId} 单价`);
			md.addNewline();
			md.addText(`单价区间：${MIN_UNIT_PRICE}~${MAX_UNIT_PRICE} 灵晶${priceRangeHint}`);
			addOptions(md, [
				{
					label: "最低价",
					command: `/交易上架 ${categoryCN} ${userItemId} ${MIN_UNIT_PRICE}`
				},
				{
					label: "最高价",
					command: `/交易上架 ${categoryCN} ${userItemId} ${MAX_UNIT_PRICE}`
				},
				...hasReference ? [{
					label: "参考价",
					command: `/交易上架 ${categoryCN} ${userItemId} ${REF_PRICE}`
				}] : []
			]);
		} else {
			md.addText(`请发送：/交易上架 ${categoryCN} ${userItemId} 数量 单价`);
			md.addNewline();
			md.addText(`数量：1~${MAX_LISTING_QTY}；单价区间：${MIN_UNIT_PRICE}~${MAX_UNIT_PRICE} 灵晶${priceRangeHint}`);
			addOptions(md, [
				{
					label: "最低价",
					command: `/交易上架 ${categoryCN} ${userItemId} 1 ${MIN_UNIT_PRICE}`
				},
				{
					label: "最高价",
					command: `/交易上架 ${categoryCN} ${userItemId} 1 ${MAX_UNIT_PRICE}`
				},
				...hasReference ? [{
					label: "参考价",
					command: `/交易上架 ${categoryCN} ${userItemId} 1 ${REF_PRICE}`
				}] : []
			]);
		}
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "交易上架",
			content: md
		}));
	};
	if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPriceAmount) || unitPriceAmount <= 0) {
		buildUsageHint();
		return;
	}
	try {
		if (loaded.data.message === void 0) throw new Error("交易上架响应不完整");
		const md = Format.createMarkdown();
		md.addText(loaded.data.message);
		md.addNewline();
		md.addText(`上架ID：${loaded.data.listingId ?? "-"}`);
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "交易上架",
			content: md
		}));
	} catch (error) {
		logger.error("交易上架失败:", error);
		const md = Format.createMarkdown();
		md.addText("交易上架失败，请稍后再试");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "交易上架",
			content: md
		}));
	}
});

//#endregion
export { res_default as default };