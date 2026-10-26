import type { SoulWashCancelData } from '../../schemas/soul-wash-cancel';
import type { SoulArtifactWashConfirm, SoulArtifactWashPreview } from '../../schemas/soul-artifact-wash';
import type { LearnedSkillVisibilityResult } from '../../schemas/skill-visibility';
import type { SoulArtifactOverviewQuery } from '../../schemas/soul-artifact-overview-query';
import type { LearnedSkillDetailQuery } from '../../schemas/skill-detail-query';
import type { EquipmentDetailQueryData } from '../../schemas/equipment-detail-query';
import type { EquippedQueryData } from '../../schemas/equipped-query';
import type { LearnedBooksQueryPage } from '../../schemas/learned-books-query';
import type { EquipmentBagData } from '../../schemas/queries';
import type { SkillBookBagItemData } from '../../schemas/queries';
import type { SkillBookStoragePageData } from '../../schemas/queries';
import type { SoulArtifactBagData } from '../../schemas/queries';
import type { SkillBookUnequipResult } from '../../schemas/skill-book-unequip';
import type { BattleTemplatesQueryData } from '../../schemas/battle-templates-query';
import type { BattleTemplateDeleteResult } from '../../schemas/battle-template-delete';
import type { BattleTemplateSaveResult } from '../../schemas/battle-template-save';
import type { BattleTemplateApplyResult } from '../../schemas/battle-template-apply';
import type { EquipmentUnequipOneResult } from '../../schemas/equipment-unequip-one';
import type { SkillBookSwitchOption } from '../../schemas/skill-book-switch-options';
import type { SkillBookSwitchResponse } from '../../schemas/skill-book-switch';
import type { SkillBookLearnResponse } from '../../schemas/skill-book-learn';
import type { SoulArtifactEquipPreview, SoulArtifactEquipResult } from '../../schemas/soul-artifact-equip';
import type { SoulArtifactLevelUpgrade } from '../../schemas/soul-artifact-upgrade';
import type { SoulArtifactUnequipPreview } from '../../schemas/soul-artifact-unequip-preview';
// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.

