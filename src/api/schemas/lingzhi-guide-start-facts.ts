/** 服务端读取的灵药师引导启动资格与历史完成凭证。 */
export interface LingzhiGuideStartFacts {
  realmName: string | null;
  canUseProfessionAndCave: boolean;
  hasLingzhiProfession: boolean;
  hasCavePlot: boolean;
  /** 任意未删除洞府地块沿用原 Node 的历史完成判定。 */
  historicallyCompleted: boolean;
}
