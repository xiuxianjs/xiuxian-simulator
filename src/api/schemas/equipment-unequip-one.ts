export interface EquipmentUnequipOneResult {
  recoveryChanges?: string[];
  outcome: 'type_missing' | 'templates_missing' | 'not_equipped' | 'unequipped' | 'failed';
  stage: 'none' | 'write_uncertain' | 'updated' | 'cache_cleared';
  instanceId: number | null;
}
