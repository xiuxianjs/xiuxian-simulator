import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/team-preferences.ts
async function setBackendTeamPreference(bid, uid, action, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	if (typeof action.enabled !== "boolean") throw new Error("组队偏好参数无效");
	const context = writeContext(request);
	let data;
	let field;
	switch (action.type) {
		case "AUTO_APPROVE_FRIEND_TEAM":
			field = "autoApproveFriendTeam";
			data = await requestBackend(bid, "patch_players_id_preferences_friend_team_approval", {
				path: { id: uid },
				body: { autoApproveFriendTeam: action.enabled },
				...context
			});
			break;
		case "TEAM_INVITE_ENABLED":
			field = "teamInviteEnabled";
			data = await requestBackend(bid, "patch_players_id_preferences_team_invites", {
				path: { id: uid },
				body: { teamInviteEnabled: action.enabled },
				...context
			});
			break;
		case "TEAM_DUNGEON_NO_MENTAL":
			field = "teamDungeonNoMental";
			data = await requestBackend(bid, "patch_players_id_preferences_team_dungeon_energy", {
				path: { id: uid },
				body: { teamDungeonNoMental: action.enabled },
				...context
			});
			break;
		default: throw new Error("不支持的组队偏好设置");
	}
	if (!data || typeof data !== "object" || Array.isArray(data) || data[field] !== action.enabled) throw new Error("组队偏好配置响应不完整");
	return action;
}

//#endregion
export { setBackendTeamPreference };