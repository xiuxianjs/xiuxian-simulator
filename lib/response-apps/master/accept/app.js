import { acceptBackendMaster, listBackendMasterProposals } from "../../../api/bot/master-actions.js";

//#region src/response-apps/master/accept/app.ts
async function App(params) {
	try {
		if (!params.discipleArg) return {
			code: "LIST",
			data: { received: await listBackendMasterProposals(params.bid, params.uid) }
		};
		return {
			code: "OK",
			data: await acceptBackendMaster(params.bid, params.uid, params.discipleArg, params.request, params.repeatCommand)
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: { message: error?.message ?? "同意拜师失败" }
		};
	}
}

//#endregion
export { App as default };