import { FormatGui, createQuoteMarkdown } from "../../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../../utils/useMessage.js";
import { selects } from "../../../config.js";
import { runRobotBusiness } from "../../../robotBusiness.js";
import { appendCurrencyCardToMd } from "../../../../utils/currencyCardHelper.js";
import { resolveRobotTargetFromArg } from "../../../../utils/targetUid.js";
import { parseBackendPlayerShopVisit } from "../../../../api/bot/player-shop-visit-query.js";
import { Format, onResponse, useEvent, useMention } from "alemonjs";

//#region src/response/shop/playerShop/visit/res.ts
/** 共享导航 */
const SHOP_HEADER = [
	{
		label: "小店列表",
		command: "/小店"
	},
	{
		label: "我的小店",
		command: "/我的小店"
	},
	{
		label: "珍宝楼",
		command: "/珍宝楼"
	}
];
/**
* 逛店指令（查看他人店铺）
* - 指令格式：/逛店 用户UID/@目标 [页码]
* - 展示该玩家的店铺信息和在售物品
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [mention] = useMention();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const m = (e.MessageText ?? "").trim().match(/逛店\s+(\S+)(?:\s+(\d+))?/);
	const page = m?.[2] ? Math.max(1, Number(m[2])) : 1;
	const sendFailure = async (text) => {
		const md = Format.createMarkdown().addText(text);
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "逛店",
			content: md,
			footer: [{
				label: "小店列表",
				command: "/小店"
			}]
		}));
	};
	try {
		const target = m ? await resolveRobotTargetFromArg(m[1], mention) : null;
		const result = await runRobotBusiness(e, "player-shop.visit", {
			mode: m ? "visit" : "usage",
			target,
			page: String(page)
		}, parseBackendPlayerShopVisit, next, async (reply) => {
			await sendFailure(reply.text);
		});
		if (result.handled) return;
		const { shop, items: listings, pagination, currencies } = result.data;
		if (!shop) throw new Error("店铺响应缺少店铺信息");
		const contentMd = Format.createMarkdown();
		appendCurrencyCardToMd(contentMd, currencies);
		contentMd.addBlockquote(Format.createMarkdown().addText(`店主：${shop.ownerName}(${shop.levelName})`));
		if (shop.description) contentMd.addBlockquote(Format.createMarkdown().addText(`${shop.description}`));
		contentMd.addBlockquote(Format.createMarkdown().addText(`热度：${shop.heatScore},成交：${shop.totalSales}笔`));
		if (listings.length === 0) {
			contentMd.addText("店里暂无物品");
			contentMd.addNewline();
		} else listings.forEach((it) => {
			const canBuy = it.canPurchase;
			const typeLabel = it.itemCategoryLabel;
			const lines = [`【${it.listingId}】【${typeLabel}】 ${it.itemName} ×${it.quantity}`];
			const extra = it.attributeView;
			if (extra?.attrText) lines.push(`属性：${extra.attrText}`);
			lines.push(`单价：${it.unitPriceAmount} ${it.currencyName}`);
			contentMd.addBlockquote(createQuoteMarkdown(lines, canBuy ? [{
				label: "购买",
				command: `/选购 ${it.listingId}`
			}] : []));
		});
		const { currentPage, totalPages } = pagination;
		const footer = [];
		if (currentPage > 1) footer.push({
			label: "上一页",
			command: `/逛店 ${shop.userId} ${currentPage - 1}`
		});
		if (currentPage < totalPages) footer.push({
			label: "下一页",
			command: `/逛店 ${shop.userId} ${currentPage + 1}`
		});
		if (listings.length > 0) contentMd.addText(`第${currentPage}/${totalPages}页`);
		message.send(FormatGui({
			isPrivate,
			bid,
			title: `逛店 - ${shop.shopName}`,
			header: SHOP_HEADER,
			content: contentMd,
			footer
		}));
	} catch {
		const md = Format.createMarkdown();
		md.addText("获取店铺信息失败，请稍后再试");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "逛店",
			content: md,
			header: SHOP_HEADER
		}));
	}
});

//#endregion
export { res_default as default };