import { getBackendFriendAccess } from "../../api/bot/queries.js";
import { FormatGui } from "../../utils/messageHelper.js";
import { Format } from "alemonjs";

//#region src/response/spar/access.ts
async function canAccessSpar(uid, bid) {
	if (!bid || typeof uid !== "number" || !Number.isSafeInteger(uid) || uid <= 0) return {
		ok: false,
		realmName: "未知"
	};
	const [, sparAccess] = await getBackendFriendAccess(bid, uid);
	return {
		ok: sparAccess.ok,
		realmName: sparAccess.realmName
	};
}
function sendSparLockedPage(params) {
	const md = Format.createMarkdown();
	const targetBid = typeof params.bid === "string" ? params.bid : params.bid === void 0 ? void 0 : String(params.bid);
	md.addText(`筑基初期及以上方可发起比试，当前境界：${params.realmName}`);
	params.message.send(FormatGui({
		isPrivate: params.isPrivate,
		bid: targetBid,
		title: params.title ?? "比试",
		content: md,
		footer: [{
			label: "我的境界",
			command: "/我的境界"
		}]
	}));
}

//#endregion
export { canAccessSpar, sendSparLockedPage };