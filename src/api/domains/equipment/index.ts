// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.
import type { APIClient, RequestArguments } from '../../core/index.js';
export type { EquipmentOperations } from './types.js';
export { equipmentOperationDefinitions } from './operations.js';

export function createEquipmentApi(client: APIClient) {
  return {
    post_players_id_soul_artifacts_unequip_command: (...args: RequestArguments<'post_players_id_soul_artifacts_unequip_command'>) => client.request('post_players_id_soul_artifacts_unequip_command', ...args),
    post_players_id_soul_artifacts_refine_command: (...args: RequestArguments<'post_players_id_soul_artifacts_refine_command'>) => client.request('post_players_id_soul_artifacts_refine_command', ...args),
    post_players_id_skill_books_skillBookId_wudao_command: (...args: RequestArguments<'post_players_id_skill_books_skillBookId_wudao_command'>) => client.request('post_players_id_skill_books_skillBookId_wudao_command', ...args),
    post_players_id_skill_books_batch_learn_current: (...args: RequestArguments<'post_players_id_skill_books_batch_learn_current'>) => client.request('post_players_id_skill_books_batch_learn_current', ...args),
    get_players_id_skill_books_batch_decompose_query: (...args: RequestArguments<'get_players_id_skill_books_batch_decompose_query'>) => client.request('get_players_id_skill_books_batch_decompose_query', ...args),
    get_players_id_equipment_batch_decompose_query: (...args: RequestArguments<'get_players_id_equipment_batch_decompose_query'>) => client.request('get_players_id_equipment_batch_decompose_query', ...args),
    post_players_id_soul_artifacts_wash: (...args: RequestArguments<'post_players_id_soul_artifacts_wash'>) => {
      return client.request('post_players_id_soul_artifacts_wash', ...args);
    },
    post_players_id_soul_artifacts_wash_confirm: (...args: RequestArguments<'post_players_id_soul_artifacts_wash_confirm'>) => {
      return client.request('post_players_id_soul_artifacts_wash_confirm', ...args);
    },
    post_players_id_soul_artifacts_wash_cancel: (...args: RequestArguments<'post_players_id_soul_artifacts_wash_cancel'>) => {
      return client.request('post_players_id_soul_artifacts_wash_cancel', ...args);
    },
    put_players_id_skill_books_learned_bookId_visibility: (...args: RequestArguments<'put_players_id_skill_books_learned_bookId_visibility'>) => client.request('put_players_id_skill_books_learned_bookId_visibility', ...args),
    get_players_id_soul_artifacts_overview: (...args: RequestArguments<'get_players_id_soul_artifacts_overview'>) => {
      return client.request('get_players_id_soul_artifacts_overview', ...args);
    },
    get_players_id_skill_books_learned_bookId: (...args: RequestArguments<'get_players_id_skill_books_learned_bookId'>) => {
      return client.request('get_players_id_skill_books_learned_bookId', ...args);
    },
    get_players_id_equipment_detail: (...args: RequestArguments<'get_players_id_equipment_detail'>) => {
      return client.request('get_players_id_equipment_detail', ...args);
    },
    get_players_id_equipment_equipped: (...args: RequestArguments<'get_players_id_equipment_equipped'>) => {
      return client.request('get_players_id_equipment_equipped', ...args);
    },
    get_players_id_skill_books_learned: (...args: RequestArguments<'get_players_id_skill_books_learned'>) => {
      return client.request('get_players_id_skill_books_learned', ...args);
    },
    get_players_id_equipment_bag: (...args: RequestArguments<'get_players_id_equipment_bag'>) => client.request('get_players_id_equipment_bag', ...args),
    get_players_id_skill_books_bag: (...args: RequestArguments<'get_players_id_skill_books_bag'>) => client.request('get_players_id_skill_books_bag', ...args),
    get_players_id_soul_artifacts_bag: (...args: RequestArguments<'get_players_id_soul_artifacts_bag'>) => client.request('get_players_id_soul_artifacts_bag', ...args),
    get_players_id_equipment: (...args: RequestArguments<'get_players_id_equipment'>) => {
      return client.request('get_players_id_equipment', ...args);
    },
    post_players_id_equipment_equip: (...args: RequestArguments<'post_players_id_equipment_equip'>) => {
      return client.request('post_players_id_equipment_equip', ...args);
    },
    post_players_id_equipment_unequip: (...args: RequestArguments<'post_players_id_equipment_unequip'>) => {
      return client.request('post_players_id_equipment_unequip', ...args);
    },
    post_players_id_equipment_lock: (...args: RequestArguments<'post_players_id_equipment_lock'>) => {
      return client.request('post_players_id_equipment_lock', ...args);
    },
    post_players_id_equipment_unlock: (...args: RequestArguments<'post_players_id_equipment_unlock'>) => {
      return client.request('post_players_id_equipment_unlock', ...args);
    },
    post_players_id_equipment_decompose: (...args: RequestArguments<'post_players_id_equipment_decompose'>) => {
      return client.request('post_players_id_equipment_decompose', ...args);
    },
    get_players_id_equipment_decompose_preview: (...args: RequestArguments<'get_players_id_equipment_decompose_preview'>) => {
      return client.request('get_players_id_equipment_decompose_preview', ...args);
    },
    post_players_id_equipment_decompose_batch: (...args: RequestArguments<'post_players_id_equipment_decompose_batch'>) => {
      return client.request('post_players_id_equipment_decompose_batch', ...args);
    },
    get_players_id_titles: (...args: RequestArguments<'get_players_id_titles'>) => {
      return client.request('get_players_id_titles', ...args);
    },
    get_players_id_titles_overview: (...args: RequestArguments<'get_players_id_titles_overview'>) => {
      return client.request('get_players_id_titles_overview', ...args);
    },
    post_players_id_titles_titleId_activate: (...args: RequestArguments<'post_players_id_titles_titleId_activate'>) => {
      return client.request('post_players_id_titles_titleId_activate', ...args);
    },
    post_players_id_titles_deactivate: (...args: RequestArguments<'post_players_id_titles_deactivate'>) => {
      return client.request('post_players_id_titles_deactivate', ...args);
    },
    get_players_id_skill_books: (...args: RequestArguments<'get_players_id_skill_books'>) => {
      return client.request('get_players_id_skill_books', ...args);
    },
    post_players_id_skill_books_skillBookId_upgrade: (...args: RequestArguments<'post_players_id_skill_books_skillBookId_upgrade'>) => {
      return client.request('post_players_id_skill_books_skillBookId_upgrade', ...args);
    },
    get_players_id_skill_books_skillBookId_wudao_options: (...args: RequestArguments<'get_players_id_skill_books_skillBookId_wudao_options'>) => client.request('get_players_id_skill_books_skillBookId_wudao_options', ...args),
    post_players_id_skill_books_skillBookId_wudao: (...args: RequestArguments<'post_players_id_skill_books_skillBookId_wudao'>) => client.request('post_players_id_skill_books_skillBookId_wudao', ...args),
    post_players_id_skill_books_skillBookId_decompose: (...args: RequestArguments<'post_players_id_skill_books_skillBookId_decompose'>) => {
      return client.request('post_players_id_skill_books_skillBookId_decompose', ...args);
    },
    get_players_id_soul_artifacts: (...args: RequestArguments<'get_players_id_soul_artifacts'>) => {
      return client.request('get_players_id_soul_artifacts', ...args);
    },
    post_players_id_soul_artifacts_artifactId_equip: (...args: RequestArguments<'post_players_id_soul_artifacts_artifactId_equip'>) => {
      return client.request('post_players_id_soul_artifacts_artifactId_equip', ...args);
    },
    post_players_id_soul_artifacts_unequip: (...args: RequestArguments<'post_players_id_soul_artifacts_unequip'>) => {
      return client.request('post_players_id_soul_artifacts_unequip', ...args);
    },
    get_players_id_soul_artifacts_unequip_preview: (...args: RequestArguments<'get_players_id_soul_artifacts_unequip_preview'>) => {
      return client.request('get_players_id_soul_artifacts_unequip_preview', ...args);
    },
    post_players_id_soul_artifacts_upgrade: (...args: RequestArguments<'post_players_id_soul_artifacts_upgrade'>) => {
      return client.request('post_players_id_soul_artifacts_upgrade', ...args);
    },
    post_players_id_soul_artifacts_artifactId_grade_upgrade: (...args: RequestArguments<'post_players_id_soul_artifacts_artifactId_grade_upgrade'>) => {
      return client.request('post_players_id_soul_artifacts_artifactId_grade_upgrade', ...args);
    },
    post_players_id_skill_books_skillBookId_learn: (...args: RequestArguments<'post_players_id_skill_books_skillBookId_learn'>) => {
      return client.request('post_players_id_skill_books_skillBookId_learn', ...args);
    },
    post_players_id_skill_books_skillBookId_switch: (...args: RequestArguments<'post_players_id_skill_books_skillBookId_switch'>) => {
      return client.request('post_players_id_skill_books_skillBookId_switch', ...args);
    },
    post_players_id_skill_books_unequip: (...args: RequestArguments<'post_players_id_skill_books_unequip'>) => {
      return client.request('post_players_id_skill_books_unequip', ...args);
    }
  };
}
