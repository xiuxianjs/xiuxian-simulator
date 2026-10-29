import { kickBackendGuildMember } from "../../../api/bot/guild-member-lifecycle.js";
import { getBackendGuildRoleOptions } from "../../../api/bot/guild-role-options-queries.js";

//#region src/response-apps/guild/kickMember/app.ts
async function App(params) {
	try {
		if (params.targetUid !== null) return {
			code: "KICK_DONE",
			data: { message: (await kickBackendGuildMember(params.bid, params.uid, params.targetUid, params.request, params.repeatCommand)).message }
		};
		const facts = await getBackendGuildRoleOptions(params.bid, params.uid);
		if (facts.membershipStatus !== "joined") return {
			code: "FAIL",
			data: { message: "您不在宗门中" }
		};
		return {
			code: "OK",
			data: { members: facts.kickableMembers.map((member) => ({
				userId: member.userId,
				roleName: member.roleName ?? "弟子",
				userName: member.userExists ? `${member.name}（${member.realmName ?? "未知"}）` : "未知"
			})) }
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "操作失败" }
		};
	}
}

//#endregion
export { App as default };