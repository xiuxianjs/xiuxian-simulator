/** Result of the explicit persistent 天师宝录 unlock reconciliation. */
export interface TianshiBaoluUnlockSyncResult {
  /** Newly inserted unlock rows; this is the Node syncUserTianshiBaoluUnlocks return meaning. */
  newUnlockCount: number;
  /** Existing soft-deleted unlock rows restored because their source is valid again. */
  restoredUnlockCount: number;
  /** Active unlock rows soft-deleted because their source is no longer valid. */
  deactivatedUnlockCount: number;
  /** SQL is committed but battle-attribute cache invalidation needs retrying. */
  cacheInvalidationPending: boolean;
}
