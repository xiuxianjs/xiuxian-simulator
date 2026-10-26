export interface BattleTemplateQuerySummary {
  slot: number;
  name: string;
  equipmentCount: number;
  equipmentNames: string[];
  skillNames: Record<string, string>;
  missingEquipmentCount: number;
  missingSkillCount: number;
}
export interface BattleTemplatesQueryData {
  templates: BattleTemplateQuerySummary[];
  current: BattleTemplateQuerySummary;
}

export function isBattleTemplateSummary(value: unknown): value is BattleTemplateQuerySummary {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const row = value as Record<string, unknown>;
  const count = (v: unknown) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;

  return (
    count(row.slot) &&
    typeof row.name === 'string' &&
    count(row.equipmentCount) &&
    count(row.missingEquipmentCount) &&
    count(row.missingSkillCount) &&
    Array.isArray(row.equipmentNames) &&
    row.equipmentNames.every(name => typeof name === 'string') &&
    !!row.skillNames &&
    typeof row.skillNames === 'object' &&
    !Array.isArray(row.skillNames) &&
    Object.values(row.skillNames).every(name => typeof name === 'string')
  );
}
