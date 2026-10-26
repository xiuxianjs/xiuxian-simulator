import { appendMiddlewareAdvice, appendMiddlewareBlocks } from "../middlewareReply.js";
import { leaderboardRecoveryTips } from "../leaderboardRecovery.js";
import { Format } from "alemonjs";

//#region src/response/leaderboard/view.ts
function rankingFeedbackMarkdown(reply, md = Format.createMarkdown()) {
	md.addText(reply.text);
	if (reply.quote) md.addBlockquote(Format.createMarkdown().addText(reply.quote));
	appendMiddlewareBlocks(md, reply.blocks?.filter((block) => block.text !== reply.text || block.inlineButtons?.length));
	appendMiddlewareAdvice(md, reply.advice);
	return md;
}
function rankingFailureMarkdown(operation, text, md = Format.createMarkdown()) {
	md.addText(text);
	appendMiddlewareAdvice(md, leaderboardRecoveryTips(operation, text));
	return md;
}
const RANKING_LIMIT = 50;
const RANKING_PAGE_SIZE = 10;
function rankingView(text) {
	const token = text.trim().match(/(?:排行榜|圣人榜)\s*(\d+|榜首|附近|我的)?$/)?.[1] ?? "";
	const requested = /^\d+$/.test(token) ? Number(token) : 1;
	return { page: Number.isSafeInteger(requested) ? Math.min(5, Math.max(1, requested)) : 1 };
}
function rankingSelfText(self) {
	return self && Number.isInteger(self.rank) && self.rank >= 1 && self.rank <= 50 ? `我的排名：第${self.rank}名` : null;
}

//#endregion
export { RANKING_LIMIT, RANKING_PAGE_SIZE, rankingFailureMarkdown, rankingFeedbackMarkdown, rankingSelfText, rankingView };