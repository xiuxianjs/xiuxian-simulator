import { getBackendGuildRedPackets } from "../../../api/bot/guild-red-packets-queries.js";

//#region src/response-apps/guild/redPacketList/app.ts
async function App(params) {
	try {
		const result = await getBackendGuildRedPackets(params.bid, params.uid);
		if (!result.hasGuild) return {
			code: "NO_GUILD",
			data: { message: "你还没有加入宗门。" }
		};
		return {
			code: "OK",
			data: {
				guildName: result.guildName !== null && result.guildName !== "" ? result.guildName : "未知宗门",
				packets: result.packets
			}
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "获取红包列表失败" }
		};
	}
}

//#endregion
export { App as default };