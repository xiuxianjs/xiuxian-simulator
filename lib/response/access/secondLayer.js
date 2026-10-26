import { FormatGui } from "../../utils/messageHelper.js";
import { appendMiddlewareAdvice } from "../middlewareReply.js";
import { realmGrowthTips } from "../businessRecovery.js";
import { Format } from "alemonjs";

//#region src/response/access/secondLayer.ts
function sendSecondLayerLockedPage(params) {
	const md = Format.createMarkdown();
	const targetBid = typeof params.bid === "string" ? params.bid : params.bid === void 0 ? void 0 : String(params.bid);
	md.addText(`练气二层及以上方可开启该功能，当前境界：${params.realmName}`);
	appendMiddlewareAdvice(md, realmGrowthTips());
	params.message.send(FormatGui({
		isPrivate: params.isPrivate,
		bid: targetBid,
		title: params.title,
		content: md,
		footer: [{
			label: "我的境界",
			command: "/我的境界"
		}]
	}));
}

//#endregion
export { sendSecondLayerLockedPage };