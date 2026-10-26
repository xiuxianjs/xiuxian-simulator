export type StorageLockAsset = 'item' | 'equipment' | 'professionTool' | 'soulArtifact' | 'skillBook';
export type StorageLockCategory = 'material' | 'prop' | 'equipments' | 'professionTools' | 'skillBooks';
export type StorageLockSelector =
  | { kind: 'instance'; asset: StorageLockAsset; instanceId: number }
  | { kind: 'category'; category: StorageLockCategory; subtype?: string; typeName?: string }
  | { kind: 'name'; name: string };
export type StorageLockRequest = { locked: boolean; selector: StorageLockSelector };
export type StorageLockView = { success: boolean; count: number; message: string };
export type StorageLockInstanceResult = {
  outcome: 'changed' | 'already_set' | 'equipped' | 'listed' | 'learned' | 'not_found' | 'not_changed';
  count: number;
  name: string | null;
  group: boolean;
};
export type StorageLockCategoryResult = {
  outcome: 'changed' | 'type_not_found' | 'no_configuration' | 'no_inventory' | 'not_changed';
  count: number;
};
export type StorageLockNameResult = {
  completion: 'completed' | 'aborted';
  changedCount: number;
  changes: { asset: Exclude<StorageLockAsset, 'soulArtifact'>; templateId: number; count: number; name: string | null }[];
  issues: {
    stage: 'itemsQuery' | 'itemTemplate' | 'equipmentQuery' | 'equipmentUpdate' | 'toolQuery' | 'toolUpdate' | 'skillBookQuery' | 'skillBookUpdate';
    templateId?: number;
    disposition: 'continued' | 'aborted';
    code: 'database_error' | 'template_missing';
    effect: 'unknown' | 'no_change';
  }[];
};
export type StorageLockResult =
  | { kind: 'instance'; instance: StorageLockInstanceResult; view: StorageLockView }
  | { kind: 'category'; category: StorageLockCategoryResult; view: StorageLockView }
  | { kind: 'name'; name: StorageLockNameResult; view: StorageLockView };
