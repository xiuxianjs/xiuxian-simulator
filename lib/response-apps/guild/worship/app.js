import { requestBackend } from "../../../api/bot/client.js";
import { postBackendGuildWorship } from "../../../api/bot/guild-worship-stipend.js";
import { parseGuildWorshipGuide } from "../../../api/bot/guild-activity-robot-query.js";

//#region src/response-apps/guild/worship/app.ts
async function App(params) {
	if (!params.bid) return {
		code: "FAILED",
		data: { message: "操作缺少平台身份" }
	};
	try {
		if (!params.offerName) {
			const data = await requestBackend(params.bid, "get_players_id_guild_worship", { path: { id: params.uid } });
			return {
				code: "GUIDE",
				data: parseGuildWorshipGuide(data)
			};
		}
		const result = await postBackendGuildWorship(params.bid, params.uid, params.offerName, params.request);
		return {
			code: "OK",
			data: {
				message: result.message,
				offerName: result.offer,
				cost: result.cost,
				dailyActivityAdded: result.dailyActivityAdded,
				currentDailyActivity: result.currentDailyActivity,
				contributionAdded: result.contributionAdded,
				offerText: result.offerText,
				dailyActivityText: result.dailyActivityText,
				contributionText: result.contributionText
			}
		};
	} catch (error) {
		const message = error?.message ?? "祭祀祖师失败";
		if (error?.code === "GUILD_NOT_MEMBER") return {
			code: "NO_GUILD",
			data: { message }
		};
		if (error?.code === "GUILD_WORSHIP_ALREADY_DONE") return {
			code: "DONE",
			data: { message }
		};
		return {
			code: "FAILED",
			data: { message }
		};
	}
}

//#endregion
export { App as default };