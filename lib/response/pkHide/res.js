import { FormatGui, createQuoteMarkdown } from "../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { selects } from "../config.js";
import { runRobotBusiness } from "../robotBusiness.js";
import { parsePKAssetKind, parsePKCommandInteger, parsePKHide, pkAssetLabels } from "../../api/bot/pk-management.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/pkHide/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const args = e.MessageText.replace(/^(!|！|\/|#|＃)?设置隐藏\s*/, "").trim().split(/\s+/).filter(Boolean);
	const assetKind = parsePKAssetKind(args[0]);
	const assetId = parsePKCommandInteger(args[1]);
	const quantity = parsePKCommandInteger(args[2]);
	const send = async (text) => {
		await message.send(FormatGui({
			isPrivate: e.isPrivate ?? false,
			bid: e.UserId,
			title: "设置隐藏",
			content: Format.createMarkdown().addText(text)
		}));
	};
	try {
		const result = await runRobotBusiness(e, "pvp.pk-hide", {
			private: e.isPrivate ?? false,
			assetKind: assetKind ?? "",
			assetId,
			quantity: args.length === 3 ? quantity : null
		}, (raw, uid) => {
			const data = parsePKHide(raw, uid);
			if (data.assetKind !== assetKind || data.assetId !== assetId || data.quantity !== quantity) throw new Error("隐藏设置回执与请求不一致");
			return data;
		}, next, (reply) => send(reply.text));
		if (result.handled) return;
		if (!e.isPrivate) {
			await send("隐藏物品管理仅限私聊，请私聊机器人发送 /隐藏物品。");
			return;
		}
		const data = result.data;
		const label = pkAssetLabels[data.assetKind];
		const md = Format.createMarkdown().addBlockquote(createQuoteMarkdown([`${label}实例 ${data.assetId}：已隐藏${data.quantity}份。`, `当前占用${data.view.used}/${data.view.capacity}格。`], [{
			label: "查看隐藏物品",
			command: `/隐藏物品 ${label}`
		}]));
		await message.send(FormatGui({
			isPrivate: true,
			bid: e.UserId,
			title: "设置隐藏",
			content: md
		}));
	} catch {
		await send("隐藏设置结果暂未确认，请先 /隐藏物品 刷新，不要连续重试。");
	}
});

//#endregion
export { res_default as default };