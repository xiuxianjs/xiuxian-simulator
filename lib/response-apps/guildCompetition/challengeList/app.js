import { getBackendGuildCompetitionKnockoutCandidates } from "../../../api/bot/competition-knockout-candidates-query.js";

//#region src/response-apps/guildCompetition/challengeList/app.ts
async function App(params) {
	try {
		const data = await getBackendGuildCompetitionKnockoutCandidates(params.bid, params.uid);
		const list = data.candidates.map((item) => ({
			guildId: item.guildId,
			guildName: item.guildName,
			memberSlots: item.slots
		}));
		return {
			code: "OK",
			data: {
				score: data.score,
				remain: data.remaining,
				list
			}
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "获取挑战列表失败" }
		};
	}
}

//#endregion
export { App as default };