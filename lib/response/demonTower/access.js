import { FormatGui } from "../../utils/messageHelper.js";
import { Format } from "alemonjs";

//#region src/response/demonTower/access.ts
function sendDemonTowerLockedPage(params) {
	const md = Format.createMarkdown();
	const targetBid = typeof params.bid === "string" ? params.bid : params.bid === void 0 ? void 0 : String(params.bid);
	md.addText(`筑基及以上方可开启妖塔，当前境界：${params.realmName}`);
	params.message.send(FormatGui({
		isPrivate: params.isPrivate,
		bid: targetBid,
		title: params.title ?? "妖塔",
		content: md,
		footer: [{
			label: "我的境界",
			command: "/我的境界"
		}]
	}));
}

//#endregion
export { sendDemonTowerLockedPage };