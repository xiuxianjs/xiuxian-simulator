import { mentorshipOperationDefinitions } from "./operations.js";

//#region src/api/domains/mentorship/index.ts
function createMentorshipApi(client) {
	return {
		post_players_id_master_proposal_decision: (...args) => client.request("post_players_id_master_proposal_decision", ...args),
		get_players_id_master_lineage: (...args) => {
			return client.request("get_players_id_master_lineage", ...args);
		},
		post_players_id_master_apply: (...args) => {
			return client.request("post_players_id_master_apply", ...args);
		},
		get_players_id_master_proposals: (...args) => {
			return client.request("get_players_id_master_proposals", ...args);
		},
		post_players_id_master_proposals_proposalId_accept: (...args) => {
			return client.request("post_players_id_master_proposals_proposalId_accept", ...args);
		},
		post_players_id_master_teach_discipleId: (...args) => {
			return client.request("post_players_id_master_teach_discipleId", ...args);
		},
		post_players_id_master_bless_discipleId: (...args) => {
			return client.request("post_players_id_master_bless_discipleId", ...args);
		},
		post_players_id_master_gift_discipleId: (...args) => {
			return client.request("post_players_id_master_gift_discipleId", ...args);
		},
		post_players_id_master_graduation: (...args) => {
			return client.request("post_players_id_master_graduation", ...args);
		},
		get_players_id_master_graduation_proposals: (...args) => {
			return client.request("get_players_id_master_graduation_proposals", ...args);
		},
		post_players_id_master_graduation_proposals_proposalId_accept: (...args) => {
			return client.request("post_players_id_master_graduation_proposals_proposalId_accept", ...args);
		},
		post_players_id_master_graduation_proposals_proposalId_reject: (...args) => {
			return client.request("post_players_id_master_graduation_proposals_proposalId_reject", ...args);
		},
		post_players_id_master_rebel: (...args) => {
			return client.request("post_players_id_master_rebel", ...args);
		},
		post_players_id_master_disciples_discipleId_expel: (...args) => {
			return client.request("post_players_id_master_disciples_discipleId_expel", ...args);
		},
		get_players_id_master_info: (...args) => {
			return client.request("get_players_id_master_info", ...args);
		},
		post_players_id_master_title_claim: (...args) => {
			return client.request("post_players_id_master_title_claim", ...args);
		},
		get_players_id_master_ranking: (...args) => {
			return client.request("get_players_id_master_ranking", ...args);
		}
	};
}

//#endregion
export { createMentorshipApi, mentorshipOperationDefinitions };