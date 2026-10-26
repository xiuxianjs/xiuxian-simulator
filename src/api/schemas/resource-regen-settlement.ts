export interface ResourceRegenResourceSettlement {
  before: number;
  after: number;
  cap: number;
  gained: number;
  anchorAt?: string | null;
  nextTickRemainingMs: number;
}

/** SQL-committed natural-regeneration result for both player resources. */
export interface ResourceRegenSettlement {
  asOf: string;
  mental: ResourceRegenResourceSettlement;
  qi: ResourceRegenResourceSettlement;
  qiHpMirrorPending: boolean;
}
