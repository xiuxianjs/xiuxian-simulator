import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseCompanionGiftCommand } from "../../../api/bot/companion-gift-command.js";
import { Format, logger, onResponse, useEvent, useMention } from "alemonjs";

//#region src/response/companion/gift/res.ts
/**
* 赠送礼物指令
* /赠送                      → 显示支持类别
* /赠送 丹药 筑基丹 [uid|@目标] [数量] → 直接转赠，数量默认1
* /赠送 礼物 <名字> [uid|@目标] → 好友赠礼
* /赠送 <uid|@目标>          → 显示礼物列表供挑选
* /赠送 <礼物名称>           → 显示我的好友供挑选
* /赠送 <uid|@目标> <礼物名称> → 直接赠送
*/
const directGiftCategories = [
	"丹药",
	"道具",
	"图纸",
	"丹方",
	"种子",
	"道侣道具"
];
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [mention] = useMention();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const text = e.MessageText?.trim() ?? "";
	const match = text.match(/^[!！/#＃]?赠送(?:\s+(\S+))?(?:\s+(.+))?\s*$/);
	if (!match) return;
	const mentioned = await mention.findOne();
	const targetBid = mentioned?.count && mentioned.data?.UserId ? mentioned.data.UserId : void 0;
	const parts = text.replace(/^[!！/#＃]?赠送/, "").trim().split(/\s+/).filter(Boolean);
	const category = directGiftCategories.includes(parts[0]) || parts[0] === "礼物" ? parts[0] : void 0;
	const showTypes = parts.length === 0 || Boolean(category && parts.length === 1);
	let firstParam = match[1]?.trim();
	let secondParam = match[2]?.trim();
	let quantity;
	if (category && !showTypes) {
		const giftName = parts[1];
		const hasTarget = parts.length >= 3 || Boolean(targetBid);
		const targetArg = targetBid ? "@道友" : parts[2];
		const quantityText = targetBid && parts[2] && !parts[2].startsWith("@") ? parts[2] : parts[3];
		quantity = quantityText === void 0 ? 1 : Number(quantityText);
		if (parts.length > 4 || targetBid && parts.length === 4 && !parts[2].startsWith("@") || !Number.isSafeInteger(quantity) || quantity < 1 || quantityText !== void 0 && !/^\d+$/.test(quantityText)) {
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: "赠送",
				content: Format.createMarkdown().addText("数量须为正整数。用法：/赠送 类别 名字 UID或@道友 [数量]")
			}));
			return;
		}
		firstParam = hasTarget ? targetArg : giftName;
		secondParam = hasTarget ? giftName : void 0;
	}
	const response = await runRobotBusiness(e, "companion.gift", {
		firstParam,
		secondParam,
		targetBid,
		category: showTypes ? void 0 : category,
		view: showTypes ? "types" : void 0,
		quantity
	}, parseCompanionGiftCommand, next, async (reply) => {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: reply.title,
			content: Format.createMarkdown().addText(reply.text),
			footer: reply.buttons.length ? reply.buttons : void 0
		}));
	});
	if (response.handled) return;
	if (response.data.mode === "TYPES") {
		const md = Format.createMarkdown();
		for (const [label, detail, example] of [
			[
				"丹药",
				"次品筑基丹、筑基丹",
				"筑基丹"
			],
			[
				"道具",
				"更名卡、改性卡",
				"更名卡"
			],
			[
				"图纸",
				"所有锻造图纸",
				"玄铁冠锻造图纸"
			],
			[
				"丹方",
				"背包内实际持有的丹方物品",
				""
			],
			[
				"种子",
				"所有种子",
				"聚灵草种"
			],
			[
				"道侣道具",
				"礼物、誓约道具和纪念品原物",
				"白首盟书"
			]
		]) md.addBlockquote(createQuoteMarkdown([`${label}：${detail}`], example ? [{
			label: "赠送",
			command: `/赠送 ${label} ${example}`
		}] : []));
		md.addText("用法：/赠送 类别 名字 UID或@道友 [数量]");
		md.addText("数量默认1，无需同宗门或好友关系。");
		md.addText("丹方知识不复制；道侣道具转赠不自动触发使用效果。");
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "赠送 · 支持类别",
			content: md
		}));
		return;
	}
	const command = response.data;
	const firstParamUid = command.targetId;
	const isFirstParamUid = command.mode === "OPTIONS";
	if (firstParam && secondParam) {
		const targetUid = command.targetId;
		const giftName = command.giftName;
		if (!targetUid || !giftName) {
			const errMd = Format.createMarkdown();
			errMd.addText("格式错误，请使用：/赠送 <UID|@目标> <礼物名称>");
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "赠送礼物",
				content: errMd
			}));
			return;
		}
		const result = command.mutationError || !command.mutation ? {
			code: "GIFT_FAIL",
			data: { message: command.mutationError ?? "赠送失败，请稍后再试" }
		} : {
			code: "GIFT_OK",
			data: command.mutation
		};
		if (result.code === "GIFT_OK") {
			const md = Format.createMarkdown();
			md.addText(result.data.message);
			if (result.data.tongxinGained && result.data.tongxinGained > 0) {
				md.addNewline();
				md.addText(`同心值 +${result.data.tongxinGained}`);
			}
			md.addNewline();
			md.addBlockquote(createQuoteMarkdown([result.data.reply]));
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "赠送礼物",
				content: md
			}));
		} else {
			const errMd = Format.createMarkdown();
			const repeatMsg = result.data.message;
			errMd.addText(repeatMsg);
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "赠送礼物",
				content: errMd
			}));
		}
		return;
	}
	if (firstParam && isFirstParamUid) {
		if (!firstParamUid) return;
		try {
			if (command.queryError) throw new Error(command.queryError);
			const giftListResult = command.options;
			if (!giftListResult.targetFound) {
				const errMd = Format.createMarkdown();
				errMd.addText("未找到该用户");
				message.send(FormatGui({
					isPrivate,
					bid,
					title: "赠送礼物",
					content: errMd
				}));
				return;
			}
			const d = giftListResult;
			const contentMd = Format.createMarkdown();
			contentMd.addBlockquote(Format.createMarkdown().addText(`赠送给：${d.targetName ?? d.targetId}`));
			contentMd.addBlockquote(createQuoteMarkdown(["可向任意道友赠送筑基丹×1"], [{
				label: "赠送筑基丹",
				command: `/赠送 丹药 筑基丹 ${d.targetId}`
			}]));
			if (d.gifts.length === 0) {
				contentMd.addText("── 可赠送的礼物 ──");
				contentMd.addNewline();
				contentMd.addText("储物袋中没有礼物");
				contentMd.addNewline();
				contentMd.addText("💡 可在万宝楼购买礼物");
			} else for (const gift of d.gifts) {
				let limitText;
				if (gift.isPremium) {
					const dailyRemaining = d.dailyPremiumGiftLimit - d.dailyPremiumGiftUsed;
					limitText = dailyRemaining > 0 ? `今日:${dailyRemaining}/${d.dailyPremiumGiftLimit}` : "今日已达上限";
				} else limitText = d.weeklyIntimacyUsed < d.weeklyIntimacyLimit ? `周灵契:${d.weeklyIntimacyUsed}/${d.weeklyIntimacyLimit}` : "周灵契已达上限";
				contentMd.addBlockquote(createQuoteMarkdown([
					gift.name,
					`${limitText} 数量:${gift.quantity}`,
					`灵契+${gift.intimacy}`
				], [{
					label: "赠送",
					command: `/赠送 礼物 ${gift.name} ${d.targetId}`
				}]));
			}
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "赠送礼物",
				header: [
					{
						label: "返回",
						command: "/赠送"
					},
					{
						label: "万宝楼",
						command: "/商店 万宝楼"
					},
					{
						label: "记录",
						command: "/赠礼记录"
					}
				],
				content: contentMd
			}));
		} catch (_error) {
			logger.error("赠送礼物列表加载失败:", _error);
			const errMd = Format.createMarkdown();
			errMd.addText("❌ 加载失败，请稍后重试");
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "赠送礼物",
				content: errMd
			}));
		}
		return;
	}
	if (firstParam && !isFirstParamUid) {
		const giftName = firstParam;
		const targetLabel = giftName === "筑基丹" ? "道友" : "好友";
		if (command.queryError) throw new Error(command.queryError);
		const friendResult = command.targets;
		const directCategory = friendResult.directCategory;
		if (!friendResult.giftExists) {
			const errMd = Format.createMarkdown();
			errMd.addText(`未找到礼物「${giftName}」`);
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "赠送礼物",
				content: errMd
			}));
			return;
		}
		try {
			if (friendResult.friends.length === 0) {
				const contentMd = Format.createMarkdown();
				if (directCategory) {
					contentMd.addBlockquote(createQuoteMarkdown([`可向任意道友赠送「${giftName}」`, "数量默认1，无需同宗门或好友关系。"]));
					contentMd.addText(`用法：/赠送 ${directCategory} ${giftName} UID或@道友 [数量]`);
					if (directCategory === "丹方") contentMd.addText("仅转赠背包中的丹方物品，不复制已领悟的丹方知识。");
					if (directCategory === "道侣道具") contentMd.addText("转赠原物，不自动结契或增加灵契、同心值。");
				} else contentMd.addBlockquote(Format.createMarkdown().addText(`暂无${targetLabel}可赠送礼物`));
				message.send(FormatGui({
					isPrivate,
					bid,
					title: `赠送「${giftName}」`,
					content: contentMd
				}));
				return;
			}
			const contentMd = Format.createMarkdown();
			contentMd.addBlockquote(Format.createMarkdown().addText(`选择要赠送「${giftName}」的${targetLabel}`));
			if (giftName === "筑基丹") contentMd.addText("默认赠送1枚；可用 /赠送 丹药 筑基丹 UID 数量，直接存入对方储物袋。");
			for (const friend of friendResult.friends) {
				const relationText = friend.isCompanion ? "【道侣】" : "";
				contentMd.addBlockquote(createQuoteMarkdown([`${relationText}${friend.friendName}`], [{
					label: "赠送",
					command: `/赠送 ${giftName === "筑基丹" ? "丹药" : "礼物"} ${giftName} ${friend.friendId}`
				}]));
			}
			message.send(FormatGui({
				isPrivate,
				bid,
				title: `赠送「${giftName}」`,
				header: [{
					label: "返回",
					command: "/赠送"
				}, {
					label: "记录",
					command: "/赠礼记录"
				}],
				content: contentMd
			}));
		} catch (_error) {
			logger.error("我的好友加载失败:", _error);
			const errMd = Format.createMarkdown();
			errMd.addText("❌ 加载失败，请稍后重试");
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "赠送礼物",
				content: errMd
			}));
		}
		return;
	}
	try {
		if (command.queryError) throw new Error(command.queryError);
		const friendResult = command.targets;
		if (friendResult.friends.length === 0) {
			const contentMd = Format.createMarkdown();
			contentMd.addBlockquote(Format.createMarkdown().addText("暂无好友可赠送礼物"));
			contentMd.addText("💡 先添加好友后再来赠送吧");
			contentMd.addBlockquote(createQuoteMarkdown(["支持向任意道友赠送筑基丹"], [{
				label: "赠送筑基丹",
				command: "/赠送 丹药 筑基丹"
			}]));
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "赠送礼物",
				header: [{
					label: "返回",
					command: "/我的好友"
				}, {
					label: "记录",
					command: "/赠礼记录"
				}],
				content: contentMd
			}));
			return;
		}
		const contentMd = Format.createMarkdown();
		contentMd.addBlockquote(createQuoteMarkdown(["支持向任意道友赠送筑基丹"], [{
			label: "赠送筑基丹",
			command: "/赠送 丹药 筑基丹"
		}]));
		contentMd.addBlockquote(Format.createMarkdown().addText("选择要赠送的好友"));
		for (const friend of friendResult.friends) {
			const relationText = friend.isCompanion ? "【道侣】" : "";
			contentMd.addBlockquote(createQuoteMarkdown([`${relationText}${friend.friendName}`], [{
				label: "选择",
				command: `/赠送 ${friend.friendId}`
			}]));
		}
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "赠送礼物 - 选择好友",
			header: [{
				label: "返回",
				command: "/我的好友"
			}, {
				label: "记录",
				command: "/赠礼记录"
			}],
			content: contentMd
		}));
	} catch (_error) {
		logger.error("我的好友加载失败:", _error);
		const errMd = Format.createMarkdown();
		errMd.addText("❌ 加载失败，请稍后重试");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "赠送礼物",
			content: errMd
		}));
	}
});

//#endregion
export { res_default as default };