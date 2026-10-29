import { FormatGui, createQuoteMarkdown } from "../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { parsePKAssetKind, parsePKCommandInteger, parsePKHiding, pkAssetLabels } from "../../api/bot/pk-management.js";
import { selects } from "../config.js";
import { runRobotBusiness } from "../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/pkHiding/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const args = e.MessageText.replace(/^(!|！|\/|#|＃)?隐藏物品\s*/, "").trim().split(/\s+/).filter(Boolean);
	const assetKind = parsePKAssetKind(args[0]);
	const cursor = parsePKCommandInteger(args[1], 0);
	const send = async (text) => {
		await message.send(FormatGui({
			isPrivate: e.isPrivate ?? false,
			bid: e.UserId,
			title: "隐藏物品",
			content: Format.createMarkdown().addText(text)
		}));
	};
	try {
		const result = await runRobotBusiness(e, "pvp.pk-hiding", {
			private: e.isPrivate ?? false,
			assetKind: assetKind ?? "",
			cursor: args.length > 2 ? null : cursor
		}, parsePKHiding, next, (reply) => send(reply.text));
		if (result.handled) return;
		if (!e.isPrivate) {
			await send("隐藏物品管理仅限私聊，请私聊机器人发送 /隐藏物品。");
			return;
		}
		const data = result.data;
		const label = pkAssetLabels[data.assetKind];
		const md = Format.createMarkdown().addText(`已用${data.view.used}/${data.view.capacity}格 · ${label}`);
		for (const row of data.items) {
			const actions = [];
			for (const quantity of [1, 10]) if (quantity <= row.maxHiddenQuantity && quantity !== row.hiddenQuantity) actions.push({
				label: `隐藏至${quantity}份`,
				command: `/设置隐藏 ${label} ${row.assetId} ${quantity}`
			});
			if (row.hiddenQuantity > 0) actions.push({
				label: "取消隐藏",
				command: `/设置隐藏 ${label} ${row.assetId} 0`
			});
			md.addNewline().addBlockquote(createQuoteMarkdown([
				`【${row.assetId}】${row.name}`,
				`库存${row.quantity} · 已隐藏${row.hiddenQuantity} · 争夺暂存${row.heldQuantity}`,
				...row.protectionText ? [row.protectionText] : []
			], actions));
		}
		if (!data.items.length) md.addNewline().addText("本类暂无物品。");
		const footer = Object.entries(pkAssetLabels).map(([key, title]) => ({
			label: title,
			selected: key === data.assetKind,
			command: `/隐藏物品 ${title}`
		}));
		if (data.nextCursor !== void 0) footer.push({
			label: "下一批",
			command: `/隐藏物品 ${label} ${data.nextCursor}`
		});
		await message.send(FormatGui({
			isPrivate: true,
			bid: e.UserId,
			title: "隐藏物品",
			content: md,
			footer
		}));
	} catch {
		await send("读取隐藏物品失败，请稍后重试。");
	}
});

//#endregion
export { res_default as default };