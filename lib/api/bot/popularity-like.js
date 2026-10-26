import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/popularity-like.ts
async function likeBackendPopularity(bid, uid, targetUserId, boardType, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseBackendPopularityLike(await requestBackend(bid, "post_players_id_popularity_likes", {
		headers: repeatPresentationHeaders(repeatCommand),
		path: { id: uid },
		body: {
			targetUserId,
			boardType
		},
		...writeContext(request)
	}));
}
function parseBackendPopularityLike(data) {
	if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("人气点赞响应不完整");
	const row = data;
	if (typeof row.message !== "string" || typeof row.remainingLikes !== "number" || !Number.isSafeInteger(row.remainingLikes) || row.remainingLikes < 0 || typeof row.currentPopularity !== "number" || !Number.isSafeInteger(row.currentPopularity) || row.currentPopularity < 0 || typeof row.boardType !== "string" || typeof row.boardLabel !== "string") throw new Error("人气点赞响应不完整");
	return data;
}
function parseRobotPopularityLike(data) {
	if (!data || typeof data !== "object" || !("outcome" in data)) throw new Error("人气点赞响应不完整");
	if (data.outcome === "ignored") return { outcome: "ignored" };
	if (data.outcome !== "liked") throw new Error("人气点赞响应不完整");
	return {
		outcome: "liked",
		...parseBackendPopularityLike(data)
	};
}

//#endregion
export { likeBackendPopularity, parseBackendPopularityLike, parseRobotPopularityLike };