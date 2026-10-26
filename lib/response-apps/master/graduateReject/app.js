import { decideBackendGraduation, listBackendGraduationProposals } from "../../../api/bot/master-actions.js";

//#region src/response-apps/master/graduateReject/app.ts
async function App(params) {
	try {
		if (!params.discipleArg) return {
			code: "LIST",
			data: { received: await listBackendGraduationProposals(params.bid, params.uid) }
		};
		return {
			code: "OK",
			data: await decideBackendGraduation(params.bid, params.uid, params.discipleArg, false, params.request, params.repeatCommand)
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: { message: error?.message ?? "拒绝出师失败" }
		};
	}
}

//#endregion
export { App as default };