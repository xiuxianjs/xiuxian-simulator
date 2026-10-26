import { sendBackendGuildRedPacket } from "../../../api/bot/guild-red-packet-mutations.js";

//#region src/response-apps/guild/sendRedPacket/app.ts
async function App(params) {
	try {
		return {
			code: "OK",
			data: { message: (await sendBackendGuildRedPacket(params.bid, params.uid, {
				currencyType: params.currencyType,
				packetCount: params.packetCount,
				perAmount: params.perAmount
			}, params.request)).message }
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "发红包失败，请稍后再试。" }
		};
	}
}

//#endregion
export { App as default };