import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { parseRobotGuildShopExchange } from "../../../api/bot/guild-shop-robot-query.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { createGuildShopExchangeButtons } from "../../../markdown/buttons/guild.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/guild/exchange/res.ts
/**
* 宗门商店兑换
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const match = (e.MessageText || "").match(/宗门商店兑换\s+(\d+)/);
	const sendFailure = async (text) => {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: Format.createMarkdown().addText(text)
		}));
	};
	const loaded = await runRobotBusiness(e, "guild.shop-exchange", { itemIndex: match ? parseInt(match[1], 10) : null }, parseRobotGuildShopExchange, next, async (reply) => {
		await sendFailure(reply.text);
	}).catch(async (error) => {
		await sendFailure(error instanceof Error ? error.message : "兑换失败");
		return { handled: true };
	});
	if (loaded.handled) return;
	if (loaded.data.outcome === "usage") {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: Format.createMarkdown().addText("请先查看当前宗门商店，选择本次列表中的有效商品编号，再决定兑换。"),
			footer: [{
				label: "查看当前商品",
				command: "/宗门商店"
			}]
		}));
		return;
	}
	const result = { data: loaded.data.receipt };
	{
		const md = Format.createMarkdown();
		md.addBold("🎉 兑换成功");
		md.addNewline();
		md.addText(`获得：${result.data.itemName} × ${result.data.quantity}`);
		md.addNewline();
		md.addText(`宗门声望 +${result.data.prestigeGain}`);
		md.addNewline();
		md.addText(`今日剩余声望获取次数：${result.data.remainingDailyCount}/3`);
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md,
			footer: createGuildShopExchangeButtons()
		}));
	}
});

//#endregion
export { res_default as default };