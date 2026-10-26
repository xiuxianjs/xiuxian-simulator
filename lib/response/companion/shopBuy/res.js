import { displayCurrencyText } from "../../../constants/currency.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotCompanionShopPurchase } from "../../../api/bot/companion-shop-robot.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/companion/shopBuy/res.ts
/**
* @deprecated 已由统一商店系统替代，请使用统一购买指令 /购买 &lt;商品编号&gt; [数量]
*
* 道侣商店兑换指令
* - /道侣商店兑换 <商品编号> [数量]           → 提示二次确认
* - /道侣商店兑换 <商品编号> [数量] 确认      → 执行兑换
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const match = (e.MessageText?.trim() ?? "").match(/道侣商店兑换\s+(\d+)(?:\s+(\d+))?(\s+确认)?$/);
	const productId = match ? Number(match[1]) : null;
	const count = match ? match[2] ? Number(match[2]) : 1 : null;
	const confirmed = Boolean(match?.[3]);
	const response = await runRobotBusiness(e, "companion.shop-purchase", {
		mode: match ? "purchase" : "usage",
		productId,
		count,
		confirmed
	}, parseRobotCompanionShopPurchase, next, async (reply) => {
		const md = Format.createMarkdown();
		if (reply.heading) {
			md.addBold(reply.heading);
			md.addNewline();
			reply.text.split("\n").forEach((line, index) => {
				if (index) md.addNewline();
				md.addText(line);
			});
		} else md.addText(reply.text);
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: reply.title,
			content: md
		}));
	});
	if (response.handled) return;
	const result = response.data;
	if (result.mode === "preview") {
		const { name, unitPrice, totalPrice, grantQuantity } = result;
		const md = Format.createMarkdown();
		md.addText(`将购买：${name} ×${grantQuantity}；单价：${unitPrice} 同心值；合计：${totalPrice} 同心值`);
		md.addNewline();
		const confirmCmd = `/道侣商店兑换 ${productId}${(count ?? 1) > 1 ? ` ${count}` : ""} 确认`;
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md,
			footer: [{
				label: "确认兑换",
				command: confirmCmd
			}]
		}));
		return;
	}
	const md = Format.createMarkdown();
	md.addText(`兑换成功：${result.name}，支付${displayCurrencyText(result.paid)}，获得×${result.granted}`);
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "",
		content: md
	}));
});

//#endregion
export { res_default as default };