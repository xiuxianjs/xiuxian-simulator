import { parseGuildRoleOptions } from "./guild-role-options-queries.js";
import { parseGuildMemberMutation } from "./guild-member-lifecycle.js";

//#region src/api/bot/guild-kick-robot-query.ts
function parseRobotGuildKick(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("踢出成员响应不完整");
	const row = value;
	if (row.outcome === "no_target") return { outcome: "no_target" };
	if (row.outcome === "directory") {
		const data = parseGuildRoleOptions(row.data);
		if (data.membershipStatus !== "joined") throw new Error("踢出成员响应不完整");
		return {
			outcome: "directory",
			members: data.kickableMembers.map((member) => ({
				userId: member.userId,
				roleName: member.roleName ?? "弟子",
				userName: member.userExists ? `${member.name}（${member.realmName ?? "未知"}）` : "未知"
			}))
		};
	}
	if (row.outcome !== "result" || typeof row.message !== "string" || parseGuildMemberMutation(row.receipt).outcome !== "kicked") throw new Error("踢出成员响应不完整");
	return {
		outcome: "result",
		message: row.message
	};
}

//#endregion
export { parseRobotGuildKick };