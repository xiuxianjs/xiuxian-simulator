import { teamsOperationDefinitions } from "./operations.js";

//#region src/api/domains/teams/index.ts
function createTeamsApi(client) {
	return {
		post_players_id_team_workflow: (...args) => client.request("post_players_id_team_workflow", ...args),
		patch_players_id_team_min_realm: (...args) => client.request("patch_players_id_team_min_realm", ...args),
		get_teams_match_snapshot: (...args) => client.request("get_teams_match_snapshot", ...args),
		get_players_id_team_overview: (...args) => {
			return client.request("get_players_id_team_overview", ...args);
		},
		get_players_id_team_application_records: (...args) => client.request("get_players_id_team_application_records", ...args),
		get_players_id_team_pending_applications: (...args) => client.request("get_players_id_team_pending_applications", ...args),
		get_teams_battle_records: (...args) => {
			return client.request("get_teams_battle_records", ...args);
		},
		get_teams_battle_records_recordId: (...args) => {
			return client.request("get_teams_battle_records_recordId", ...args);
		},
		get_teams: (...args) => {
			return client.request("get_teams", ...args);
		},
		post_teams: (...args) => {
			return client.request("post_teams", ...args);
		},
		get_teams_teamId: (...args) => {
			return client.request("get_teams_teamId", ...args);
		},
		get_teams_mine: (...args) => {
			return client.request("get_teams_mine", ...args);
		},
		delete_teams_mine: (...args) => {
			return client.request("delete_teams_mine", ...args);
		},
		delete_teams_members_memberId: (...args) => {
			return client.request("delete_teams_members_memberId", ...args);
		},
		patch_teams_members_memberId_position: (...args) => {
			return client.request("patch_teams_members_memberId_position", ...args);
		},
		get_teams_position_target: (...args) => {
			return client.request("get_teams_position_target", ...args);
		},
		post_teams_leadership_transfer: (...args) => {
			return client.request("post_teams_leadership_transfer", ...args);
		},
		post_teams_teamId_join: (...args) => {
			return client.request("post_teams_teamId_join", ...args);
		},
		get_teams_teamId_applications: (...args) => {
			return client.request("get_teams_teamId_applications", ...args);
		},
		post_teams_teamId_applications: (...args) => {
			return client.request("post_teams_teamId_applications", ...args);
		},
		get_teams_applications: (...args) => {
			return client.request("get_teams_applications", ...args);
		},
		get_teams_invitations: (...args) => {
			return client.request("get_teams_invitations", ...args);
		},
		post_teams_invitations: (...args) => {
			return client.request("post_teams_invitations", ...args);
		},
		post_teams_invitations_invitationId_accept: (...args) => {
			return client.request("post_teams_invitations_invitationId_accept", ...args);
		},
		delete_teams_invitations_invitationId: (...args) => {
			return client.request("delete_teams_invitations_invitationId", ...args);
		},
		post_teams_invitations_invitationId_reject: (...args) => {
			return client.request("post_teams_invitations_invitationId_reject", ...args);
		},
		delete_teams_applications_applicationId: (...args) => {
			return client.request("delete_teams_applications_applicationId", ...args);
		},
		post_teams_applications_applicationId_approve: (...args) => {
			return client.request("post_teams_applications_applicationId_approve", ...args);
		},
		post_teams_applications_applicationId_reject: (...args) => {
			return client.request("post_teams_applications_applicationId_reject", ...args);
		},
		post_teams_leave: (...args) => {
			return client.request("post_teams_leave", ...args);
		},
		get_teams_match: (...args) => {
			return client.request("get_teams_match", ...args);
		},
		post_teams_match: (...args) => {
			return client.request("post_teams_match", ...args);
		},
		post_teams_match_cancel: (...args) => {
			return client.request("post_teams_match_cancel", ...args);
		}
	};
}

//#endregion
export { createTeamsApi, teamsOperationDefinitions };