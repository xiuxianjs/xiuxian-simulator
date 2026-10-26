import { equipmentOperationDefinitions } from "./operations.js";

//#region src/api/domains/equipment/index.ts
function createEquipmentApi(client) {
	return {
		post_players_id_soul_artifacts_unequip_command: (...args) => client.request("post_players_id_soul_artifacts_unequip_command", ...args),
		post_players_id_soul_artifacts_refine_command: (...args) => client.request("post_players_id_soul_artifacts_refine_command", ...args),
		post_players_id_skill_books_skillBookId_wudao_command: (...args) => client.request("post_players_id_skill_books_skillBookId_wudao_command", ...args),
		post_players_id_skill_books_batch_learn_current: (...args) => client.request("post_players_id_skill_books_batch_learn_current", ...args),
		get_players_id_skill_books_batch_decompose_query: (...args) => client.request("get_players_id_skill_books_batch_decompose_query", ...args),
		get_players_id_equipment_batch_decompose_query: (...args) => client.request("get_players_id_equipment_batch_decompose_query", ...args),
		post_players_id_soul_artifacts_wash: (...args) => {
			return client.request("post_players_id_soul_artifacts_wash", ...args);
		},
		post_players_id_soul_artifacts_wash_confirm: (...args) => {
			return client.request("post_players_id_soul_artifacts_wash_confirm", ...args);
		},
		post_players_id_soul_artifacts_wash_cancel: (...args) => {
			return client.request("post_players_id_soul_artifacts_wash_cancel", ...args);
		},
		put_players_id_skill_books_learned_bookId_visibility: (...args) => client.request("put_players_id_skill_books_learned_bookId_visibility", ...args),
		get_players_id_soul_artifacts_overview: (...args) => {
			return client.request("get_players_id_soul_artifacts_overview", ...args);
		},
		get_players_id_skill_books_learned_bookId: (...args) => {
			return client.request("get_players_id_skill_books_learned_bookId", ...args);
		},
		get_players_id_equipment_detail: (...args) => {
			return client.request("get_players_id_equipment_detail", ...args);
		},
		get_players_id_equipment_equipped: (...args) => {
			return client.request("get_players_id_equipment_equipped", ...args);
		},
		get_players_id_skill_books_learned: (...args) => {
			return client.request("get_players_id_skill_books_learned", ...args);
		},
		get_players_id_equipment_bag: (...args) => client.request("get_players_id_equipment_bag", ...args),
		get_players_id_skill_books_bag: (...args) => client.request("get_players_id_skill_books_bag", ...args),
		get_players_id_soul_artifacts_bag: (...args) => client.request("get_players_id_soul_artifacts_bag", ...args),
		get_players_id_equipment: (...args) => {
			return client.request("get_players_id_equipment", ...args);
		},
		post_players_id_equipment_equip: (...args) => {
			return client.request("post_players_id_equipment_equip", ...args);
		},
		post_players_id_equipment_unequip: (...args) => {
			return client.request("post_players_id_equipment_unequip", ...args);
		},
		post_players_id_equipment_lock: (...args) => {
			return client.request("post_players_id_equipment_lock", ...args);
		},
		post_players_id_equipment_unlock: (...args) => {
			return client.request("post_players_id_equipment_unlock", ...args);
		},
		post_players_id_equipment_decompose: (...args) => {
			return client.request("post_players_id_equipment_decompose", ...args);
		},
		get_players_id_equipment_decompose_preview: (...args) => {
			return client.request("get_players_id_equipment_decompose_preview", ...args);
		},
		post_players_id_equipment_decompose_batch: (...args) => {
			return client.request("post_players_id_equipment_decompose_batch", ...args);
		},
		get_players_id_titles: (...args) => {
			return client.request("get_players_id_titles", ...args);
		},
		get_players_id_titles_overview: (...args) => {
			return client.request("get_players_id_titles_overview", ...args);
		},
		post_players_id_titles_titleId_activate: (...args) => {
			return client.request("post_players_id_titles_titleId_activate", ...args);
		},
		post_players_id_titles_deactivate: (...args) => {
			return client.request("post_players_id_titles_deactivate", ...args);
		},
		get_players_id_skill_books: (...args) => {
			return client.request("get_players_id_skill_books", ...args);
		},
		post_players_id_skill_books_skillBookId_upgrade: (...args) => {
			return client.request("post_players_id_skill_books_skillBookId_upgrade", ...args);
		},
		get_players_id_skill_books_skillBookId_wudao_options: (...args) => client.request("get_players_id_skill_books_skillBookId_wudao_options", ...args),
		post_players_id_skill_books_skillBookId_wudao: (...args) => client.request("post_players_id_skill_books_skillBookId_wudao", ...args),
		post_players_id_skill_books_skillBookId_decompose: (...args) => {
			return client.request("post_players_id_skill_books_skillBookId_decompose", ...args);
		},
		get_players_id_soul_artifacts: (...args) => {
			return client.request("get_players_id_soul_artifacts", ...args);
		},
		post_players_id_soul_artifacts_artifactId_equip: (...args) => {
			return client.request("post_players_id_soul_artifacts_artifactId_equip", ...args);
		},
		post_players_id_soul_artifacts_unequip: (...args) => {
			return client.request("post_players_id_soul_artifacts_unequip", ...args);
		},
		get_players_id_soul_artifacts_unequip_preview: (...args) => {
			return client.request("get_players_id_soul_artifacts_unequip_preview", ...args);
		},
		post_players_id_soul_artifacts_upgrade: (...args) => {
			return client.request("post_players_id_soul_artifacts_upgrade", ...args);
		},
		post_players_id_soul_artifacts_artifactId_grade_upgrade: (...args) => {
			return client.request("post_players_id_soul_artifacts_artifactId_grade_upgrade", ...args);
		},
		post_players_id_skill_books_skillBookId_learn: (...args) => {
			return client.request("post_players_id_skill_books_skillBookId_learn", ...args);
		},
		post_players_id_skill_books_skillBookId_switch: (...args) => {
			return client.request("post_players_id_skill_books_skillBookId_switch", ...args);
		},
		post_players_id_skill_books_unequip: (...args) => {
			return client.request("post_players_id_skill_books_unequip", ...args);
		}
	};
}

//#endregion
export { createEquipmentApi, equipmentOperationDefinitions };