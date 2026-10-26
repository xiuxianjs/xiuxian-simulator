import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/team-match-start.ts
function parseBackendTeamMatchStart(value) {
	if (!value || typeof value !== "object" || typeof value.targetLabel !== "string") throw new Error("进入匹配响应不完整");
	return { targetLabel: value.targetLabel };
}
async function startBackendMainlineMatch(bid, chapterNumber, stageNumber, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseBackendTeamMatchStart(await requestBackend(bid, "post_teams_match", {
		headers: repeatPresentationHeaders("匹配主线"),
		body: {
			mode: "mainline",
			chapterNumber,
			stageNumber
		},
		...writeContext(request)
	}));
}
async function startBackendDungeonMatch(bid, dungeonId, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseBackendTeamMatchStart(await requestBackend(bid, "post_teams_match", {
		headers: repeatPresentationHeaders("匹配秘境"),
		body: {
			mode: "dungeon",
			targetId: dungeonId
		},
		...writeContext(request)
	}));
}

//#endregion
export { parseBackendTeamMatchStart, startBackendDungeonMatch, startBackendMainlineMatch };