import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { parseRobotMarketMessage } from "../../../api/bot/market-robot-query.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/market/cancel/res.ts
/**
* 交易下架指令
* - 指令格式：/交易下架 上架ID
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const m = (e.MessageText ?? "").trim().match(/交易下架\s+(\d+)/);
	const [, next] = useEvent();
	const sendFailure = async (text) => {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "珍宝楼",
			content: Format.createMarkdown().addText(text),
			footer: [{
				label: "我的上架",
				command: "/我的上架"
			}]
		}));
	};
	let loaded;
	try {
		loaded = await runRobotBusiness(e, "market.cancel", { listingId: m ? Number(m[1]) : null }, parseRobotMarketMessage, next, async (reply) => {
			await sendFailure(reply.text);
		});
	} catch (error) {
		await sendFailure(error instanceof Error ? error.message : "交易下架失败，请稍后再试");
		return;
	}
	if (loaded.handled) return;
	const md = Format.createMarkdown();
	const displayMsg = loaded.data.message;
	md.addText(displayMsg);
	md.addNewline();
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "珍宝楼",
		content: md,
		footer: [{
			label: "我的上架",
			command: "/我的上架"
		}, {
			label: "珍宝楼",
			command: "/珍宝楼"
		}]
	}));
});

//#endregion
export { res_default as default };