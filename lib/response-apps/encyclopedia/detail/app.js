import { BackendAPIError } from "../../../api/bot/client.js";
import { getBackendEncyclopediaDetail } from "../../../api/bot/queries.js";
import "../../../api/index.js";

//#region src/response-apps/encyclopedia/detail/app.ts
const COMMAND_PREFIX = /^(!|！|\/|#|＃)?图鉴详情\s*/;
function parseDetailCommand(messageText) {
	const m = (messageText ?? "").trim().replace(COMMAND_PREFIX, "").trim().match(/^(道具|材料|装备|天工|功法|本命|本命物)\s+(\d+)$/);
	if (!m) return {
		category: null,
		targetId: null
	};
	return {
		category: m[1],
		targetId: Number(m[2])
	};
}
async function getEncyclopediaDetail(category, targetId, bid) {
	const labels = {
		道具: "道具/材料",
		材料: "道具/材料",
		装备: "装备",
		天工: "天工",
		功法: "功法",
		本命: "本命物",
		本命物: "本命物"
	};
	if (!labels[category]) return {
		code: "INVALID",
		data: { message: `未知分类「${category}」` }
	};
	try {
		return {
			code: "OK",
			data: await getBackendEncyclopediaDetail(bid, category, targetId)
		};
	} catch (error) {
		if (error instanceof BackendAPIError && error.status === 404) return {
			code: "NOT_FOUND",
			data: { message: `未找到 ID 为 ${targetId} 的${labels[category]}` }
		};
		throw error;
	}
}

//#endregion
export { getEncyclopediaDetail, parseDetailCommand };