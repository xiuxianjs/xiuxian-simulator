import { requestGuildWorkflow } from "../../../api/bot/guild-workflow.js";
import { getBackendGuildRoleOptions } from "../../../api/bot/guild-role-options-queries.js";

//#region src/response-apps/guild/appointRole/app.ts
async function App(params) {
	try {
		if (!params.roleName || !params.targetUid && !params.targetBid) return {
			code: "NO_MATCH",
			data: { roleList: (await getBackendGuildRoleOptions(params.bid, params.uid)).roles.map((role) => `${role.name}（ID:${role.id}）`).join("、") }
		};
		const result = await requestGuildWorkflow(params.bid, params.uid, {
			action: "role_appoint",
			roleName: params.roleName,
			targetUserId: params.targetUid ?? void 0,
			targetBid: params.targetBid
		}, params.request, params.repeatCommand);
		if ("roles" in result) return {
			code: "NO_MATCH",
			data: { roleList: result.roles.map((role) => `${role.name}（ID:${role.id}）`).join("、") }
		};
		if (!("message" in result)) return {
			code: "NO_ROLE",
			data: { message: `职位【${params.roleName}】不存在` }
		};
		return {
			code: "OK",
			data: { message: result.message }
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "任命失败" }
		};
	}
}

//#endregion
export { App as default };