/** 洞府阵法命令返回的已持久化阵法事实。 */
export interface CaveFormationActionFormation {
  formationKey: string;
  formationCategory: 'concealment' | 'stasis' | 'yield' | 'guard';
  formationName: string;
  formationEffect: string;
  expiresAt: string;
}

/** `POST /cave/formations/activate` 的专用成功契约。 */
export interface CaveFormationActivateResult {
  outcome: 'created' | 'refreshed' | 'replaced';
  formation: CaveFormationActionFormation;
  replaced: boolean;
  replacedFormationName?: string | null;
  /** 本次实际持久化的阵法名称。 */
  name: string;
  durationHours: number;
}

/** `DELETE /cave/formations/{category}` 的专用成功契约。 */
export interface CaveFormationRemoveResult {
  removed: true;
  category: CaveFormationActionFormation['formationCategory'];
  outcome: 'removed';
  formation: CaveFormationActionFormation;
  replaced: false;
  /** 本次实际软删除的阵法名称。 */
  name: string;
  durationHours: number;
}
