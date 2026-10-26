import { recycleBackendGuildRedPacket } from "../../../api/bot/guild-red-packet-mutations.js";

//#region src/response-apps/guild/recycleRedPacket/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: { message: (await recycleBackendGuildRedPacket(params.bid, params.uid, params.packetId, params.request)).message }
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "回收红包失败，请稍后再试。" }
		};
	}
}

//#endregion
export { App as default };