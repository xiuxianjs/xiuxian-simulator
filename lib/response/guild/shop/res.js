import { parseRobotGuildShop } from "../../../api/bot/guild-shop-robot-query.js";
import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { buildGuildShopDisplay } from "./view.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/guild/shop/res.ts
/**
* 宗门商店
* - /宗门商店      ：查看商店
* - /宗门商店 刷新 ：刷新后以相同排版展示
*/
/** 宗门商店导航 */
const SHOP_HEADER = [{
	label: "宗门",
	command: "/我的宗门"
}, {
	label: "刷新",
	command: "/宗门商店 刷新"
}];
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const rawText = (e.MessageText ?? "").trim();
	const isRefresh = /^(?:[!！/#＃])?宗门商店\s+刷新$/.test(rawText);
	const sendFailure = async (text) => {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "宗门商店",
			header: SHOP_HEADER,
			content: Format.createMarkdown().addText(text)
		}));
	};
	const loaded = await runRobotBusiness(e, isRefresh ? "guild.shop-refresh" : "guild.shop", {}, (value, uid) => parseRobotGuildShop(value, isRefresh, uid), next, async (reply) => {
		await sendFailure(reply.text);
	}).catch(async (error) => {
		await sendFailure(error instanceof Error ? error.message : isRefresh ? "刷新商店失败" : "获取商店失败");
		return { handled: true };
	});
	if (loaded.handled) return;
	const refreshReceipt = loaded.data.receipt;
	const { contributionPoints, shopItems, autoRefreshEnabled, autoRefreshHours, autoRefreshStatusText, refreshDailyLimit, isLeader } = buildGuildShopDisplay(loaded.data.page);
	const contentMd = Format.createMarkdown();
	if (refreshReceipt) {
		contentMd.addBold(`✨ 商店刷新成功，消耗${refreshReceipt.cost}宗门灵石，剩余刷新次数：${refreshReceipt.remaining}/${refreshDailyLimit}`);
		contentMd.addNewline();
		contentMd.addNewline();
	}
	contentMd.addBlockquote(Format.createMarkdown().addText(`贡献点：${contributionPoints}`));
	const autoRefreshButtons = [];
	if (isLeader) {
		if (autoRefreshEnabled) autoRefreshButtons.push({
			label: `自动刷新${autoRefreshHours.join("/")}`,
			command: "/宗门商店自动刷新"
		}, {
			label: "关闭自动刷新",
			command: "/宗门商店自动刷新 关闭"
		});
		else autoRefreshButtons.push({
			label: "自动刷新",
			command: "/宗门商店自动刷新"
		});
	}
	contentMd.addBlockquote(createQuoteMarkdown([`自动刷新：${autoRefreshStatusText}`], shopItems.length > 0 ? autoRefreshButtons : []));
	if (shopItems.length === 0) {
		contentMd.addText("暂无商品");
		contentMd.addNewline();
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "宗门商店",
			header: SHOP_HEADER,
			content: contentMd
		}));
		return;
	}
	shopItems.forEach((item) => {
		if (item.locked) {
			contentMd.addBlockquote(createQuoteMarkdown([`【${item.index}】${item.slotName}`, item.statusText], []));
			return;
		}
		const slotTitle = item.slotName ? `【${item.index}·${item.slotName}】` : `【${item.index}】`;
		const typeTag = item.categoryLabel ? `【${item.categoryLabel}】` : "";
		const itemName = typeof item?.itemName === "string" && item.itemName.trim() ? item.itemName : "未知商品";
		const quantity = Number.isFinite(Number(item?.quantity)) ? Number(item.quantity) : 0;
		const price = Number.isFinite(Number(item?.price)) ? Number(item.price) : 0;
		contentMd.addBlockquote(createQuoteMarkdown([`${slotTitle}${typeTag} ${itemName} ×${quantity}${item.canExchange ? "" : `（${item.statusText}）`}`, `价格：${price} 贡献点`], item.canExchange ? [{
			label: "兑换",
			command: `/宗门商店兑换 ${item.index}`
		}] : []));
	});
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "宗门商店",
		header: SHOP_HEADER,
		content: contentMd
	}));
});

//#endregion
export { res_default as default };