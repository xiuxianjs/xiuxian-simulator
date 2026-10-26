import type { BattleTemplateQuerySummary } from './battle-templates-query';

export interface BattleTemplateApplyResult extends BattleTemplateQuerySummary {
  cacheInvalidated: boolean;
}
