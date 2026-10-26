import { MSG_GUILD } from "../../../constants/messages.js";
import { requestGuildWorkflow } from "../../../api/bot/guild-workflow.js";

//#region src/response-apps/guild/resignRole/query.ts
async function Query(params) {
	try {
		const data = await requestGuildWorkflow(params.bid, params.uid, { action: "resignation_options" }, params.request);
		if (data.membershipStatus !== "joined") return {
			code: "FAIL",
			data: { message: data.membershipStatus === "not_joined" ? MSG_GUILD.NOT_JOINED : data.membershipStatus === "guild_missing" ? MSG_GUILD.GUILD_INFO_NOT_FOUND : data.membershipStatus === "members_missing" ? MSG_GUILD.MEMBER_NOT_FOUND : "您不在宗门中" }
		};
		return {
			code: "OK",
			data: {
				members: data.members.map((row) => ({
					...row,
					roleName: row.roleName ?? "弟子",
					userName: row.userExists ? `${row.name}（${row.realmName ?? "未知"}）` : "未知"
				})),
				operatorRole: data.operatorRoleName ?? "弟子",
				operatorUserId: data.operatorUserId,
				isDeputy: data.isDeputy
			}
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "操作失败" }
		};
	}
}

//#endregion
export { Query as default };