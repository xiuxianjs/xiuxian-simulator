import { FormatGui } from "../../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../../utils/useMessage.js";
import { selects } from "../../../config.js";
import { runRobotBusiness } from "../../../robotBusiness.js";
import { parseRobotMarketMessage } from "../../../../api/bot/market-robot-query.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/shop/playerShop/description/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const m = (e.MessageText ?? "").trim().match(/店铺简介\s+(.+)/);
	const sendFailure = async (text, reply) => {
		const md = Format.createMarkdown().addText(text);
		if (reply?.quote) {
			md.addNewline();
			md.addBlockquote(Format.createMarkdown().addText(reply.quote));
		}
		const footer = reply?.buttons.length ? reply.buttons.map((button) => ({
			label: button.label,
			command: button.command
		})) : [{
			label: "我的小店",
			command: "/我的小店"
		}];
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "店铺简介",
			content: md,
			footer
		}));
	};
	let loaded;
	try {
		loaded = await runRobotBusiness(e, "player-shop.description", { description: m?.[1]?.trim() ? m[1].trim() : null }, parseRobotMarketMessage, next, async (reply) => {
			await sendFailure(reply.text, reply);
		});
	} catch {
		await sendFailure("更新简介失败，请稍后再试");
		return;
	}
	if (loaded.handled) return;
	const md = Format.createMarkdown().addText(loaded.data.message);
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "店铺简介",
		content: md,
		footer: [{
			label: "我的小店",
			command: "/我的小店"
		}]
	}));
});

//#endregion
export { res_default as default };