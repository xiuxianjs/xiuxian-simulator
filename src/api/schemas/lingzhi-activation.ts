/** 服务端承接的灵药师首次启用事务结果。 */
export interface LingzhiActivationData {
  completed: boolean;
  /** 已有未删除灵田的历史完成保护；不会补发奖励或重建状态。 */
  alreadyCompleted: boolean;
  professionCreated: boolean;
  plotsInitialized: boolean;
  starterSeedGranted: boolean;
  hoeGranted: boolean;
}
