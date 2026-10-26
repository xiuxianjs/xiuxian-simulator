import type { BattleTemplateQuerySummary } from './battle-templates-query';
export interface BattleTemplateSaveResult extends BattleTemplateQuerySummary {
  created: boolean;
}
