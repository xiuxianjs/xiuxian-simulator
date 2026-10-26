import { MSG_GUILD } from "../../../constants/messages.js";
import { getBackendGuildRoleOptions } from "../../../api/bot/guild-role-options-queries.js";

//#region src/response-apps/guild/changeRole/app.ts
async function App(params) {
	try {
		const result = await getBackendGuildRoleOptions(params.bid, params.uid);
		if (result.membershipStatus !== "joined") return {
			code: "FAIL",
			data: { message: {
				not_joined: MSG_GUILD.NOT_JOINED,
				guild_missing: MSG_GUILD.GUILD_INFO_NOT_FOUND,
				members_missing: MSG_GUILD.MEMBER_NOT_FOUND
			}[result.membershipStatus] }
		};
		const members = result.members.map((member) => ({
			userId: member.userId,
			userName: member.userExists ? `${member.name}（${member.realmName ?? "未知"}）` : "未知",
			roleName: member.roleName ?? "弟子",
			isDeputy: member.isDeputy,
			appointableRoles: member.appointableRoles
		}));
		return {
			code: "OK",
			data: {
				guildName: result.guildName,
				members,
				allRoles: result.roles
			}
		};
	} catch (error) {
		return {
			code: "LOAD_FAILED",
			data: { message: error?.message ?? "获取数据失败" }
		};
	}
}

//#endregion
export { App as default };