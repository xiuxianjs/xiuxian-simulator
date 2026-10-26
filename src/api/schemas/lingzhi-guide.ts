/** 服务端持有的灵药师引导会话。 */
export type LingzhiGuideStep = 1 | 2 | 3 | 4;

export interface LingzhiGuideSession {
  step: LingzhiGuideStep;
  createTime: number;
  expireTime: number;
  version: number;
}

/** 服务端引导状态；完成时 session 为空且 completed 为 true。 */
export interface LingzhiGuideState {
  session?: LingzhiGuideSession;
  completed: boolean;
  activation?: { message?: string };
}