export interface EquipmentOperations {
  post_players_id_soul_artifacts_unequip_command: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string; 'Idempotency-Key'?: string; 'X-Repeat-Command'?: string };
    body: { confirmed: boolean };
    response: unknown;
  };
  post_players_id_soul_artifacts_refine_command: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string; 'Idempotency-Key'?: string; 'X-Repeat-Command'?: string };
    body: { instanceId: number; confirmed: boolean };
    response: unknown;
  };
  post_players_id_skill_books_skillBookId_wudao_command: {
    path: { id: number; skillBookId: number };
    query: never;
    headers: { 'X-Request-ID'?: string; 'Idempotency-Key'?: string };
    body: { label?: string };
    response: unknown;
  };
  post_players_id_skill_books_batch_learn_current: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string; 'Idempotency-Key': string };
    body: never;
    response: unknown;
  };
  get_players_id_skill_books_batch_decompose_query: {
    path: { id: number };
    query: { gradeName?: string };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  get_players_id_equipment_batch_decompose_query: {
    path: { id: number };
    query: { gradeName?: string };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_battle_templates_slot_apply: {
    path: { id: number; slot: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: BattleTemplateApplyResult;
  };
  post_players_id_equipment_unequip_one: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: { equipmentTypeName: string };
    response: EquipmentUnequipOneResult;
  };
  post_players_id_battle_templates_slot_snapshot: {
    path: { id: number; slot: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { name?: string };
    response: BattleTemplateSaveResult;
  };
  delete_players_id_battle_templates_slot: {
    path: { id: number; slot: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: BattleTemplateDeleteResult;
  };
  get_players_id_battle_templates: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: BattleTemplatesQueryData;
  };
  post_players_id_soul_artifacts_wash_cancel: {
    path: { id: number };
    query: never;
    headers: never;
    body: never;
    response: SoulWashCancelData;
  };
  post_players_id_soul_artifacts_wash: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { times: number };
    response: SoulArtifactWashPreview;
  };
  post_players_id_soul_artifacts_wash_confirm: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: SoulArtifactWashConfirm;
  };
  put_players_id_skill_books_learned_bookId_visibility: {
    path: { id: number; bookId: number };
    query: never;
    headers: never;
    body: { isHidden: boolean };
    response: LearnedSkillVisibilityResult;
  };
  get_players_id_soul_artifacts_overview: {
    path: { id: number };
    query: { view?: 'full' | 'equipped' };
    headers: never;
    body: never;
    response: SoulArtifactOverviewQuery;
  };
  get_players_id_skill_books_learned_bookId: {
    path: { id: number; bookId: number };
    query: never;
    headers: never;
    body: never;
    response: LearnedSkillDetailQuery;
  };
  get_players_id_equipment_detail: { path: { id: number }; query: { typeName: string }; headers: never; body: never; response: EquipmentDetailQueryData };
  get_players_id_equipment_equipped: { path: { id: number }; query: never; headers: never; body: never; response: EquippedQueryData };
  get_players_id_skill_books_learned: {
    path: { id: number };
    query: { cursor?: string; visibility?: 'visible' | 'hidden'; page?: number; pageSize?: number };
    headers: never;
    body: never;
    response: LearnedBooksQueryPage;
  };
  get_players_id_skill_books_switch_options: {
    path: { id: number };
    query: { skillType: '战技' | '被动技' | '神通' };
    headers: never;
    body: never;
    response: SkillBookSwitchOption[];
  };
  get_players_id_equipment_bag: {
    path: { id: number };
    query: { view?: 'storage'; equipmentType?: string; page?: number; pageSize?: number };
    headers: never;
    body: never;
    response: EquipmentBagData;
  };
  get_players_id_skill_books_bag: {
    path: { id: number };
    query: { view?: 'storage'; skillType?: string; page?: number; pageSize?: number };
    headers: never;
    body: never;
    response: SkillBookBagItemData[] | SkillBookStoragePageData;
  };
  get_players_id_soul_artifacts_bag: { path: { id: number }; query: { page?: number }; headers: never; body: never; response: SoulArtifactBagData };
  get_players_id_equipment: {
    path: { id: number };
    query: { page?: number; pageSize?: number };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_equipment_equip: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: { identifier: string };
    response: unknown;
  };
  post_players_id_equipment_auto_equip: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_equipment_unequip: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { equipmentTypeId: number };
    response: unknown;
  };
  post_players_id_equipment_lock: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: { instanceId: number }; response: unknown };
  post_players_id_equipment_unlock: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: { instanceId: number };
    response: unknown;
  };
  post_players_id_equipment_decompose: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: { instanceId: number };
    response: unknown;
  };
  get_players_id_equipment_decompose_preview: {
    path: { id: number };
    query: { gradeId?: number };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_equipment_decompose_batch: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { gradeId?: number };
    response: unknown;
  };
  get_players_id_titles: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  get_players_id_titles_overview: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  post_players_id_titles_titleId_activate: {
    path: { id: number; titleId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_titles_deactivate: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  get_players_id_skill_books: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  post_players_id_skill_books_skillBookId_upgrade: {
    path: { id: number; skillBookId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { seed?: number };
    response: unknown;
  };
  get_players_id_skill_books_skillBookId_wudao_options: {
    path: { id: number; skillBookId: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_skill_books_skillBookId_wudao: {
    path: { id: number; skillBookId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { attribute: string; seed?: number };
    response: unknown;
  };
  post_players_id_skill_books_skillBookId_batch_upgrade: {
    path: { id: number; skillBookId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { upgradeCount: number; seed?: number };
    response: unknown;
  };
  post_players_id_skill_books_proficiency: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { identifier: string; all: boolean; points?: number; seed?: number };
    response: unknown;
  };
  post_players_id_skill_books_skillBookId_decompose: {
    path: { id: number; skillBookId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  get_players_id_skill_books_decompose_preview: {
    path: { id: number };
    query: { gradeId?: number };
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_skill_books_decompose_batch: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { gradeId?: number };
    response: unknown;
  };
  get_players_id_skill_books_batch_learn_candidates: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_skill_books_batch_learn: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { instanceIds: number[] };
    response: unknown;
  };
  get_players_id_soul_artifacts: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  get_players_id_soul_artifacts_artifactId_equip_preview: {
    path: { id: number; artifactId: number };
    query: never;
    headers: never;
    body: never;
    response: SoulArtifactEquipPreview;
  };
  post_players_id_soul_artifacts_artifactId_equip: {
    path: { id: number; artifactId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: SoulArtifactEquipResult;
  };
  post_players_id_soul_artifacts_unequip: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  get_players_id_soul_artifacts_unequip_preview: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: SoulArtifactUnequipPreview;
  };
  post_players_id_soul_artifacts_upgrade: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: { levels: number };
    response: SoulArtifactLevelUpgrade;
  };
  post_players_id_soul_artifacts_artifactId_grade_upgrade: {
    path: { id: number; artifactId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_soul_artifacts_grade_upgrade: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { artifactId?: number };
    response: unknown;
  };
  post_players_id_skill_books_skillBookId_learn: {
    path: { id: number; skillBookId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: { forceReplace?: boolean };
    response: SkillBookLearnResponse;
  };
  post_players_id_skill_books_skillBookId_switch: {
    path: { id: number; skillBookId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: { skillType?: '战技' | '被动技' | '神通'; force?: boolean };
    response: SkillBookSwitchResponse;
  };
  post_players_id_skill_books_unequip: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: { skillType: '战技' | '被动技' | '神通' };
    response: SkillBookUnequipResult;
  };
  post_players_id_skill_books_skillBookId_reroll: {
    path: { id: number; skillBookId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { sourceLabel?: string };
    response: unknown;
  };
  post_players_id_skill_books_reroll_confirm: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { skillBookId?: number };
    response: unknown;
  };
  post_players_id_skill_books_reroll_cancel: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_skill_books_skillBookId_reset: {
    path: { id: number; skillBookId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_skill_books_reset_confirm: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: { skillBookId?: number };
    response: unknown;
  };
  post_players_id_skill_books_reset_cancel: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
}
