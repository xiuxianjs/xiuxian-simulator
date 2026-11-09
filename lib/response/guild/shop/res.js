import { formatNumber } from "../../../utils/formatHelper.js";
import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { confirmBubble, resultBubble } from "../../presentation/presets.js";
import { exactInteger } from "../../../api/core/exact-json.js";
import "../../presentation/index.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { guildShopRefreshReference, parseRobotGuildShop } from "../../../api/bot/guild-shop-robot-query.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { buildGuildShopDisplay } from "./view.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/guild/shop/res.ts
/**
* 宗门商店
* - /宗门商店      ：查看商店
* - /宗门商店 刷新 ：预览本次刷新费用
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
	const refresh = (e.MessageText ?? "").trim().match(/^(?:[!！/#＃])?宗门商店\s+刷新(?:\s+(.+))?$/);
	const reference = refresh?.[1];
	const isRefresh = refresh !== null;
	const sendFailure = async (text) => {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "宗门商店",
			header: SHOP_HEADER,
			content: Format.createMarkdown().addText(text)
		}));
	};
	if (reference && !guildShopRefreshReference.test(reference)) {
		await sendFailure("刷新确认编号无效，请重新发送 /宗门商店 刷新");
		return;
	}
	const loaded = await runRobotBusiness(e, isRefresh ? "guild.shop-refresh" : "guild.shop", isRefresh ? reference ? { reference } : { preview: true } : {}, (value, uid) => parseRobotGuildShop(value, isRefresh, uid), next, async (reply) => {
		await sendFailure(reply.text);
	}).catch(async (error) => {
		await sendFailure(error instanceof Error ? error.message : isRefresh ? "刷新商店失败" : "获取商店失败");
		return { handled: true };
	});
	if (loaded.handled) return;
	const data = loaded.data;
	if (data.outcome === "preview") {
		await message.send(confirmBubble({
			isPrivate,
			bid,
			title: "宗门商店 · 确认刷新",
			target: ["结果：重新上架商品，重置全体成员兑换记录", "有效期：60 秒"],
			costs: [`消耗：${formatNumber(data.cost)} 宗门灵石`],
			actions: [{
				label: "确认刷新",
				command: `/宗门商店 刷新 ${data.reference}`
			}],
			back: {
				label: "取消并返回商店",
				command: "/宗门商店"
			}
		}));
		return;
	}
	if (data.outcome === "receipt") {
		await message.send(resultBubble({
			isPrivate,
			bid,
			title: "宗门商店",
			status: "done",
			lines: [
				"结果：刷新成功，已记入宗门日志",
				`消耗：${formatNumber(data.receipt.cost)} 宗门灵石`,
				`今日剩余：${data.receipt.remaining} 次`
			],
			footer: [{
				label: "返回商店",
				command: "/宗门商店"
			}]
		}));
		return;
	}
	const refreshReceipt = data.receipt;
	const { contributionPoints, shopItems, autoRefreshEnabled, autoRefreshHours, autoRefreshStatusText, refreshDailyLimit, isLeader } = buildGuildShopDisplay(data.page);
	const contentMd = Format.createMarkdown();
	if (refreshReceipt) {
		contentMd.addBold("结果：刷新成功，已记入宗门日志");
		contentMd.addNewline();
		contentMd.addText(`消耗：${formatNumber(refreshReceipt.cost)} 宗门灵石 · 今日剩余：${refreshReceipt.remaining}/${refreshDailyLimit} 次`);
		contentMd.addNewline();
		contentMd.addNewline();
	}
	contentMd.addBlockquote(Format.createMarkdown().addText(`贡献点：${formatNumber(contributionPoints)}`));
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
		const quantity = exactInteger(item.quantity ?? 0);
		const price = exactInteger(item.price ?? 0);
		contentMd.addBlockquote(createQuoteMarkdown([`${slotTitle}${typeTag} ${itemName} ×${formatNumber(quantity)}${item.canExchange ? "" : `（${item.statusText}）`}`, `价格：${formatNumber(price)} 贡献点`], item.canExchange ? [{
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