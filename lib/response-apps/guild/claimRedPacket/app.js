import { claimBackendGuildRedPacket } from "../../../api/bot/guild-red-packet-mutations.js";

//#region src/response-apps/guild/claimRedPacket/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: { message: (await claimBackendGuildRedPacket(params.bid, params.uid, params.packetId, params.request)).message }
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "领取红包失败，请稍后再试或联系运营。" }
		};
	}
}

//#endregion
export { App as default };